// stripe-webhook: Stripe tells Garni about payments here, and the purchase is recorded on the buyer's account
// (public.entitlements). Deployed with JWT verification off: Stripe calls it, not a signed-in person, and the
// Stripe-Signature check below stands in for it.
//
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Secrets (Edge Functions > Secrets):
//   STRIPE_WEBHOOK_SECRET   the "whsec_..." signing secret of this endpoint in the Stripe dashboard
//   STRIPE_PRODUCTS         optional JSON adding Payment Link ids to LINKS below, e.g. {"plink_abc":"pack:weeknights"}
// The app opens a Payment Link with ?client_reference_id=<the person's account id>, which comes back here.
// Events: checkout.session.completed records the purchase; charge.refunded takes it back. Anything else is ignored.
const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SECRET = (Deno.env.get('STRIPE_WEBHOOK_SECRET') || '').trim();   // a pasted secret can carry a space or newline
// Garni's Payment Links (ids aren't secret). STRIPE_PRODUCTS can add to or override these.
const LINKS: Record<string, string> = {
  plink_1UcCxC8wzxd3IPZFhXFF4ph4: 'pro',          // test mode: Garni Pro, $29
  plink_1UcCyz8wzxd3IPZFPPadEdQc: 'supporter',    // test mode: Tip for Garni, $5
};
const PRODUCTS: Record<string, string> = (() => {
  try { return { ...LINKS, ...JSON.parse(Deno.env.get('STRIPE_PRODUCTS') || '{}') }; } catch { return LINKS; }
})();
const PRODUCT_RE = /^(pro|supporter|pack:[a-z0-9-]{1,40})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOLERANCE_S = 300;   // a signed message older than 5 minutes is refused (replays)

const text = (body: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Stripe's signature check: HMAC-SHA256 of "<timestamp>.<raw body>" with the endpoint secret. */
export async function verify(raw: string, header: string, secret: string, now = Date.now() / 1000): Promise<boolean> {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=', 2)).filter((p) => p.length === 2));
  const t = Number(parts.t);
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!secret || !t || !sigs.length || Math.abs(now - t) > TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const want = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`)));
  // compare without stopping at the first difference
  return sigs.some((s) => s.length === want.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ want.charCodeAt(i)), 0) === 0);
}

async function rest(path: string, init: RequestInit = {}) {
  return fetch(`${URL_}${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return text('Use POST.', 405);
  const raw = await req.text();
  if (!SECRET) { console.error('STRIPE_WEBHOOK_SECRET is not set'); return text('The webhook secret is not set up yet.', 500); }
  if (!(await verify(raw, req.headers.get('stripe-signature') || '', SECRET))) {
    console.error('signature mismatch: is STRIPE_WEBHOOK_SECRET the signing secret of this destination?');
    return text('Bad signature.', 400);
  }
  let event: any;
  try { event = JSON.parse(raw); } catch { return text('Bad request.', 400); }
  const o = event?.data?.object || {};

  if (event.type === 'checkout.session.completed') {
    if (o.payment_status && o.payment_status !== 'paid') return text('Not paid yet; ignored.');
    const user = String(o.client_reference_id || '');
    const product = String(o.metadata?.product || PRODUCTS[o.payment_link] || '');
    if (!UUID_RE.test(user)) return text('No Garni account on this payment; nothing recorded.');   // a tip from someone signed out
    if (!PRODUCT_RE.test(product)) return text(`Unknown product for payment link ${o.payment_link}.`, 422);
    const res = await rest('/rest/v1/entitlements?on_conflict=source,reference', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },   // Stripe may send the same event twice
      body: JSON.stringify({ user_id: user, product, source: 'stripe', reference: String(o.payment_intent || o.id), amount_cents: o.amount_total ?? null }),
    });
    if (!res.ok) { console.error('entitlement insert', res.status, await res.text()); return text('Could not record it; Stripe will retry.', 500); }
    return text('Recorded.');
  }

  if (event.type === 'charge.refunded' && o.refunded && o.payment_intent) {
    const res = await rest(`/rest/v1/entitlements?source=eq.stripe&reference=eq.${encodeURIComponent(o.payment_intent)}&revoked_at=is.null`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    });
    if (!res.ok) return text('Could not take it back; Stripe will retry.', 500);
    return text('Refund recorded.');
  }
  return text('Ignored.');
});
