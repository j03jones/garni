"""The Stripe webhook's signature check (supabase/functions/stripe-webhook), run in Node with Deno stubbed."""
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SCRIPT = r"""
import { createHmac } from 'node:crypto';
globalThis.Deno = { env: { get: () => '' }, serve: () => {} };
const { verify } = await import('./supabase/functions/stripe-webhook/index.ts');
const secret = 'whsec_test';
const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { client_reference_id: 'x' } } });
const now = 1800000000;
const sign = (t, raw, s = secret) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${raw}`).digest('hex')}`;
console.log(JSON.stringify({
  good: await verify(body, sign(now, body), secret, now),
  twoSigs: await verify(body, sign(now, body, 'old') + ',' + sign(now, body).split(',')[1], secret, now),
  tampered: await verify(body.replace('x', 'y'), sign(now, body), secret, now),
  wrongSecret: await verify(body, sign(now, body, 'whsec_other'), secret, now),
  stale: await verify(body, sign(now - 600, body), secret, now),
  noSecret: await verify(body, sign(now, body), '', now),
  garbage: await verify(body, 'nonsense', secret, now),
}));
"""


@unittest.skipUnless(shutil.which("node"), "needs Node")
class StripeSignature(unittest.TestCase):
    def test_signature_check(self):
        res = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", SCRIPT],
                             cwd=ROOT, capture_output=True, text=True, timeout=60)
        if res.returncode and "strip-types" in res.stderr:
            self.skipTest("this Node can't run TypeScript")
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertEqual(json.loads(res.stdout), {"good": True, "twoSigs": True, "tampered": False, "wrongSecret": False,
                                                  "stale": False, "noSecret": False, "garbage": False})


if __name__ == "__main__":
    unittest.main()
