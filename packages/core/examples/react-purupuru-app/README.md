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
- Apply spring-driven hair lag and bounce to front/back hair layers.
- React to speech emotion tags from `SPEECH_START`.
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
- `hairSpring`
- `idleMotionEnabled`
- `bgColor` (loaded for compatibility; the app background controls the final
  presentation)

`hairSpring` scales the hair spring response. A value of `0` disables physics and
keeps hair rigidly attached to the head. Visible item layers in hair slots use
their `followStrength` value (0-100) to follow the spring transform.

Face tracking, mesh deformation, eye highlights, and OBS preset export are
intentionally out of scope for the current phase.

## Emotion Reactions

The core parses leading emotion tags such as `[happy]` into
`screenplay = { emotion, text }` and emits them through `SPEECH_START`. This app
stashes the reaction draft at that event, then applies it when TTS playback
actually starts so the motion is synchronized with audible speech.

| Emotion | Reaction |
| --- | --- |
| `happy` | Strong hair bounce, slight lift, small scale pop |
| `surprised` | Quick tilt impulse, bounce, scale pop |
| `sad` | Sustained head-down pose and softer idle motion |
| `angry` | Sharp shake impulse and faster idle motion |
| `relaxed` | Slower, softer idle motion and tiny settle bounce |
| `neutral` | No extra reaction |

Tune the mapping in `src/lib/purupuruReactions.ts`. Renderer sustain and impulse
handling lives in `src/lib/purupuruRenderer.ts`.

## Attribution

The `.purupuru` package format and renderer behavior are based on
PuruPuruPNGTuber, licensed under Apache-2.0. This example ports only the
package-loading, face-state selection, idle motion, blink, and audio mouth-state
behavior needed for Phase 1.
