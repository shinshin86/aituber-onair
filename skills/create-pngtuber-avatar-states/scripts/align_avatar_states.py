from __future__ import annotations

import argparse
from pathlib import Path

from png_rgba import PngImage, alpha_bbox, load_png_rgba, save_png_rgba

STATE_FILES = [
    "mouth_close_eyes_open.png",
    "mouth_open_eyes_open.png",
    "mouth_close_eyes_close.png",
    "mouth_open_eyes_close.png",
]


def center_of(bbox: tuple[int, int, int, int]) -> tuple[float, float]:
    x0, y0, x1, y1 = bbox
    return ((x0 + x1) / 2, (y0 + y1) / 2)


def shift_image(image: PngImage, dx: int, dy: int) -> PngImage:
    out = bytearray(image.width * image.height * 4)
    for y in range(image.height):
        sy = y - dy
        if sy < 0 or sy >= image.height:
            continue
        for x in range(image.width):
            sx = x - dx
            if sx < 0 or sx >= image.width:
                continue
            src = (sy * image.width + sx) * 4
            dst = (y * image.width + x) * 4
            out[dst : dst + 4] = image.rgba[src : src + 4]
    return PngImage(width=image.width, height=image.height, rgba=bytes(out))


def main() -> None:
    parser = argparse.ArgumentParser(description="Align four PNGTuber state images to the anchor alpha bbox.")
    parser.add_argument("--dir", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--anchor", default="mouth_close_eyes_open.png")
    parser.add_argument("--alpha-threshold", type=int, default=16)
    args = parser.parse_args()

    images: dict[str, PngImage] = {}
    bboxes: dict[str, tuple[int, int, int, int]] = {}
    for filename in STATE_FILES:
        image = load_png_rgba(args.dir / filename)
        bbox = alpha_bbox(image, args.alpha_threshold)
        if bbox is None:
            raise SystemExit(f"{filename}: no alpha foreground found")
        images[filename] = image
        bboxes[filename] = bbox

    anchor_bbox = bboxes[args.anchor]
    anchor_center = center_of(anchor_bbox)
    args.out.mkdir(parents=True, exist_ok=True)

    for filename in STATE_FILES:
        image = images[filename]
        if (image.width, image.height) != (images[args.anchor].width, images[args.anchor].height):
            raise SystemExit(f"{filename}: dimensions differ from anchor")
        cx, cy = center_of(bboxes[filename])
        dx = round(anchor_center[0] - cx)
        dy = round(anchor_center[1] - cy)
        aligned = shift_image(image, dx, dy)
        save_png_rgba(args.out / filename, aligned)
        print(f"wrote {args.out / filename} shift=({dx},{dy})")


if __name__ == "__main__":
    main()
