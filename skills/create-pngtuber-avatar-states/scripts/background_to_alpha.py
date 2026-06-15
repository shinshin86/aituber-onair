from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from png_rgba import PngImage, load_png_rgba, save_png_rgba


def color_distance_sq(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return sum((x - y) * (x - y) for x, y in zip(a, b))


def estimate_key(image: PngImage, sample: int) -> tuple[int, int, int]:
    pixels: list[tuple[int, int, int]] = []
    sample = max(1, min(sample, image.width, image.height))
    for y in range(sample):
        for x in range(sample):
            for px, py in (
                (x, y),
                (image.width - 1 - x, y),
                (x, image.height - 1 - y),
                (image.width - 1 - x, image.height - 1 - y),
            ):
                i = (py * image.width + px) * 4
                pixels.append(tuple(image.rgba[i : i + 3]))
    return tuple(sum(p[i] for p in pixels) // len(pixels) for i in range(3))


def remove_connected_background(
    image: PngImage,
    key: tuple[int, int, int],
    threshold: int,
    feather: int,
) -> PngImage:
    w, h = image.width, image.height
    threshold_sq = threshold * threshold
    feather_sq = (threshold + feather) * (threshold + feather)
    visited = bytearray(w * h)
    queue: deque[tuple[int, int]] = deque()

    def is_background_seed(x: int, y: int) -> bool:
        i = (y * w + x) * 4
        rgb = tuple(image.rgba[i : i + 3])
        return color_distance_sq(rgb, key) <= feather_sq

    for x in range(w):
        if is_background_seed(x, 0):
            queue.append((x, 0))
        if is_background_seed(x, h - 1):
            queue.append((x, h - 1))
    for y in range(h):
        if is_background_seed(0, y):
            queue.append((0, y))
        if is_background_seed(w - 1, y):
            queue.append((w - 1, y))

    out = bytearray(image.rgba)
    while queue:
        x, y = queue.popleft()
        pos = y * w + x
        if visited[pos]:
            continue
        visited[pos] = 1
        i = pos * 4
        rgb = tuple(out[i : i + 3])
        dist_sq = color_distance_sq(rgb, key)
        if dist_sq > feather_sq:
            continue

        if dist_sq <= threshold_sq:
            out[i + 3] = 0
        else:
            span = max(1, feather_sq - threshold_sq)
            alpha = int(255 * (dist_sq - threshold_sq) / span)
            out[i + 3] = min(out[i + 3], max(0, min(255, alpha)))

        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx]:
                queue.append((nx, ny))

    return PngImage(width=w, height=h, rgba=bytes(out))


def main() -> None:
    parser = argparse.ArgumentParser(description="Remove a connected flat/light background from PNG images.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--threshold", type=int, default=22)
    parser.add_argument("--feather", type=int, default=24)
    parser.add_argument("--sample", type=int, default=12)
    parser.add_argument("--key", help="Override key color as R,G,B.")
    args = parser.parse_args()

    image = load_png_rgba(args.input)
    if args.key:
        parts = [int(p.strip()) for p in args.key.split(",")]
        if len(parts) != 3 or any(p < 0 or p > 255 for p in parts):
            raise SystemExit("--key must be R,G,B with values from 0 to 255")
        key = tuple(parts)
    else:
        key = estimate_key(image, args.sample)

    result = remove_connected_background(image, key, args.threshold, args.feather)
    save_png_rgba(args.out, result)
    print(f"wrote {args.out} with key={key}, threshold={args.threshold}, feather={args.feather}")


if __name__ == "__main__":
    main()
