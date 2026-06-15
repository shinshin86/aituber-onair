# QA Checklist

## Mechanical Checks

- All four files exist.
- All four files have identical dimensions.
- File names match the app contract.
- PNG files decode successfully.
- Alpha bounding boxes are close across states when transparency is present.
- Background corners are transparent when alpha output is requested.
- Background is kept when it is a meaningful scene or user-requested backdrop.
- If alpha bounding boxes drift, run `scripts/align_avatar_states.py` and re-check.

Run:

```bash
sh skills/create-pngtuber-avatar-states/scripts/run_python.sh skills/create-pngtuber-avatar-states/scripts/check_avatar_states.py --dir path/to/avatar
```

## Visual Checks

- Switching between mouth states does not move the head.
- Switching between eye states does not move the face.
- Hair, hand, shoulders, clothing, and accessories do not flicker.
- Mouth open shape looks usable for speech, not a different emotion.
- Closed eyes look like a blink, not a different face angle.
- Transparent edges are clean.
- White or light clothing details are not accidentally removed during background transparency.
- Scene backgrounds, props, and intended shadows are not removed unless the user asked for a cutout.

## Reject Conditions

- Any state has a different camera angle or head tilt.
- Any state changes hair shape outside a tiny local edit artifact.
- Any state changes clothing text, logos, hand shape, or accessories.
- The character appears resized or shifted.
- The generated sheet contains labels, grid text, duplicate states, or inconsistent cell framing.
