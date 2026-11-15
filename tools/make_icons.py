"""Render the app icons and the native icon / splash sources from web/icons/icon.svg.

    pip install playwright pillow && python -m playwright install chromium
    python3 tools/make_icons.py          # (or: npm run assets)

It writes the web icons, the masters in resources/, and the Android and iOS icon and splash sets.

The bouquet garni drawing lives in web/icons/icon.svg; change it there and run this again.
"""
import asyncio
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SVG = (ROOT / "web/icons/icon.svg").read_text()
ART = re.search(r"(<g transform.*</g>)", SVG, re.S).group(1)       # the drawing without its background
CREAM = "#F6EDD9"      # Concept 1 warm cream: icon background, adaptive-icon layer, splash
SURFACE = "#FBF7EE"    # soft parchment: the splash tile
import base64
OUTFIT = base64.b64encode((ROOT / "web/fonts/outfit-latin.woff2").read_bytes()).decode()   # the wordmark's font


def page(size: int, body: str, background: str = "transparent") -> str:
    return (f"<style>@font-face{{font-family:'Outfit';font-weight:500 700;src:url(data:font/woff2;base64,{OUTFIT}) format('woff2')}}"
            f"html,body{{margin:0;background:{background}}}"
            f"svg{{display:block;width:{size}px;height:{size}px}}</style>{body}")


def boxed(inner: str, scale: float = 1.0) -> str:
    """The drawing in a 512 box, optionally shrunk about the centre (Android crops the outer third)."""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
            f'<g transform="translate(256 256) scale({scale}) translate(-256 -256)">{inner}</g></svg>')


def centred(scale: float) -> str:
    """The herb bundle alone, centred in the 512 box (its own centre is about 269,245), scaled about the middle."""
    return boxed(f'<g transform="translate(-13 11)">{ART}</g>', scale)


def launcher(scale: float = 1.15) -> str:
    """Home-screen icon: the bundle on cream, no wordmark (phones print the name under the icon)."""
    inner = centred(scale).split('>', 1)[1].rsplit('</svg>', 1)[0]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="{CREAM}"/>'
            f'{inner}</svg>')


def white() -> str:
    """The drawing in solid white."""
    return re.sub(r'(fill|stroke)="#(?!fff")[0-9a-fA-F]{3,6}"', r'\1="#fff"', ART)


def grey() -> str:
    """The drawing in light greys, for iOS's tinted icon (iOS tints it; lighter parts come out brighter)."""
    def g(m):
        h = m.group(2)
        r, gg, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        v = round(110 + 145 * (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255)
        return f'{m.group(1)}="#{v:02x}{v:02x}{v:02x}"'
    return re.sub(r'(fill|stroke)="#([0-9a-fA-F]{6})"', g, ART)


def silhouette() -> str:
    """The drawing in solid white, filling the box, for Android's notification icon."""
    return boxed(f'<g transform="translate(-13 11)">{white()}</g>', 1.25)


def splash(background: str) -> str:
    inner = centred(1.05).split('>', 1)[1].rsplit('</svg>', 1)[0]
    tile = (f'<g transform="translate(1166 1166)"><rect width="400" height="400" rx="96" fill="{SURFACE}"/>'
            f'<g transform="scale(.78125)">{inner}</g></g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">'
            f'<rect width="2732" height="2732" fill="{background}"/>{tile}</svg>')


async def main() -> None:
    from playwright.async_api import async_playwright

    web, res = ROOT / "web/icons", ROOT / "resources"
    res.mkdir(exist_ok=True)
    jobs = [
        (web / "icon-192.png", 192, launcher(), "transparent"),
        (web / "icon-512.png", 512, launcher(), "transparent"),
        (web / "icon-maskable-512.png", 512, launcher(0.92), "transparent"),     # Android's circle crop keeps the middle 80%
        (web / "apple-touch-icon.png", 180, launcher(), "transparent"),
        (web / "icon-wordmark-512.png", 512, SVG, "transparent"),                # the full icon.svg, wordmark and all
        (res / "icon-only.png", 1024, launcher(), "transparent"),
        (res / "icon-foreground.png", 1024, centred(0.9), "transparent"),
        (res / "icon-background.png", 1024, boxed(f'<rect width="512" height="512" fill="{CREAM}"/>'), "transparent"),
        (res / "notification.png", 384, silhouette(), "transparent"),
        # iOS 18's dark and tinted home-screen icons: the drawing with no background (iOS adds its own)
        (res / "icon-dark.png", 1024, centred(1.1), "transparent"),
        (res / "icon-tinted.png", 1024, boxed(f'<g transform="translate(-13 11)">{grey()}</g>', 1.1), "transparent"),
        # Android 13's themed icon: a one-colour layer the phone tints to match the wallpaper
        (res / "icon-monochrome.png", 1024, boxed(f'<g transform="translate(-13 11)">{white()}</g>', 0.82), "transparent"),
        (res / "splash.png", 2732, splash(CREAM), "transparent"),
        (res / "splash-dark.png", 2732, splash("#1C1B15"), "transparent"),
    ]
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for path, size, body, background in jobs:
            pg = await browser.new_page(viewport={"width": size, "height": size})
            await pg.set_content(page(size, body, background))
            await pg.screenshot(path=str(path), omit_background=True)
            await pg.close()
            print("wrote", path.relative_to(ROOT))
        await browser.close()


def native() -> None:
    """Cut the Android and iOS icon and splash sets from the masters in resources/."""
    from PIL import Image, ImageDraw

    res = ROOT / "resources"
    icon = Image.open(res / "icon-only.png").convert("RGBA")
    fore = Image.open(res / "icon-foreground.png").convert("RGBA")
    light = Image.open(res / "splash.png").convert("RGB")
    tile = light.crop((1166, 1166, 1566, 1566))
    mask = Image.new("L", (400, 400), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 399, 399), radius=96, fill=255)
    wash = light.getpixel((10, 10))

    def splash(w: int, h: int) -> Image.Image:
        out = Image.new("RGB", (w, h), wash)
        side = round(min(w, h) * 0.3)
        out.paste(tile.resize((side, side), Image.LANCZOS), ((w - side) // 2, (h - side) // 2), mask.resize((side, side), Image.LANCZOS))
        return out

    android = ROOT / "android/app/src/main/res"
    if android.is_dir():
        # the notification icon: the drawing as a plain white silhouette (Android tints it), 24dp
        stat = Image.open(res / "notification.png").convert("RGBA")
        for name, px in [("mdpi", 24), ("hdpi", 36), ("xhdpi", 48), ("xxhdpi", 72), ("xxxhdpi", 96)]:
            d = android / f"drawable-{name}"
            d.mkdir(exist_ok=True)
            stat.resize((px, px), Image.LANCZOS).save(d / "ic_stat_garni.png")
        for name, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
            d = android / f"mipmap-{name}"
            icon.resize((px, px), Image.LANCZOS).save(d / "ic_launcher.png")
            big = px * 4
            circle = Image.new("L", (big, big), 0)
            ImageDraw.Draw(circle).ellipse((0, 0, big - 1, big - 1), fill=255)
            rnd = icon.resize((big, big), Image.LANCZOS)
            rnd.putalpha(circle)
            rnd.resize((px, px), Image.LANCZOS).save(d / "ic_launcher_round.png")
            fpx = px * 108 // 48
            fore.resize((fpx, fpx), Image.LANCZOS).save(d / "ic_launcher_foreground.png")
        (android / "values/ic_launcher_background.xml").write_text(
            f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{CREAM.upper()}</color>\n</resources>\n')
        mono = Image.open(res / "icon-monochrome.png").convert("RGBA")
        for name, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
            fpx = px * 108 // 48
            mono.resize((fpx, fpx), Image.LANCZOS).save(android / f"mipmap-{name}" / "ic_launcher_monochrome.png")
        for xml in ("ic_launcher.xml", "ic_launcher_round.xml"):
            (android / "mipmap-anydpi-v26" / xml).write_text(
                '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
                '    <background android:drawable="@color/ic_launcher_background"/>\n'
                '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
                '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>\n')
        for f in sorted(android.glob("drawable*/splash.png")):
            w, h = Image.open(f).size
            splash(w, h).save(f)
        print("wrote Android icons and splash screens")

    ios = ROOT / "ios/App/App/Assets.xcassets"
    if ios.is_dir():
        icon.convert("RGB").save(ios / "AppIcon.appiconset/AppIcon-512@2x.png")      # iOS icons must have no transparency
        Image.open(res / "icon-dark.png").save(ios / "AppIcon.appiconset/AppIcon-dark.png")
        Image.open(res / "icon-tinted.png").convert("LA").save(ios / "AppIcon.appiconset/AppIcon-tinted.png")
        import json
        (ios / "AppIcon.appiconset/Contents.json").write_text(json.dumps({"images": [
            {"filename": "AppIcon-512@2x.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"},
            {"appearances": [{"appearance": "luminosity", "value": "dark"}], "filename": "AppIcon-dark.png",
             "idiom": "universal", "platform": "ios", "size": "1024x1024"},
            {"appearances": [{"appearance": "luminosity", "value": "tinted"}], "filename": "AppIcon-tinted.png",
             "idiom": "universal", "platform": "ios", "size": "1024x1024"},
        ], "info": {"author": "xcode", "version": 1}}, indent=2) + "\n")
        for f in sorted((ios / "Splash.imageset").glob("*.png")):
            light.save(f)
        print("wrote iOS icon and splash screens")


if __name__ == "__main__":
    asyncio.run(main())
    native()
