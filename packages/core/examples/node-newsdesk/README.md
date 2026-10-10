# Node Newsdesk

Generate a vertical news video from a JSON script, or turn source text into a
script with AITuber OnAir Core. The same script can be rendered with PNGTuber,
Purupuru, Mesh, VRM, Live2D, Inochi2D, or PSD by changing `--avatar`.

[日本語](README.ja.md)

## Quick start

Requires Node.js 22 or later and `ffmpeg` on PATH.

```bash
npm install
npm run build
npm run gen -- --script samples/hello-sine.json --output work/pngtuber.mp4
npm run gen -- --script samples/hello-sine.json --avatar purupuru --output work/purupuru.mp4
npx playwright install chromium
npm run gen -- --script samples/hello-sine.json --avatar mesh --output work/mesh.mp4
npm run gen -- --script samples/hello-sine.json --avatar vrm --output work/vrm.mp4
npm run gen -- --script samples/hello-sine.json --avatar inochi2d --output work/inochi2d.mp4
npm run gen -- --script samples/hello-sine.json --avatar psd --output work/psd.mp4
```

The sample uses a deterministic sine voice and requires no API key. Output is
1080 × 1920 at 30 fps, with a narration WAV, timings JSON, and render config
beside the MP4. PNGTuber is the default. PNGTuber and Purupuru run in Node
using native Canvas2D and do not load Playwright or launch Chromium. Mesh
renders its WebGL avatar and the same Canvas2D screen in headless Chromium.
Mesh, VRM, Live2D, Inochi2D, and PSD auto/motion modes need the Chromium installation step above. Explicit PSD static mode runs in Node without Chromium. VRM uses the sibling
`react-vrm-app/public/avatar/miko.vrm` and `idle_loop.vrma` by default; keep
those files available. Live2D requires user-supplied model and Cubism Core paths
(see below). Inochi2D uses the sibling `react-inochi2d-app/public/inochi2d`
runtime and bundled Aka model/motion by default. Browser adapters render the shared screen in-page.

The shared screen includes a news panel, chapter progress, keyword pop-ups,
emotion effects, karaoke subtitles, a ticker, and opening/closing title cards.
PNGTuber provides four mouth/eye states and gentle breathing/roll. Purupuru
provides three mouth states, blinking, breathing/roll, and hair springs. These
two adapters keep their original faces; line emotions affect screen effects.
Mesh supports facial emotions and scheduled motions, using the framework-free
engine and default qipao assets from the sibling `react-mesh-avatar-app` example.
The engine and assets are used read-only; keep that sibling directory available.
VRM supports RMS lip sync, seeded blinking, VRMA animation, and supported facial
emotions. Unsupported emotions use a neutral face; named screen motion cues
do not replace the selected VRMA loop.
Live2D provides RMS lip sync, seeded blinking, and a pinned idle motion with a
settling period before capture. Line emotions and named cues affect the shared
screen while the model continues its selected idle motion. Inochi2D provides
RMS lip sync, seeded blinking, and a looping idle through its unmodified WASM
bridge. Line emotions and named cues affect the shared screen.
PSD supports PSDTool-style mouth/eye layers in Node and Anime2.5DRig motion in
Chromium. Auto mode detects a usable rig and falls back to static rendering
when none is found. Line emotions and named cues affect the shared screen.

## Avatar configuration

Avatar settings belong in a separate JSON file, passed with
`--avatar-config avatar.json`. The script never selects an avatar.

```json
{
  "model": "assets/my-avatar",
  "scale": 1,
  "x": 0.5,
  "y": 0.5,
  "intensity": 1
}
```

`model` is relative to that config file: a four-PNG directory for PNGTuber,
a `.purupuru` file for Purupuru, or a Mesh asset directory containing
`manifest.json`, a `.vrm` model file, a Live2D `.model3.json` file, an Inochi2D `.inx` model, or a `.psd` file. Omitting
it selects the default Miko assets for PNGTuber, Purupuru, Mesh, and VRM.
Live2D requires explicit model and Core paths. Inochi2D defaults to the sibling
Aka model, motion, and runtime without copying them.
PSD defaults to the bundled `assets/sample-static.psd` and `mode: "auto"`.
`scale` ranges from 0.1 to 3; `x` and `y` are normalized positions inside the
660 × 700 avatar frame; `intensity` ranges from 0 to 3. Unknown fields and
invalid values produce an error. Config validation and defaults belong to each
adapter. Mesh accepts `padTop`, `padSide`, and `talkGain` instead of `intensity`.

| Avatar | Default placement | Adapter options |
| --- | --- | --- |
| PNGTuber | `scale: 1`, `x: 0.5`, `y: 0.5` | `intensity: 1` (0–3) |
| Purupuru | `scale: 1.5`, `x: 0.5`, `y: 0.65` | `intensity: 1` (0–3) |
| VRM | `scale: 1`, `x: 0.5`, `y: 0.5` | `animation`, `intensity: 1` (0–3), `framing`, `lighting` (see below) |
| Live2D | `scale: 1`, `x: 0.5`, `y: 0.5` | `cubismCore`, `intensity: 1` (0–3), `framing`, `idleMotionGroup`, `warmupSeconds: 3` (0–30) |
| Inochi2D | `scale: 1`, `x: 0.5`, `y: 0.5` | `runtime`, `motion`, `idleAnimation`, `intensity: 1` (0–3), `framing` (see below) |
| PSD | `scale: 1`, `x: 0.5`, `y: 0.5` | `mode: "auto"`, `roles`, `intensity: 1` (0–3; motion clamps to 2), motion `framing` (see below) |
| Mesh | `scale: 1`, `x: 0.5`, `y: 0.5` | `padTop: -0.07` (-0.5–1), `padSide: -0.18` (-0.45–1), `talkGain: 0.55` (0–3) |

Purupuru uses a closer upper-body view. Mesh padding controls the source-image
crop, and `talkGain` controls voice-driven body movement. For example:

```json
{ "padTop": -0.07, "padSide": -0.18, "talkGain": 0.55 }
```

### VRM configuration

```json
{
  "model": "avatar/miko.vrm",
  "animation": "avatar/idle_loop.vrma",
  "intensity": 1,
  "framing": { "visibleHeightRatio": 0.32, "lookAtHeightRatio": 0.84 },
  "lighting": { "ambientIntensity": 1.4, "directionalIntensity": 2.35 }
}
```

`animation` is relative to the config file; omitted selects the default idle
loop, and `null` disables animation. `intensity` scales the animation/physics
clock from 0 to 3; 0 freezes the pose while mouth and blink expressions continue.
`framing.visibleHeightRatio` controls zoom (0.05–2; smaller is tighter), while
`lookAtHeightRatio` controls the camera target height (0–1.5; smaller moves the
model upward). Camera controls run before scale/placement inside the avatar
frame. Ambient and directional lighting intensities range from 0 to 10.

The default camera framing fills the shared frame with the head and upper body.
Light units, hip-translation stabilization, and fixed time steps follow the
original VRM renderer. The rendering stack stays pinned to three.js
`0.182.0`, `@pixiv/three-vrm` `3.4.5`, and `@pixiv/three-vrm-animation` `3.4.5`.

### Live2D configuration and required files

Live2D needs a licensed Cubism 4 `.model3.json` model and all referenced files,
plus your local `live2dcubismcore.min.js`. Neither Core nor a Live2D model is
bundled or downloaded by this example. Obtain Cubism SDK for Web from the
[official Live2D download page](https://www.live2d.com/en/sdk/download/web/),
accept its license terms, and use `Core/live2dcubismcore.min.js`. Do not hotlink
the runtime.

Save a separate avatar configuration, for example `work/live2d.json`:

```json
{
  "model": "/path/to/model/runtime/model.model3.json",
  "cubismCore": "/path/to/CubismSdkForWeb/Core/live2dcubismcore.min.js",
  "framing": { "scale": 2.5, "x": 0.5, "y": 0.4 },
  "idleMotionGroup": "Idle",
  "warmupSeconds": 3,
  "intensity": 1
}
```

```bash
npm run gen -- --script samples/hello-sine.json --avatar live2d \
  --avatar-config work/live2d.json --output work/live2d.mp4
```

Paths may be config-relative, absolute, or begin with `~/`. An existing Core
file in the sibling `react-live2d-app/public/scripts/` directory can be used
by an explicit path; that drop is gitignored. Keep proprietary files outside
this example and point the config at them. Missing Core or model files produce
an error before Chromium launches.

`framing` controls the model transform before shared scale/placement. Its
defaults are `scale: 2.5`, `x: 0.5`, `y: 0.4` for a bust-up view; scale accepts
0.1–5 and x/y accept 0–1. `idleMotionGroup` uses index zero for both the first
motion and each restart; omitted or `null` selects `Idle` when available.
`warmupSeconds` advances fixed model updates before frame zero without adding
captured frames. `intensity` scales the subsequent animation clock from 0–3;
0 freezes the settled pose while lip sync and seeded blinking continue.

The page loads user-supplied Core before the Cubism 4 renderer. PixiJS and the
display plugin load only when Live2D is selected. The dependency pair matches
the original Live2D example: PixiJS `^7.4.3` and
`pixi-live2d-display-lipsyncpatch` at `release/v0.5.0-ls-7-noMaskFix`.
The loopback server serves the harness, configured Core file, and files below
the model's parent directory, rejecting traversal and symlink escapes.

If you use an official Live2D sample model, publishing a video must follow both
the [Free Material License Agreement](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html)
and the [Terms of Use for Live2D Cubism Sample Data](https://www.live2d.com/eula/live2d-sample-model-terms_en.html),
including the terms for your user/business category and required copyright
notices.

### Inochi2D configuration

The default runtime, `Aka.original-rig.inx`, and `Aka.original.motion.json` are
read-only references to `react-inochi2d-app/public/inochi2d`. No model or runtime
is copied or downloaded. Keep that sibling directory available, or provide
config-relative, absolute, or `~/` paths:

```json
{
  "model": "models/avatar.inx",
  "runtime": "runtime",
  "motion": "models/avatar.motion.json",
  "idleAnimation": "original_idle_calm_breath",
  "intensity": 1,
  "framing": { "scale": 0.4, "x": 0, "y": 1800 }
}
```

`runtime` must contain `inochi_bridge.js`, `inochi2d.js`, `inochi2d_bg.wasm`,
and `secondary_motion.js`. Missing runtime/model/motion files fail before
Chromium launches. `motion: null` skips external motion loading;
`idleAnimation: null` skips starting an idle loop. `intensity` is the idle
animation weight (0–3), following the original renderer, rather than its speed.
The bridge's secondary physics continue at weight zero.

`framing` controls the bridge camera before shared scale/placement. Scale is
0.05–2; x/y are model-space pixel offsets (-10000–10000). The default
uses `scale: 0.4`, `x: 0`, `y: 1800` to fit the head, ears, and upper body in
the shared frame (the original full-page view used 0.65 / 0 / 1450).

Before importing the bridge, the renderer installs a virtual rAF queue,
`performance.now()`, `Date.now()`, and a seed-based mulberry32 `Math.random()`.
Each frame advances exactly `1 / 30` second and flushes the bridge once, with
one next callback queued. Nested rAF callbacks wait until the next frame.
Mouth control prefers the `Mouth:: Shape` vec2 parameter; blink control prefers
`setEyeBlinkValue`. Original clock APIs are restored when the renderer disposes.

### PSD static and motion modes

For the bundled static sample, save `work/psd-static.json` with:

```json
{ "mode": "static", "intensity": 1 }
```

```bash
npm run gen -- --script samples/hello-sine.json --avatar psd \
  --avatar-config work/psd-static.json --output work/psd-static.mp4
```

`mode: "static"` loads only the Node PSD parser and Canvas2D compositor.
`mode: "auto"` (the default) tries Anime2.5DRig detection in Chromium first;
an unsuitable model closes Chromium and falls back to static rendering.
`mode: "motion"` requires a usable rig and reports the detection reason otherwise.
The bundled sample has PSDTool layers and uses static rendering in auto mode.

Static mode preserves PSDTool `!` forced visibility, `*` radio groups,
bottom-to-top composition, and inherited opacity. Mouth/eye roles are detected
from Japanese or English layer names; override them with exact pixel-layer paths:

```json
{
  "mode": "static",
  "model": "avatar.psd",
  "roles": {
    "mouthOpen": "Face/Mouth/Open",
    "mouthClosed": "Face/Mouth/Closed",
    "eyesOpen": "Face/Eyes/Open",
    "eyesClosed": "Face/Eyes/Closed"
  }
}
```

Unresolved roles report the layer tree. Mouth state switches at RMS 0.45;
eyes follow the seeded blink schedule. `intensity` scales breathing and roll
from 0–3; 0 disables those movements. The sample's mouth and eye layers are
cropped feature regions, so each group can switch independently.

Static support targets 8-bit RGB PSDs with ordinary pixel layers. PSB,
clipping, masks, effects, `.faview`, and `:flip*` transforms are unsupported.
Non-normal blending uses normal alpha composition. `:flip*` names are parsed
without applying transforms; diagnostics list unsupported layer features.

For motion, the existing sibling Miko PSD can be referenced without copying it.
Save this as `work/psd-motion.json`:

```json
{
  "model": "../../react-psd-app/public/avatar/miko-anime25drig-cheer.psd",
  "mode": "auto",
  "intensity": 0.6,
  "framing": { "scale": 2, "x": 0.5, "y": 0.8 }
}
```

```bash
npm run gen -- --script samples/hello-sine.json --avatar psd \
  --avatar-config work/psd-motion.json --output work/psd-motion.mp4
```

Paths may be config-relative, absolute, or begin with `~/`. Motion imports the
existing sibling rigger and Anime2.5DRig renderer read-only. A seeded virtual
clock is installed before those modules load. Each frame sets `mouthOpen`,
advances fixed time, and flushes one rAF callback. Motion intensity is clamped
to the original renderer's 0–2 range. The renderer has no eye-open input, so
it retains its built-in blink automation with seeded time and randomness.
`roles` applies only to static rendering.

Motion `framing` transforms the source before shared scale/placement; static
mode ignores it. Defaults `scale: 2`, `x: 0.5`, `y: 0.8` give an upper-body
view of the sibling sample. Scale accepts 0.1–3 and x/y accept 0–1. Set
`scale: 1`, `x: 0.5`, `y: 0.5` to fit the whole source canvas.

## Script generation

```bash
npm run script-gen -- notes.md --output work/script.json --dry-run
npm run script-gen -- notes.md --output work/script.json
npm run gen -- --script work/script.json --avatar purupuru --output work/news.mp4
```

The default script provider is Core's `codex-sdk` agent provider, using the
local Codex sign-in. API providers `openai`, `claude`, and `gemini` use their
respective `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY`
environment variables. Script generation checks the schema and numeric claim
provenance against the source. See [script format](docs/script-format.md).

Voice engines are `sine`, macOS `say`, and `aituber-voice`. The latter passes
`voice.options` through to Core's `VoiceEngineAdapter`. Keep credentials out
of script files.

## Inspection and fonts

```bash
npm run gen -- --script samples/hello-sine.json --dry-run --output work/news.mp4
npm run gen -- --script samples/hello-sine.json --render-only --output work/news.mp4
npm run gen -- --script samples/hello-sine.json --frame 60 --png work/frame60.png
```

`--dry-run` synthesizes audio and timings without rendering. `--render-only`
reuses those artifacts; `--avatar` and `--avatar-config` select the adapter for
that run. Native adapters seek directly to a frame; browser adapters replay from frame 0
before exporting the selected frame. The shared scene receives
explicit voice history, and Purupuru physics uses a precomputed virtual clock,
so frame order does not affect the result.

Native Canvas2D uses system fonts. macOS provides Hiragino fonts. On Linux,
install Noto Sans JP (or Noto Sans CJK JP); if it is not discovered, set
`NEWSDESK_FONT_PATH=/path/to/NotoSansJP.ttf`. The same scene can also run with
a browser Canvas2D context. Chromium also needs Japanese-capable system fonts;
`NEWSDESK_FONT_PATH` applies only to native Canvas2D.

## Bundled assets

| Avatar | Asset | Terms | Attribution |
| --- | --- | --- | --- |
| PNGTuber | Bundled Miko four-state PNGs | [Miko terms](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| VRM | Sibling `react-vrm-app/public/avatar/miko.vrm` | [Miko terms](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| Mesh | Sibling `react-mesh-avatar-app/public/avatar/qipao` | [Miko terms](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| Purupuru | Bundled `miko.purupuru` | [Miko terms](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| Inochi2D | Sibling derived Aka model/motion | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Aka by seagetch (details below) |
| PSD static | Bundled Miko-derived `sample-static.psd` | [Miko terms](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| PSD motion | Sibling `react-psd-app/public/avatar/miko-anime25drig-cheer.psd` | [Miko terms](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |

The Japanese [Miko Character Usage Guidelines](https://miko.aituberonair.com/#terms)
are authoritative. Miko is the official character of AITuber OnAir. The default
VRMA loop is reused by `react-vrm-app` from
[`pixiv/ChatVRM`](https://github.com/pixiv/ChatVRM); review its license before
redistributing the animation itself. Neither sibling model nor animation is
copied into this example.

## Aka attribution

This example references the derived Aka files bundled by
`react-inochi2d-app`:

- Title: Aka
- Author: seagetch
- Source: https://github.com/Inochi2D/example-models
- License: Creative Commons Attribution 4.0 International
- License URL: https://creativecommons.org/licenses/by/4.0/

The referenced files are `Aka.original-rig.inx` and
`Aka.original.motion.json`. This bundled version was adapted for the AITuber
OnAir Inochi2D example. Changes include rig adjustments for browser rendering,
helper rig controls for avatar motion, adapted idle motion data, and motion
metadata configured through `public/inochi2d/manifest.json`. The original model
attribution and license are preserved in the sibling
`Aka.ATTRIBUTION.md` file.

## Anime2.5DRig attribution

Anime2.5DRig-compatible auto-rigging and rendering carry this attribution:

- Project: [Anime2.5DRig](https://github.com/852wa/Anime2.5DRig)
- Author: 852wa (hakoniwa)
- Copyright: Copyright (c) 2026 hakoniwa
- License: MIT License
- Upstream commit: `d48825867acd081de22b0e7b5585bb562288796d`

This example imports the vendored sibling rigger and renderer read-only and
does not copy them. The sibling Miko PSD remains subject to the asset terms
below.

The bundled Miko-derived PSD avatar is © Yuki Shindo (AITuber OnAir) and is not covered by
the repository's MIT License. It may be redistributed as an integral part of a
work or other content, but standalone redistribution and asset collections are
prohibited. See [Miko Asset Terms](./MIKO_ASSET_TERMS.md), which links to the
authoritative Japanese guidelines.

## Development

```bash
npm run fmt
npm run lint
npm run typecheck
npm run test
npm run build
```
