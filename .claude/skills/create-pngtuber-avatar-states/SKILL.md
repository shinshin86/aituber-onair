---
name: create-pngtuber-avatar-states
description: Create stable four-state PNGTuber avatar assets for lip-sync and blinking workflows. Use when Codex is asked to generate or adapt character images into mouth-close/mouth-open and eyes-open/eyes-closed PNG states, prepare 2x2 avatar sheets, split sheets into app-ready files, or validate that PNGTuber state images keep the same canvas, character placement, pose, and style.
---

# Create PNGTuber Avatar States

## Runtime Scope

This skill's image creation phase requires Codex with ImageGen or an equivalent image-generation/editing tool. In Claude Code, do not claim to generate new avatar artwork with this skill. Claude Code can still use the deterministic scripts for existing image files: split sheets, remove suitable plain backgrounds, align states, and validate outputs.

If this skill is invoked in an environment without image generation, explain that the generation phase must be run in Codex/ImageGen, then offer to process already-created sheets or state images.

## Overview

Create PNGTuber avatar states by freezing one base image and deriving only the mouth and eye regions. Do not independently generate the four final images unless the user explicitly accepts visible pose drift.

## Core Rule

Preserve the full character image across states. The only intended differences are:

- mouth closed vs mouth open
- eyes open vs eyes closed

Treat hair, head angle, face outline, hands, clothing, shoulders, accessories, canvas size, and character position as locked.

## Workflow

1. Read the target app contract. If none is provided, use the default file contract in `references/state-spec.md`.
2. Inspect all provided reference images. Identify the best base pose and style.
3. Generate or select `mouth_close_eyes_open.png` first. This is the anchor image.
4. Derive the other states from the anchor with image editing, not fresh generation:
   - `mouth_open_eyes_open.png`: change only the mouth.
   - `mouth_close_eyes_close.png`: change only the eyes.
   - `mouth_open_eyes_close.png`: change only the mouth and eyes.
5. Prefer masks or tight crop/edit instructions for the eye and mouth regions when the image tool supports them.
6. If the user wants a sheet, use the 2x2 sheet layout in `references/state-spec.md`, then split it with `scripts/split_2x2_sheet.py`.
7. Decide whether to remove the background using the Background Transparency Rule below.
8. If switching states causes jitter, align transparent states with `scripts/align_avatar_states.py`.
9. Validate final files with `scripts/check_avatar_states.py`.
10. Do a final visual QA pass using `references/qa-checklist.md`.

## File Location Rule

Keep working artifacts in the current workspace. If the image tool saves generated files outside the workspace, immediately copy the selected output into a project-local folder such as:

```text
outputs/<character-or-date>/
```

After copying, use only the workspace copy for slicing, validation, review, and final delivery. Do not perform broad searches under the user's home directory. If the generated-image default folder must be inspected, search only the known generated-image folder, then copy the needed file into the workspace.

## ImageGen Guidance

When using ImageGen, start from the anchor image and make localized edits. Prompts should explicitly say that everything except the requested eye or mouth state is unchanged. Use `references/prompts.md` for reusable prompt text.

Generate multiple candidates only when the output is likely to vary. Pick the candidate with the least pose drift, not the prettiest candidate.

Reject and regenerate if any of these change:

- head angle
- face scale or vertical position
- hair silhouette outside the edited region
- hand or clothing details
- line thickness or rendering style
- transparent canvas bounds

## Background Transparency Rule

Do not always remove backgrounds.

Remove the background only when the avatar is clearly meant to be a cutout:

- The background is white, off-white, chroma-key, or another flat/near-flat plain color.
- The background is connected to the image edges and has no meaningful scene content.
- Removing it will not erase important character details such as white hair, white shoes, pale clothing, highlights, or props.

Keep the background when it is part of the intended artwork:

- The image has a room, outdoor scene, stage, gradient scene, pattern, props, shadows, or other designed backdrop.
- The user asks to keep the background.
- Background removal would damage character details.

If uncertain, keep the background and ask before removing it. For app-ready PNGTuber assets, prefer prompting ImageGen for a plain removable background, then remove it after generation.

## Default Output

Produce these four PNG files unless the app specifies different names:

```text
mouth_close_eyes_open.png
mouth_open_eyes_open.png
mouth_close_eyes_close.png
mouth_open_eyes_close.png
```

Keep all four images the same dimensions and format. PNG with alpha is preferred.

## Validation Commands

Validate a directory of four final images:

```bash
sh skills/create-pngtuber-avatar-states/scripts/run_python.sh skills/create-pngtuber-avatar-states/scripts/check_avatar_states.py --dir path/to/avatar
```

Split a 2x2 sheet into the four default filenames:

```bash
sh skills/create-pngtuber-avatar-states/scripts/run_python.sh skills/create-pngtuber-avatar-states/scripts/split_2x2_sheet.py sheet.png --out path/to/avatar
```

Remove a connected plain background from one PNG:

```bash
sh skills/create-pngtuber-avatar-states/scripts/run_python.sh skills/create-pngtuber-avatar-states/scripts/background_to_alpha.py input.png --out output.png
```

Align transparent four-state images to the anchor state:

```bash
sh skills/create-pngtuber-avatar-states/scripts/run_python.sh skills/create-pngtuber-avatar-states/scripts/align_avatar_states.py --dir path/to/avatar_transparent --out path/to/avatar_aligned
```

On Windows Command Prompt, use the matching batch wrapper:

```bat
skills\create-pngtuber-avatar-states\scripts\run_python.bat skills\create-pngtuber-avatar-states\scripts\check_avatar_states.py --dir path\to\avatar
```

The wrappers use `uv` when it is available. If `uv` is not installed, they fall back to `python3` and then `python`.

The scripts are deterministic packaging and QA helpers. They do not draw or invent character artwork.
