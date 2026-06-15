from __future__ import annotations

import argparse
from pathlib import Path

from png_rgba import alpha_bbox, load_png_rgba

STATE_FILES = [
    "mouth_close_eyes_open.png",
    "mouth_open_eyes_open.png",
    "mouth_close_eyes_close.png",
    "mouth_open_eyes_close.png",
]


def center_of(bbox: tuple[int, int, int, int]) -> tuple[float, float]:
    x0, y0, x1, y1 = bbox
    return ((x0 + x1) / 2, (y0 + y1) / 2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate four PNGTuber avatar state PNGs.")
    parser.add_argument("--dir", type=Path, default=Path("avatar"))
    parser.add_argument("--alpha-threshold", type=int, default=16)
    parser.add_argument("--max-bbox-delta", type=float, default=3.0)
    args = parser.parse_args()

    images = {}
    errors: list[str] = []
    for filename in STATE_FILES:
        path = args.dir / filename
        if not path.exists():
            errors.append(f"missing: {path}")
            continue
        try:
            image = load_png_rgba(path)
        except Exception as exc:
            errors.append(f"{filename}: {exc}")
            continue
        bbox = alpha_bbox(image, args.alpha_threshold)
        images[filename] = (image, bbox)

    if errors:
        for error in errors:
            print(f"FAIL {error}")
        raise SystemExit(1)

    dimensions = {(image.width, image.height) for image, _bbox in images.values()}
    if len(dimensions) != 1:
        for filename, (image, _bbox) in images.items():
            print(f"FAIL {filename}: {image.width}x{image.height}")
        raise SystemExit(1)

    print(f"dimensions: {next(iter(dimensions))[0]}x{next(iter(dimensions))[1]}")

    bboxes = {filename: bbox for filename, (_image, bbox) in images.items()}
    if any(bbox is None for bbox in bboxes.values()):
        print("WARN at least one image has no alpha foreground; bbox alignment skipped")
        print("PASS file presence and dimensions")
        return

    anchor = bboxes["mouth_close_eyes_open.png"]
    assert anchor is not None
    anchor_center = center_of(anchor)
    failed = False
    for filename in STATE_FILES:
        bbox = bboxes[filename]
        assert bbox is not None
        cx, cy = center_of(bbox)
        dx = abs(cx - anchor_center[0])
        dy = abs(cy - anchor_center[1])
        edge_delta = max(abs(a - b) for a, b in zip(anchor, bbox))
        print(f"{filename}: bbox={bbox} center_delta=({dx:.1f},{dy:.1f}) edge_delta={edge_delta}")
        if edge_delta > args.max_bbox_delta:
            failed = True

    if failed:
        print("FAIL alpha bounding boxes drift more than allowed")
        raise SystemExit(1)

    print("PASS file presence, dimensions, and alpha bbox alignment")


if __name__ == "__main__":
    main()
