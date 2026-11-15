"""The phone apps' native features (web/js/native.js), run in Node against a fake Capacitor bridge."""
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SCRIPT = r"""
const calls = [];
const listeners = {};
let dark = false;
const mqListeners = [];
globalThis.matchMedia = () => ({ get matches() { return dark; }, addEventListener: (_, f) => mqListeners.push(f) });
globalThis.location = { hash: '#/r/abc' };
const fake = (headers) => ({
  isNativePlatform: () => true,
  PluginHeaders: headers.map((name) => ({ name, methods: [] })),
  nativePromise: (p, m, o) => { calls.push([p, m, o]); return Promise.resolve(m === 'checkPermissions' ? { display: 'prompt' } : {}); },
  addListener: (p, e, f) => { listeners[`${p}.${e}`] = f; },
});
const out = {};

// on the web: nothing is called and everything reports false
const web = await import('./web/js/native.js?web');
out.webHaptic = web.haptic('light');
out.webAlert = await web.scheduleAlert('t1', 0, 'x', 'y');
out.webCanShare = web.canShare();
out.webCalls = calls.length;

// in the phone app
globalThis.Capacitor = fake(['Haptics', 'LocalNotifications', 'Share', 'StatusBar', 'App']);
const n = await import('./web/js/native.js?app');
out.native = n.isNative();
out.haptic = [n.haptic('light'), n.haptic('success')];
out.alert = await n.scheduleAlert('timer-1', Date.UTC(2026, 0, 2, 3, 4, 5), 'Time’s up', 'Your 15 min timer is done.');
await n.scheduleAlert('timer-1', Date.UTC(2026, 0, 2, 3, 5, 5), 'Time’s up', 'again');
await n.cancelAlert('timer-1');
out.shared = await n.share({ title: 'Soup', text: 'Make this' });
n.syncStatusBar(); dark = true; mqListeners.forEach((f) => f());
let back = 0;
n.handleBackButton(() => { back += 1; });
listeners['App.backButton']({ canGoBack: true });
globalThis.location.hash = '#/';
listeners['App.backButton']({ canGoBack: false });
out.back = back;
out.calls = calls;
console.log(JSON.stringify(out));
"""


@unittest.skipUnless(shutil.which("node"), "needs Node")
class NativeBridge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        res = subprocess.run(["node", "--input-type=module", "-e", SCRIPT], cwd=ROOT, capture_output=True, text=True, timeout=60)
        if res.returncode:
            raise AssertionError(res.stderr)
        cls.out = json.loads(res.stdout)
        cls.calls = [tuple(c[:2]) for c in cls.out["calls"]]

    def test_web_does_nothing(self):
        self.assertEqual((self.out["webHaptic"], self.out["webAlert"], self.out["webCanShare"], self.out["webCalls"]), (False, False, False, 0))

    def test_haptics(self):
        self.assertEqual(self.out["haptic"], [True, True])
        self.assertIn(["Haptics", "impact", {"style": "LIGHT"}], self.out["calls"])
        self.assertIn(["Haptics", "notification", {"type": "SUCCESS"}], self.out["calls"])

    def test_timer_alert_asks_once_then_schedules_and_cancels(self):
        self.assertTrue(self.out["alert"])
        self.assertEqual(self.calls.count(("LocalNotifications", "requestPermissions")), 1)
        scheduled = [c[2]["notifications"][0] for c in self.out["calls"] if c[1] == "schedule"]
        self.assertEqual(len(scheduled), 2)
        self.assertEqual(scheduled[0]["schedule"], {"at": "2026-01-02T03:04:05.000Z", "allowWhileIdle": True})
        self.assertEqual(scheduled[0]["id"], scheduled[1]["id"])            # rescheduling replaces, not duplicates
        cancel = next(c for c in self.out["calls"] if c[1] == "cancel")
        self.assertEqual(cancel[2], {"notifications": [{"id": scheduled[0]["id"]}]})

    def test_share_sheet(self):
        self.assertTrue(self.out["shared"])
        self.assertIn(["Share", "share", {"title": "Soup", "text": "Make this", "dialogTitle": "Soup"}], self.out["calls"])

    def test_status_bar_follows_light_and_dark(self):
        styles = [c[2]["style"] for c in self.out["calls"] if c[1] == "setStyle"]
        self.assertEqual(styles, ["LIGHT", "DARK"])

    def test_back_button_goes_back_then_leaves_from_home(self):
        self.assertEqual(self.out["back"], 1)
        self.assertIn(("App", "exitApp"), self.calls)


if __name__ == "__main__":
    unittest.main()
