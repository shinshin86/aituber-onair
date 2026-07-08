#!/usr/bin/env python3
"""Draw a simple doodle-girl rig part set procedurally (no image gen).

Outputs Anime2.5DRig-convention part PNGs (1024x1536 canvas) drawn with
supersampled antialiasing, designed to pass the kit's validator gates by
construction.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

CANVAS = (1024, 1536)
SS = 2  # supersampling factor

SKIN = (255, 227, 200, 255)
SKIN_LINE = (196, 138, 91, 255)
HAIR = (150, 97, 61, 255)
HAIR_DARK = (110, 65, 39, 255)
HAIR_HILITE = (176, 122, 82, 255)
EYE_BROWN = (122, 74, 43, 255)
LINE = (74, 46, 29, 255)
SHIRT = (127, 178, 217, 255)
SHIRT_LINE = (77, 128, 168, 255)
MOUTH_RED = (196, 92, 84, 255)
TONGUE = (232, 140, 132, 255)

# face geometry (canvas coords)
CX = 512
HEAD_CY = 560
HEAD_RX = 220
HEAD_RY = 245
EYE_Y = 585
EYE_DX = 97
MOUTH_Y = 705


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (CANVAS[0] * SS, CANVAS[1] * SS), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def s(*values: float) -> list[float]:
    return [v * SS for v in values]


def finish(img: Image.Image, path: Path) -> None:
    img = img.resize(CANVAS, Image.LANCZOS)
    img.save(path)
    print("wrote", path.name)


def ellipse(d, cx, cy, rx, ry, fill, outline=None, width=6):
    d.ellipse(s(cx - rx, cy - ry, cx + rx, cy + ry), fill=fill,
              outline=outline, width=width * SS)


def draw_face(out: Path) -> None:
    img, d = canvas()
    # complete egg head, ears attached
    ellipse(d, CX - HEAD_RX, HEAD_CY + 10, 30, 42, SKIN, SKIN_LINE)
    ellipse(d, CX + HEAD_RX, HEAD_CY + 10, 30, 42, SKIN, SKIN_LINE)
    ellipse(d, CX, HEAD_CY, HEAD_RX, HEAD_RY, SKIN, SKIN_LINE)
    # cheeks
    ellipse(d, CX - 130, 668, 26, 14, (255, 190, 170, 140))
    ellipse(d, CX + 130, 668, 26, 14, (255, 190, 170, 140))
    finish(img, out / "face.png")


def draw_back_hair(out: Path) -> None:
    img, d = canvas()
    d.ellipse(s(CX - 275, HEAD_CY - 310, CX + 275, HEAD_CY + 200),
              fill=HAIR, outline=HAIR_DARK, width=6 * SS)
    # bob bottom: rounded rectangle down to shoulders
    d.rounded_rectangle(s(CX - 275, HEAD_CY - 40, CX + 275, HEAD_CY + 360),
                        radius=120 * SS, fill=HAIR, outline=HAIR_DARK,
                        width=6 * SS)
    # inner scallops at the bottom
    for i, bx in enumerate(range(-220, 221, 88)):
        ellipse(d, CX + bx, HEAD_CY + 350, 52, 40, HAIR)
    finish(img, out / "hairBack.png")


def draw_front_hair(out: Path) -> None:
    img, d = canvas()
    # side locks (connected to bangs at the temples)
    d.rounded_rectangle(s(CX - 268, HEAD_CY - 160, CX - 178, HEAD_CY + 300),
                        radius=45 * SS, fill=HAIR, outline=HAIR_DARK,
                        width=6 * SS)
    d.rounded_rectangle(s(CX + 178, HEAD_CY - 160, CX + 268, HEAD_CY + 300),
                        radius=45 * SS, fill=HAIR, outline=HAIR_DARK,
                        width=6 * SS)
    # bangs: overlapping scallop arcs across the forehead, ending above eyes
    top = HEAD_CY - HEAD_RY - 28
    d.pieslice(s(CX - 275, top, CX + 275, HEAD_CY + 40), 180, 360,
               fill=HAIR, outline=HAIR_DARK, width=6 * SS)
    for i, bx in enumerate(range(-190, 191, 76)):
        ry = 58 if i % 2 == 0 else 44
        ellipse(d, CX + bx, HEAD_CY - 118, 48, ry, HAIR)
    # scallop under-edge line
    for i, bx in enumerate(range(-190, 191, 76)):
        ry = 58 if i % 2 == 0 else 44
        d.arc(s(CX + bx - 48, HEAD_CY - 118 - ry, CX + bx + 48,
                HEAD_CY - 118 + ry), 20, 160, fill=HAIR_DARK, width=5 * SS)
    # highlight
    d.arc(s(CX - 150, top + 40, CX + 150, HEAD_CY - 90), 200, 340,
          fill=HAIR_HILITE, width=10 * SS)
    finish(img, out / "hairFront.png")


def draw_eyewhite(out: Path) -> None:
    img, d = canvas()
    for dx in (-EYE_DX, EYE_DX):
        ellipse(d, CX + dx, EYE_Y, 46, 36, (255, 255, 255, 255), LINE, 5)
    finish(img, out / "eyewhite.png")


def draw_irides(out: Path) -> None:
    img, d = canvas()
    for dx in (-EYE_DX, EYE_DX):
        ellipse(d, CX + dx, EYE_Y + 2, 24, 27, EYE_BROWN, LINE, 4)
        ellipse(d, CX + dx - 8, EYE_Y - 8, 8, 8, (255, 255, 255, 235))
    finish(img, out / "irides.png")


def draw_eyelash(out: Path) -> None:
    img, d = canvas()
    for dx in (-EYE_DX, EYE_DX):
        d.arc(s(CX + dx - 50, EYE_Y - 44, CX + dx + 50, EYE_Y + 28),
              200, 340, fill=LINE, width=9 * SS)
    # simple brows
    for dx in (-EYE_DX, EYE_DX):
        d.arc(s(CX + dx - 40, EYE_Y - 92, CX + dx + 40, EYE_Y - 44),
              215, 325, fill=LINE, width=7 * SS)
    finish(img, out / "eyelash.png")


def draw_eye_close(out: Path) -> None:
    img, d = canvas()
    for dx in (-EYE_DX, EYE_DX):
        d.arc(s(CX + dx - 44, EYE_Y - 26, CX + dx + 44, EYE_Y + 34),
              25, 155, fill=LINE, width=9 * SS)
    finish(img, out / "eye_close.png")


def draw_mouth_close(out: Path) -> None:
    img, d = canvas()
    d.arc(s(CX - 42, MOUTH_Y - 30, CX + 42, MOUTH_Y + 18), 20, 160,
          fill=LINE, width=8 * SS)
    finish(img, out / "mouth_close.png")


def draw_mouth_open(out: Path) -> None:
    img, d = canvas()
    ellipse(d, CX, MOUTH_Y, 38, 30, MOUTH_RED, LINE, 5)
    ellipse(d, CX, MOUTH_Y + 14, 22, 12, TONGUE)
    finish(img, out / "mouth_open.png")


def draw_topwear(out: Path) -> None:
    img, d = canvas()
    # neck skin
    d.rounded_rectangle(s(CX - 55, HEAD_CY + 190, CX + 55, HEAD_CY + 330),
                        radius=32 * SS, fill=SKIN, outline=SKIN_LINE,
                        width=5 * SS)
    # simple round-shoulder top down to the canvas bottom
    d.rounded_rectangle(s(CX - 260, HEAD_CY + 290, CX + 260, CANVAS[1] + 80),
                        radius=150 * SS, fill=SHIRT, outline=SHIRT_LINE,
                        width=6 * SS)
    # collar
    d.arc(s(CX - 90, HEAD_CY + 260, CX + 90, HEAD_CY + 380), 0, 180,
          fill=SHIRT_LINE, width=6 * SS)
    finish(img, out / "topwear.png")


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "doodle-layers")
    out.mkdir(parents=True, exist_ok=True)
    draw_face(out)
    draw_back_hair(out)
    draw_front_hair(out)
    draw_eyewhite(out)
    draw_irides(out)
    draw_eyelash(out)
    draw_eye_close(out)
    draw_mouth_close(out)
    draw_mouth_open(out)
    draw_topwear(out)
    print("done ->", out)


if __name__ == "__main__":
    main()
