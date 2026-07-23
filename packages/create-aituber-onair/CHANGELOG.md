# create-aituber-onair

## 0.2.3

### Patch Changes

- Updated generated starter templates to depend on
  `@aituber-onair/core@^0.26.8`.

## 0.2.2

### Patch Changes

- Generate starter templates from the matching Core React examples during
  testing and package creation, removing the manually maintained copies.
- Added PuruPuru PNGTuber, PSD Tachie, and Inochi2D starter templates.
- Updated the existing starters to match current Core example features,
  including the latest chat, voice, screen-vision, and live-comment settings.
- Added an optional, integrity-checked Aka model download for the Inochi2D
  starter without bundling the large model files in the npm package.

## 0.2.1

### Patch Changes

- Updated starter templates to depend on `@aituber-onair/core@^0.26.6`.
- Updated the Pet starter template to use `@aituber-onair/manneri@^0.4.0`.

## 0.2.0

### Minor Changes

- Added a `pet` starter template aligned with the React Pet core example.
- Added bundled Miko pet assets and setup guidance for replacing the pet with
  user-provided Codex Pet-compatible assets.
- Added Pet template documentation and CLI template selection support.

## 0.1.0

### Minor Changes

- Added a `live2d` starter template aligned with the React Live2D core
  example.
- Added Live2D setup guidance for user-provided model files and Cubism Core
  runtime files.

## 0.0.1

### Minor Changes

- Initial release of the AITuber OnAir project generator.
- Added `pngtuber` and `vrm` starter templates with bundled avatar assets.
- Added CLI options for template selection and optional dependency
  installation.
