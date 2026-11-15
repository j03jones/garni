// Garni Pro and supporting Garni: what someone has bought, the Settings card, and the admin's grant tool.
// Payments go through Stripe Payment Links on the web; the stripe-webhook edge function records them on the
// account (public.entitlements). Until the links below are filled in, the card shows no Buy buttons.
// The phone apps never show Buy buttons (Apple and Google want their own in-app purchase for unlocks);
// Pro bought on the web still counts there.
import * as cloud from './cloud.js';
import { isNative } from './native.js';

// Paste each Stripe Payment Link here when the Stripe account exists (Payment Links in the Stripe dashboard).
// In Stripe, set each link's metadata "product" (pro, supporter) or map it in STRIPE_PRODUCTS (supabase/README.md).
export const PAYMENT_LINKS = {
  pro: '',          // Garni Pro, lifetime: $29
  tip3: '',         // supporter tips
  tip5: '',
  tip10: '',
};
export const PRO_PRICE = '$29';
export const PRO_PERKS = [
  'Keep as many of your own recipes as you like (free accounts keep 25)',
  'Every starter pack, including future paid ones',
  'A supporter badge, and every Pro feature as it arrives',
];

export const hasProduct = (lib, product) => !!lib.me?.products?.includes(product);
export const hasPro = (lib) => hasProduct(lib, 'pro');
const canBuy = (key) => !!PAYMENT_LINKS[key] && !isNative();

/** A Payment Link that brings the signed-in person's account id (and email) along, so the purchase lands on it. */
export function buyUrl(key, lib) {
  const u = new URL(PAYMENT_LINKS[key]);
  if (lib.me?.id) u.searchParams.set('client_reference_id', lib.me.id);
  const email = cloud.currentUser()?.email;
  if (email) u.searchParams.set('prefilled_email', email);
  return u.href;
}

/** "Unlock with Pro" for a paid pack or feature: a Buy button when payments are open, otherwise a note. */
export function proOffer(ctx, why) {
  const { h, lib } = ctx;
  return h('div', { class: 'card stack procard' },
    h('p', null, why),
    canBuy('pro') && lib.me
      ? h('a', { class: 'btnlink primary', href: buyUrl('pro', lib), rel: 'noopener' }, `Unlock Garni Pro · ${PRO_PRICE} once`)
      : h('p', { class: 'muted small' }, isNative() ? 'Garni Pro is coming to the app soon.' : 'Garni Pro opens soon.'));
}

/** Settings: Support Garni / Unlock Pro. */
export function proCard(ctx) {
  const { h, lib } = ctx;
  if (hasPro(lib)) {
    return h('section', { class: 'card stack procard pro' },
      h('h2', null, '🌿 You have Garni Pro'),
      h('p', { class: 'muted small' }, 'Thank you for supporting Garni. Here’s what’s yours:'),
      h('ul', { class: 'perks' }, PRO_PERKS.map((p) => h('li', null, p))));
  }
  const tips = ['tip3', 'tip5', 'tip10'].filter(canBuy);
  return h('section', { class: 'card stack procard' },
    h('h2', null, 'Support Garni / Unlock Pro'),
    h('p', null, 'Garni has no ads and never sells your data. Garni Pro keeps it that way, and gives you:'),
    h('ul', { class: 'perks' }, PRO_PERKS.map((p) => h('li', null, p))),
    !lib.me && h('p', { class: 'note' }, 'Sign in first (above): Pro is saved with your account, so it works on all your devices.'),
    lib.me && canBuy('pro') && h('a', { class: 'btnlink primary', href: buyUrl('pro', lib), rel: 'noopener' }, `Unlock Garni Pro · ${PRO_PRICE} once`),
    lib.me && tips.length > 0 && h('div', { class: 'row' }, h('span', { class: 'muted small' }, 'Or leave a tip:'),
      tips.map((k) => h('a', { class: 'btnlink', href: buyUrl(k, lib), rel: 'noopener' }, `$${k.slice(3)}`))),
    lib.me && !canBuy('pro') && h('p', { class: 'muted small' }, isNative()
      ? 'Garni Pro is coming to the app soon.'
      : 'Payments open soon. Pro is a one-time purchase, not a subscription.'));
}

/** Admin tools: give or take back Pro (or a pack) by email, for testing and gifts. */
export function adminPurchases(ctx) {
  const { h, toast } = ctx;
  const email = h('input', { class: 'full', type: 'email', placeholder: 'their@email.com', 'aria-label': 'Email for Pro' });
  const product = h('input', { class: 'full', value: 'pro', 'aria-label': 'Product', list: 'garni-products' });
  const go = (fn, done) => async () => {
    if (!email.value.trim()) { email.focus(); return; }
    try { await fn(email.value.trim(), product.value.trim()); toast(done); } catch (err) { toast(err.message, 4500); }
  };
  return h('section', { class: 'card stack' },
    h('h2', null, 'Garni Pro and purchases'),
    h('p', { class: 'muted small' }, 'Give someone Pro or a pack (testing, gifts), or take it back. Stripe purchases arrive on their own once payments are on.'),
    h('label', { class: 'field' }, h('span', null, 'Email'), email),
    h('label', { class: 'field' }, h('span', null, 'Product (pro, supporter or pack:<id>)'), product),
    h('datalist', { id: 'garni-products' }, ['pro', 'supporter'].map((v) => h('option', { value: v }))),
    h('div', { class: 'row grow' },
      h('button', { type: 'button', class: 'primary', onclick: go(cloud.adminGrant, 'Granted') }, 'Grant'),
      h('button', { type: 'button', class: 'danger', onclick: go(cloud.adminRevoke, 'Taken back') }, 'Take back')));
}
