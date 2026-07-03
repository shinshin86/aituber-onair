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
- Add occasional idle gaze turns with subtle layer parallax.
- Reposition the loaded avatar by dragging and resize it with the mouse wheel.
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

After a package is loaded, drag the avatar on the canvas to reposition it and use
the mouse wheel to zoom. Double-click the canvas, or use the Visual section's
`アバター位置をリセット` button, to reset the placement. The app persists the
drag/zoom placement across reloads.

For a local manual test package, use a `.purupuru` file from a separate checkout
or your own exported avatar package. Do not commit binary avatar packages to this
repository.

## Build and Lint

```bash
npm run build
npm run lint
```

## Tunables Used by the Renderer

This example's renderer reads these values from `settings.json`:

- `avatarSize`
- `avatarX`
- `avatarY`
- `breathStrength`
- `rollStrength`
- `hairSpring`
- `idleMotionEnabled` (parsed for compatibility; the app-level Visual setting
  controls runtime idle motion)
- `bgColor` (loaded for compatibility; the app background controls the final
  presentation)

`hairSpring` scales the hair spring response. A value of `0` disables physics and
keeps hair rigidly attached to the head. Visible item layers in hair slots use
their `followStrength` value (0-200) to follow the spring transform.

Supported item layer slots follow the original PuruPuruPNGTuber draw order:
`stageBack`, `characterBack`, `faceBack`, `faceFront`, `frontHairFront`, and
`stageFront`. Unknown slots fall back to `frontHairFront` so future package
exports still render.

This example intentionally does not implement face tracking, mesh deformation,
eye highlights, or OBS preset export.

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

## Idle Gaze

While idle, a loaded avatar occasionally glances left or right. The motion feeds
into the same target pose used by breathing and roll, so existing pose easing and
hair spring physics make the hair swing naturally. The renderer also applies
subtle horizontal parallax: face moves the most, front hair follows, and back hair
moves the least.

Tune the scheduler in `src/lib/idleGaze.ts` and the turn/parallax ratios in
`src/lib/purupuruRenderer.ts`.

## Motion Tuning

Renderer constants in `src/lib/purupuruRenderer.ts`:

| Value | Default | Increasing it makes... |
| --- | ---: | --- |
| `GAZE_TURN_OFFSET_RATIO` | `0.014` | the head/face drift farther sideways during idle gaze |
| `GAZE_TURN_TILT` | `0.026` | the head tilt more during idle gaze |
| `FACE_PARALLAX_RATIO` | `0.034` | the face layer move farther with gaze parallax |
| `FRONT_HAIR_PARALLAX_RATIO` | `0.01` | front hair follow gaze parallax more strongly |
| `BACK_HAIR_PARALLAX_RATIO` | `0.006` | back hair follow gaze parallax more strongly |

Keep parallax ordered as `face > frontHair > backHair` so depth reads
naturally.

Idle gaze scheduler constants in `src/lib/idleGaze.ts`:

| Value | Default | Increasing it makes... |
| --- | ---: | --- |
| `MIN_WAIT_SECONDS` / `MAX_WAIT_SECONDS` | `5` / `14` | idle gaze turns less frequent |
| `MIN_HOLD_SECONDS` / `MAX_HOLD_SECONDS` | `0.6` / `1.8` | gaze holds longer before returning |
| `FULL_TURN_MIN` / `FULL_TURN_MAX` | `0.65` / `1` | full turns reach farther left/right |
| `SMALL_TURN_MAX` / `SMALL_TURN_CHANCE` | `0.3` / `0.3` | small turns become wider / more common |

Package values in `settings.json`:

| Value | Effect when increased |
| --- | --- |
| `breathStrength` | stronger vertical breathing motion |
| `rollStrength` | stronger side sway and head roll |
| `hairSpring` | more visible spring lag and bounce |
| `avatarSize` | larger rendered avatar |
| `avatarX` | moves the avatar right |
| `avatarY` | moves the avatar down |
| `idleMotionEnabled` | ignored at runtime in favor of the app-level Visual setting, because camera-tracking-authored packages often ship this as `false` |

Visible `itemLayers` use `followStrength` (`0`-`200`) to decide how strongly
they follow the hair spring transform.

## Attribution

The `.purupuru` package format and renderer behavior are based on
PuruPuruPNGTuber, licensed under Apache-2.0. This example focuses on
package-loading, face-state selection, idle motion, hair physics, emotion
reactions, item layers, drag/zoom placement, blink, and audio mouth-state
behavior.
