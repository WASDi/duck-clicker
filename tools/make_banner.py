"""Compose the README banner (docs/banner.jpg) from committed game assets.

Usage: python tools/make_banner.py
Needs Pillow, fontTools and brotli (to read the woff2 font).
"""
import io
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
A = str(ROOT / "public" / "assets") + "/"
OUT = ROOT / "docs" / "banner.jpg"

_ttf = TTFont(A + "fonts/sniglet-800.woff2")
_ttf.flavor = None
FONT = io.BytesIO()
_ttf.save(FONT)
W, H = 1280, 400
S = 2  # supersample

def cover(path, w, h, focus_y=0.5):
    im = Image.open(path).convert("RGB")
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    x = (im.width - w) // 2
    y = int((im.height - h) * focus_y)
    return im.crop((x, y, x + w, y + h))

w, h = W * S, H * S
third = w // 3
pond = cover(A + "pond/bg.jpg", w, h, 0.35)
sky = cover(A + "sky/bg.jpg", w, h, 0.4)
space = cover(A + "space/bg.jpg", w, h, 0.45)

# Horizontal blend: pond -> sky -> space with soft seams.
canvas = pond.copy()
blend = 160 * S
def hmask(start):
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    for x in range(w):
        v = 0 if x < start - blend // 2 else 255 if x > start + blend // 2 else int(255 * (x - start + blend // 2) / blend)
        d.line([(x, 0), (x, h)], fill=v)
    return m
canvas = Image.composite(sky, canvas, hmask(third))
canvas = Image.composite(space, canvas, hmask(2 * third))

# Subtle vignette at the bottom/top to help text pop.
shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
sd = ImageDraw.Draw(shade)
for y in range(h):
    t = abs(y - h / 2) / (h / 2)
    sd.line([(0, y), (w, y)], fill=(10, 20, 50, int(70 * t ** 2)))
canvas = Image.alpha_composite(canvas.convert("RGBA"), shade)

def paste_sprite(path, cx, cy, size, angle=0):
    sp = Image.open(path).convert("RGBA").resize((size, size), Image.LANCZOS)
    if angle:
        sp = sp.rotate(angle, resample=Image.BICUBIC, expand=True)
    shadow = Image.new("RGBA", sp.size, (0, 0, 0, 0))
    shadow.putalpha(sp.getchannel("A").point(lambda a: a * 0.35))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8 * S))
    canvas.alpha_composite(shadow, (cx - sp.width // 2 + 6 * S, cy - sp.height // 2 + 10 * S))
    canvas.alpha_composite(sp, (cx - sp.width // 2, cy - sp.height // 2))

paste_sprite(A + "ducks/teal_sit.png", int(w * 0.13), int(h * 0.66), 230 * S, 0)
paste_sprite(A + "ducks/white_fly_1.png", int(w * 0.60), int(h * 0.80), 140 * S, 8)
paste_sprite(A + "ducks/tan_astro_1.png", int(w * 0.87), int(h * 0.62), 220 * S, -10)

# Title
draw = ImageDraw.Draw(canvas)
FONT.seek(0)
font = ImageFont.truetype(FONT, 118 * S)
FONT.seek(0)
sub = ImageFont.truetype(FONT, 34 * S)
title = "Duck Clicker"
tb = draw.textbbox((0, 0), title, font=font, stroke_width=12 * S)
tx = (w - (tb[2] - tb[0])) // 2 - tb[0]
ty = int(h * 0.36) - (tb[3] - tb[1]) // 2 - tb[1]

glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
ImageDraw.Draw(glow).text((tx + 4 * S, ty + 10 * S), title, font=font, fill=(0, 0, 0, 120), stroke_width=12 * S, stroke_fill=(0, 0, 0, 120))
canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(10 * S)))
draw.text((tx, ty), title, font=font, fill=(255, 214, 64), stroke_width=12 * S, stroke_fill=(92, 52, 14))

tag = "Pond  ·  Sky  ·  Space"
sb = draw.textbbox((0, 0), tag, font=sub, stroke_width=6 * S)
sx = (w - (sb[2] - sb[0])) // 2 - sb[0]
draw.text((sx, ty + tb[3] + 18 * S), tag, font=sub, fill=(255, 255, 255), stroke_width=6 * S, stroke_fill=(20, 40, 90))

canvas.convert("RGB").resize((W, H), Image.LANCZOS).save(OUT, quality=88, optimize=True)
print("saved", OUT)
