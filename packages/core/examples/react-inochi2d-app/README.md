# Inochi2D Chat

Web Speech API TTS is available with browser voice selection and rate, pitch,
volume, and language controls. Because the browser plays it directly without
exposing audio bytes, lip sync is not supported when this engine is selected.

![react-inochi2d-app image](./images/react-inochi2d-app.png)

A React example app built on `@aituber-onair/core` that renders an Inochi2D
avatar on a full-screen stage, plays synthesized speech with lip sync, and keeps
the chat / streaming settings format aligned with the other `packages/core`
React examples.

## Features

- Inochi2D WebGL stage driven by a prebuilt Inochi2D runtime bridge
- Local `.inx` / `.inp` model loading for quick testing
- Optional manifest-based model loading from `public/inochi2d/manifest.json`
- Drag, wheel zoom, double-click reset, tap/flick reactions
- TTS playback lip sync and speaking expression presets when supported by the
  runtime bridge
- Native expression presets and emotion animations with configurable emotion
  mappings and disabled, manual preview, or linked control modes
- Linked emotion expressions start when the response emotion is received,
  independently of TTS playback
- Shared settings UI for LLM, TTS, screen vision, and live-comment handling

## Runtime and assets

The Inochi2D runtime files are placed under:

```txt
packages/core/examples/react-inochi2d-app/public/inochi2d/runtime/
├── inochi2d.js
├── inochi2d_bg.wasm
├── inochi_bridge.js
├── secondary_motion.js
└── THIRD-PARTY-NOTICES.md
```

These are prebuilt browser artifacts for the Inochi2D runtime. Treat them as
build output for this example: the app loads them at runtime and they are not
meant to be hand-edited. If you regenerate the runtime, replace only the
generated browser files under `public/inochi2d/runtime/`.

The wasm runtime (`inochi2d_bg.wasm` with its wasm-bindgen glue `inochi2d.js`)
is compiled from Rust and statically links
[Inox2D](https://github.com/Inochi2D/inox2d) (BSD 2-Clause), the officially
supported Rust implementation of Inochi2D, along with other open-source Rust
crates. The required license notices are distributed with the binaries in
[`public/inochi2d/runtime/THIRD-PARTY-NOTICES.md`](./public/inochi2d/runtime/THIRD-PARTY-NOTICES.md);
keep that file next to the runtime files when redistributing them.

This example bundles the Aka Inochi2D model for first-run display. The bundled
model files are placed under:

```txt
packages/core/examples/react-inochi2d-app/public/inochi2d/models/
├── Aka.ATTRIBUTION.md
├── Aka.original-rig.inx
└── Aka.original.motion.json
```

To use another manifest model, place assets under `public/inochi2d/models/` and
add entries to `public/inochi2d/manifest.json`:

```json
{
  "version": 1,
  "runtime": {
    "bridge": "./runtime/inochi_bridge.js",
    "wasm": "./runtime/inochi2d_bg.wasm",
    "maxDevicePixelRatio": 1.25
  },
  "defaultModelId": "aka",
  "models": [
    {
      "id": "aka",
      "name": "Aka",
      "model": "./models/Aka.original-rig.inx",
      "motion": "./models/Aka.original.motion.json",
      "attribution": {
        "title": "Aka",
        "author": "seagetch",
        "license": "Creative Commons Attribution 4.0 International",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        "sourceUrl": "https://github.com/Inochi2D/example-models",
        "changes": "Rig and idle motion adapted for the AITuber OnAir Inochi2D example."
      }
    }
  ]
}
```

Every model (manifest models and local `.inx` / `.inp` files) opens with the
same bust-up framing, similar to the VRM example. The default lives in
`src/lib/inochi2dConstants.ts` (`INOCHI2D_DEFAULT_CAMERA_*`). Because the
camera offset is expressed in model space, a model with a very different unit
scale may need its own framing — add an optional `camera` entry to its
manifest model definition to override the default:

```json
"camera": { "x": 0, "y": 1450, "scale": 0.32 }
```

`scale` is the zoom level and `x` / `y` shift the model in model space
(positive `y` moves the model down on screen). Drag to pan, use the mouse
wheel to zoom, and double-click to reset to the model's initial framing.

For quick local testing, open settings and choose a local `.inx` or `.inp` file.
Local file loading does not attach a separate motion JSON; use the manifest path
when the model needs motion data.

## Bundled model attribution

The bundled Aka model is derived from the Inochi2D example model `Aka`.

- Title: Aka
- Author: seagetch
- Source: https://github.com/Inochi2D/example-models
- License: Creative Commons Attribution 4.0 International
- License URL: https://creativecommons.org/licenses/by/4.0/
- Changes: Rig and idle motion adapted for the AITuber OnAir Inochi2D example.

See `public/inochi2d/models/Aka.ATTRIBUTION.md` for the attribution notice that
is distributed with the model files.

## Setup

```bash
cd packages/core/examples/react-inochi2d-app
npm install
npm run dev
```

Open the URL printed by Vite and configure API keys / models from the settings
button.
The LLM section also lets you edit the system prompt. It is applied when the
field loses focus and is saved with the other settings.

## Build

```bash
npm run build
```

## Notes

- The runtime requires WebGL support in the browser.
- The sample keeps runtime binaries local to this example and does not change
  any published `@aituber-onair/*` package metadata.
- If you update the Inochi2D runtime implementation, replace only the generated
  browser runtime files under `public/inochi2d/runtime/`.
