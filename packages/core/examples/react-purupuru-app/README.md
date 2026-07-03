# PuruPuru PNGTuber Chat

A React example app that combines `@aituber-onair/core` chat/TTS with a
PNGTuber-style avatar renderer for `.purupuru` avatar packages.

## Features

- Load a `.purupuru` package from the settings panel.
- Render the 6 face states from the package:
  - eyes open/closed
  - mouth closed/half/open
- Draw the package layers in order: back hair, face, front hair, and optional
  item layers.
- Apply subtle idle breathing and roll sway from the package settings.
- Blink at random 2-6 second intervals.
- Drive mouth states from TTS audio lip-sync while speech is playing.
- Keep the rich React example shell features: chat, TTS settings, stream comment
  panels, screen vision, broadcast layout, and background image selection.

## `.purupuru` Format

A `.purupuru` file is an uncompressed ZIP package. This example supports format
version 1 packages with:

- `manifest.json`
- `settings.json`
- 8 avatar PNG files:
  - `backHair`
  - `frontHair`
  - `eyesOpenMouthClosed`
  - `eyesOpenMouthHalf`
  - `eyesOpenMouthOpen`
  - `eyesClosedMouthClosed`
  - `eyesClosedMouthHalf`
  - `eyesClosedMouthOpen`
- optional `thumbnail.png`
- optional visible item layers referenced by `settings.json`

The browser loader accepts only ZIP_STORED packages. It rejects compressed ZIPs,
ZIP64-like oversized packages, unsafe paths, too many entries, oversized
expanded content, and CRC32 mismatches.

## Usage

```bash
cd packages/core/examples/react-purupuru-app
npm install
npm run dev
```

Open the local Vite URL, then open Settings and choose a `.purupuru` package in
the Visual section. Until a package is loaded, the app renders a built-in
placeholder avatar.

For a local manual test package, use a `.purupuru` file from a separate checkout
or your own exported avatar package. Do not commit binary avatar packages to this
repository.

## Build and Lint

```bash
npm run build
npm run lint
```

## Tunables Used by the Renderer

The Phase 1 renderer reads these values from `settings.json`:

- `avatarSize`
- `avatarX`
- `avatarY`
- `breathStrength`
- `rollStrength`
- `idleMotionEnabled`
- `bgColor` (loaded for compatibility; the app background controls the final
  presentation)

Hair spring physics, face tracking, mesh deformation, eye highlights, OBS preset
export, and emotion-driven reactions are intentionally out of scope for Phase 1.

## Attribution

The `.purupuru` package format and renderer behavior are based on
PuruPuruPNGTuber, licensed under Apache-2.0. This example ports only the
package-loading, face-state selection, idle motion, blink, and audio mouth-state
behavior needed for Phase 1.
