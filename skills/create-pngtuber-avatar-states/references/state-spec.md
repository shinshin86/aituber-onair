# Four-State PNGTuber Avatar Spec

## Default Files

Use these names unless the target app has its own contract:

| File | Eyes | Mouth |
|---|---|---|
| `mouth_close_eyes_open.png` | open | closed |
| `mouth_open_eyes_open.png` | open | open |
| `mouth_close_eyes_close.png` | closed | closed |
| `mouth_open_eyes_close.png` | closed | open |

## Image Requirements

- Same width and height for all states.
- Same character scale, pose, angle, and canvas placement.
- Transparent PNG is preferred.
- If a cutout avatar is needed and transparency is unavailable, use a flat removable background and remove it before final delivery.
- If the image has a meaningful background or scene, keep it unless the user asks for a cutout.
- Keep all non-eye and non-mouth pixels as stable as possible.

## 2x2 Sheet Layout

Use this layout when asking an image model for a sheet or when documenting generated variants:

```text
row 0, col 0: mouth_close_eyes_open.png
row 0, col 1: mouth_open_eyes_open.png
row 1, col 0: mouth_close_eyes_close.png
row 1, col 1: mouth_open_eyes_close.png
```

Each cell must have the same dimensions. The sheet width and height must be even numbers.

## Stable Generation Strategy

Best: generate one anchor image, then perform localized edits.

1. Anchor: `mouth_close_eyes_open.png`.
2. Mouth-open state: edit the mouth only.
3. Eyes-closed state: edit the eyes only.
4. Combined state: edit the mouth and eyes only, preferably from the anchor or from the best already accepted variant.

Avoid generating the four complete states independently.
