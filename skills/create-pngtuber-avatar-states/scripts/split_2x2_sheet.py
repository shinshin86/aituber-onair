from __future__ import annotations

import argparse
from pathlib import Path

from png_rgba import crop_rgba, load_png_rgba, save_png_rgba

OUTPUTS = [
    ("mouth_close_eyes_open.png", 0, 0),
    ("mouth_open_eyes_open.png", 1, 0),
    ("mouth_close_eyes_close.png", 0, 1),
    ("mouth_open_eyes_close.png", 1, 1),
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Split a 2x2 PNGTuber state sheet into four PNG files.")
    parser.add_argument("sheet", type=Path)
    parser.add_argument("--out", type=Path, default=Path("avatar"))
    args = parser.parse_args()

    image = load_png_rgba(args.sheet)
    if image.width % 2 or image.height % 2:
        raise SystemExit("sheet width and height must be even numbers")

    cell_w = image.width // 2
    cell_h = image.height // 2
    for filename, col, row in OUTPUTS:
        cell = crop_rgba(image, col * cell_w, row * cell_h, cell_w, cell_h)
        out_path = args.out / filename
        save_png_rgba(out_path, cell)
        print(f"wrote {out_path} ({cell_w}x{cell_h})")


if __name__ == "__main__":
    main()
