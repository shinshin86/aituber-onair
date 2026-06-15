# Prompt Templates

Use these as starting points and adapt to the target app and character.

## Anchor Image

```text
Create a PNGTuber avatar image of the same character as the reference.
Use the reference character's hairstyle, face shape, eye design, outfit, colors, accessories, line art, and shading style.

State: eyes open, mouth closed.
Pose: front-facing bust portrait suitable for a PNGTuber app.
Canvas: square, centered character, transparent background if supported.

Keep the expression natural and friendly.
Do not add text, logos, captions, extra props, or a complex background.
```

## Mouth Open From Anchor

```text
Edit this image to create the mouth-open speaking state.
Change only the mouth area.
Keep the eyes open.
Do not change the head angle, face outline, hair, hand, clothing, accessories, canvas size, character position, line art, colors, or background.
The result must align perfectly with the original when switched in a PNGTuber app.
```

## Eyes Closed From Anchor

```text
Edit this image to create the eyes-closed blinking state.
Change only the eye area.
Keep the mouth closed.
Do not change the head angle, face outline, hair, hand, clothing, accessories, canvas size, character position, line art, colors, or background.
The result must align perfectly with the original when switched in a PNGTuber app.
```

## Mouth Open And Eyes Closed From Anchor

```text
Edit this image to create the combined speaking-and-blinking state.
Change only the mouth area and the eye area.
The eyes should be closed and the mouth should be open.
Do not change the head angle, face outline, hair, hand, clothing, accessories, canvas size, character position, line art, colors, or background.
The result must align perfectly with the original when switched in a PNGTuber app.
```

## 2x2 Sheet

Use only when a sheet is requested:

```text
Create a 2x2 PNGTuber avatar state sheet using the same character and same pose in every cell.

Layout:
top-left: eyes open, mouth closed
top-right: eyes open, mouth open
bottom-left: eyes closed, mouth closed
bottom-right: eyes closed, mouth open

Only the eyes and mouth may differ between cells.
Keep the same canvas size, character position, head angle, hair silhouette, outfit, accessories, colors, line art, and shading across all four cells.
No text, labels, numbers, logos, or extra objects.
```
