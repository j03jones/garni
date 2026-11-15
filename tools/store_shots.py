"""Store screenshots for Google Play and the App Store, taken from the web app.

    "<venv python with Playwright>" tools/store_shots.py

Writes docs/store/screenshots/{iphone,android}/NN-name.png:
  iphone  1290 x 2796 (the 6.7" / 6.9" size App Store Connect asks for)
  android 1080 x 2340 (phone screenshots for Play)
and docs/store/feature-graphic.png (1024 x 500, Play's banner).
"""
import asyncio
import subprocess
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "store" / "screenshots"
PORT = 8791
URL = f"http://127.0.0.1:{PORT}/"
SIZES = {"iphone": (430, 932, 3), "android": (360, 780, 3)}

# A week of meals and a shopping list, so the planning screens have something on them.
SEED = """() => {
  const d = new Date(); const iso = (x) => x.toISOString().slice(0, 10);
  const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7);   // next week: no days already gone by
  const day = (n) => { const x = new Date(mon); x.setDate(mon.getDate() + n); return iso(x); };
  localStorage.setItem('sprig.plan', JSON.stringify({ at: Date.now(), days: {
    [day(0)]: [{ id: '2cfb6e434f', f: 1 }], [day(1)]: [{ id: 'cb45b13424', f: 1 }], [day(2)]: [{ note: 'Leftovers' }],
    [day(3)]: [{ id: '40c614dfba', f: 1 }], [day(4)]: [{ id: '553b2e1355', f: 1 }] } }));
}"""


async def shoot(b, kind):
    w, h, scale = SIZES[kind]
    ctx = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=scale, reduced_motion="reduce", color_scheme="light")
    page = await ctx.new_page()
    out = OUT / kind
    out.mkdir(parents=True, exist_ok=True)

    async def snap(n, name, hash_, wait, before=None):
        await page.goto(URL + hash_)
        await page.wait_for_selector(wait)
        await page.add_style_tag(content="#toast { display: none !important; }")
        if before:
            await before()
        await page.wait_for_timeout(600)
        await page.screenshot(path=str(out / f"{n:02d}-{name}.png"))

    await page.goto(URL)
    await page.evaluate(SEED)
    await snap(1, "home", "#/", ".feed .fcard")
    await snap(2, "recipe", "#/r/2cfb6e434f", ".rhead h1")

    async def cook():
        await page.click(".cookbtn")
        await page.wait_for_selector(".cook-foot")
    await snap(3, "cook-mode", "#/r/2cfb6e434f", ".cookbtn", cook)
    await page.keyboard.press("Escape")
    async def next_week():
        if not await page.locator(".planitem").count():     # the plan opens on the week that has meals in it, or this week
            await page.click("button[aria-label='Next week']")
        await page.wait_for_selector(".planitem")
    await snap(4, "meal-plan", "#/plan", ".planday", next_week)

    async def fill_list():
        await next_week()
        await page.click("button:has-text('Build grocery cart')")
        await page.wait_for_selector("dialog.sendsheet[open]")
        await page.click("dialog.sendsheet button:has-text('Done')")
    await snap(5, "shopping-list", "#/plan", ".planday", fill_list)
    await page.wait_for_selector(".shoplist")
    await page.wait_for_timeout(600)
    await page.screenshot(path=str(out / "05-shopping-list.png"))
    await snap(6, "starter-packs", "#/pack/weeknights", ".packlist li")
    await ctx.close()


FEATURE = """<!doctype html><html><head><link rel="stylesheet" href="/fonts/fonts.css"><style>
  html, body { margin: 0; width: 1024px; height: 500px; background: #F6EDD9; overflow: hidden; }
  .wrap { display: flex; align-items: center; gap: 56px; height: 100%; padding: 0 80px; box-sizing: border-box; }
  img { height: 360px; }
  h1 { font: 700 112px/1 Outfit, sans-serif; color: #2F3326; margin: 0; letter-spacing: -2px; }
  p { font: 400 36px/1.3 "DM Sans", sans-serif; color: #5A6B47; margin: 18px 0 0; }
</style></head><body><div class="wrap"><img src="/icons/mark.svg" alt=""><div><h1>Garni</h1>
<p>Recipes, meal plans<br>and one tidy shopping list</p></div></div></body></html>"""


async def feature(b):
    page = await b.new_page(viewport={"width": 1024, "height": 500})
    await page.goto(URL)        # same origin, so the fonts and the mark load
    await page.set_content(FEATURE.replace('href="/', f'href="{URL}').replace('src="/', f'src="{URL}'))
    await page.wait_for_timeout(800)
    await page.screenshot(path=str(OUT.parent / "feature-graphic.png"))
    await page.close()


async def main():
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1", "--directory", str(ROOT / "web")],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            for kind in SIZES:
                await shoot(b, kind)
            await feature(b)
            await b.close()
    finally:
        server.terminate()
    for f in sorted(OUT.parent.rglob("*.png")):
        print(f.relative_to(ROOT))


if __name__ == "__main__":
    asyncio.run(main())
