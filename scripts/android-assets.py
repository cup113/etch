"""Generate Android launcher icons and splash screens from etch's web mark.

The geometry mirrors `src/lib/assets/favicon.svg`: a 64-unit square with a
rounded corner (r=12) and three square-capped bars at y=18/32/46, stroke 6,
spanning x=16..48 (16..40 for the middle bar). Square caps extend each end by
stroke/2, so every bar is drawn as a rectangle rather than a line.

Everything is drawn at 4x and downsampled with LANCZOS: `cap add android` ships
Capacitor's own logo, and generating replacements at 1x produces visibly jagged
edges at xxxhdpi.

Run: python scripts/android-assets.py
"""

from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw

RES = pathlib.Path(__file__).resolve().parent.parent / "android/app/src/main/res"

SS = 4  # supersample factor

STONE_950 = (12, 10, 9)
STONE_900 = (28, 25, 23)
STONE_100 = (245, 245, 244)
STONE_50 = (250, 250, 249)

# Design space (64 units).
RX = 12
STROKE = 6
BARS = ((16, 48, 18), (16, 40, 32), (16, 48, 46))

GLYPH = (13.0, 15.0, 51.0, 49.0)  # bbox including square caps
GLYPH_W = GLYPH[2] - GLYPH[0]
GLYPH_H = GLYPH[3] - GLYPH[1]

# Adaptive icons: 108dp canvas, only the inner circle of ~66dp is guaranteed
# visible. The mark is sized to 62% of the 72dp safe zone so no corner of it is
# clipped by any launcher mask.
ADAPTIVE_SAFE_FRACTION = 0.62

DENSITIES = {
    "mdpi": 1.0,
    "hdpi": 1.5,
    "xhdpi": 2.0,
    "xxhdpi": 3.0,
    "xxxhdpi": 4.0,
}


def _bars(draw: ImageDraw.ImageDraw, scale: float, ox: float, oy: float, color) -> None:
    half = STROKE / 2
    for x1, x2, y in BARS:
        draw.rectangle(
            [
                ox + (x1 - half) * scale,
                oy + (y - half) * scale,
                ox + (x2 + half) * scale,
                oy + (y + half) * scale,
            ],
            fill=color,
        )


def _centered(draw: ImageDraw.ImageDraw, canvas: float, scale: float, color) -> None:
    ox = (canvas - GLYPH_W * scale) / 2 - GLYPH[0] * scale
    oy = (canvas - GLYPH_H * scale) / 2 - GLYPH[1] * scale
    _bars(draw, scale, ox, oy, color)


def _downscale(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def legacy_icon(px: int, radius_px: float) -> Image.Image:
    """Full mark on a stone-950 rounded square (pre-API 26 launchers).

    `radius_px` is in final pixels: a rounded square for the standard icon, half
    the width for the circular `ic_launcher_round`.
    """
    n = px * SS
    scale = n / 64.0
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, n - 1, n - 1], radius=radius_px * SS, fill=STONE_950)
    _bars(draw, scale, 0, 0, STONE_100)
    return _downscale(img, px)


def adaptive_foreground(px: int) -> Image.Image:
    """Bars only, transparent, centred inside the adaptive-icon safe zone."""
    n = px * SS
    unit = n / 108.0  # one dp in pixels at this density
    scale = unit * (72.0 * ADAPTIVE_SAFE_FRACTION) / GLYPH_W
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    _centered(ImageDraw.Draw(img), n, scale, STONE_100)
    return _downscale(img, px)


def splash(width: int, height: int, bg, fg) -> Image.Image:
    """Solid ground with a small centred mark: a fade from splash into the tablet."""
    img = Image.new("RGBA", (width * SS, height * SS), bg)
    unit = min(width, height) * SS
    scale = unit * 0.15 / GLYPH_H
    _centered(ImageDraw.Draw(img), unit, scale, fg)
    return img.resize((width, height), Image.LANCZOS)


def night_qualifier(dirname: str) -> str:
    """`drawable-land-hdpi` -> `drawable-land-night-hdpi`; `drawable` -> `drawable-night`.

    限定符顺序是硬约束：密度必须最后，night 在 orientation 之后。
    `drawable-night-land-hdpi` 会让 aapt 报 "Invalid resource directory name"，
    而且只有在真正构建时才会暴露。
    """
    parts = dirname.split("-")
    if len(parts) == 1:
        return f"{parts[0]}-night"
    return "-".join([parts[0], *parts[1:-1], "night", parts[-1]])


def main() -> None:
    for density, factor in DENSITIES.items():
        out = RES / f"mipmap-{density}"
        size = round(48 * factor)
        legacy_icon(size, size * RX / 64).save(out / "ic_launcher.png")
        legacy_icon(size, size / 2).save(out / "ic_launcher_round.png")
        adaptive_foreground(round(108 * factor)).save(out / "ic_launcher_foreground.png")

    # Splash: regenerate every existing bitmap at its own resolution, and give
    # each one a -night sibling so a dark-mode launch does not flash paper-white.
    for path in sorted(RES.glob("drawable*/splash.png")):
        if "-night" in path.parent.name:
            continue
        with Image.open(path) as existing:
            width, height = existing.size
        splash(width, height, STONE_100, STONE_900).save(path)
        night_dir = RES / night_qualifier(path.parent.name)
        night_dir.mkdir(parents=True, exist_ok=True)
        splash(width, height, STONE_900, STONE_50).save(night_dir / "splash.png")


if __name__ == "__main__":
    main()
