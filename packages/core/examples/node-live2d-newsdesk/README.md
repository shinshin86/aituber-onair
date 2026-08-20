# Node Live2D newsdesk

This example turns source material into a vertical 1080x1920 news video with a
Cubism 4 Live2D presenter. It keeps the `node-vrm-newsdesk` pipeline—Core chat
or Agent SDK script generation, Core `VoiceEngineAdapter` narration, RMS
lip-sync, deterministic blinking, Node canvas overlays, and ffmpeg—but renders
the avatar in a headless Chromium harness with PixiJS and
`pixi-live2d-display-lipsyncpatch`.

## Prerequisites

- Node.js 22 or newer
- ffmpeg and ffprobe on `PATH`
- Playwright Chromium (`npx playwright install chromium`)
- a licensed Cubism 4 `.model3.json` model and all files it references
- a local copy of `live2dcubismcore.min.js`

```bash
cd packages/core/examples/node-live2d-newsdesk
npm install
npx playwright install chromium
npm run build
```

## Live2D requirements

Download Cubism SDK for Web from the
[official Live2D download page](https://www.live2d.com/en/sdk/download/web/),
accept its license terms, and use the included
`Core/live2dcubismcore.min.js`. Do not hotlink the runtime. Neither Cubism Core
nor a model is bundled in this repository because each has its own license.

Set these two script fields to local files:

```json
{
  "avatar": "/path/to/live2d_models/model/runtime/model.model3.json",
  "cubismCore": "/path/to/CubismSdkForWeb/Core/live2dcubismcore.min.js"
}
```

Paths may be script-relative, absolute, or start with `~/`. If you prefer a
local drop inside this example, `models/` and
`vendor/live2dcubismcore.min.js` are gitignored. The sibling React example's
`public/scripts/live2dcubismcore.min.js` is also gitignored and can be used by
an explicit path.

Hiyori is a Live2D sample character. Publishing a video made with Hiyori must
follow both the
[Free Material License Agreement](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html)
and the
[Terms of Use for Live2D Cubism Sample Data](https://www.live2d.com/eula/live2d-sample-model-terms_en.html),
including the terms applicable to your user/business category and any required
copyright notice.

## Render a video

The committed samples intentionally contain placeholder paths. Copy one to
the gitignored `work/` directory, fill in your own local paths, then render:

```bash
mkdir -p work
cp samples/hello-sine.json work/my-live2d-sine.json
npm run gen -- --script work/my-live2d-sine.json \
  --output work/my-live2d-sine.mp4
```

The AivisSpeech sample uses Mao (`888753760`) through Core's
`VoiceEngineAdapter`:

```bash
npm run gen -- --script work/my-live2d-newsdesk.json \
  --output work/my-live2d-newsdesk.mp4
```

Use `--dry-run` to synthesize and inspect timing/configuration without avatar
rendering. Use `--render-only` to reuse the generated WAV and
`*.live2d-gen.config.json`. One frame can be captured with:

```bash
npm run gen -- --script work/my-live2d-sine.json \
  --output work/frame-source.mp4 --frame 45 --png work/frame45.png
```

## Script generation

Build a schema-validated news script from a file, URL, or stdin:

```bash
npm run script-gen -- tests/fixtures/CHANGELOG.md --dry-run
npm run script-gen -- tests/fixtures/CHANGELOG.md \
  --provider codex-sdk --output work/release-news.json
```

`codex-sdk` requires the consuming runtime to install and authenticate the
OpenAI Codex SDK. The `openai`, `claude`, and `gemini` providers use their
respective environment variables. Generated scripts use license-safe local
path placeholders; replace those paths before rendering.

See [docs/script-format.md](docs/script-format.md) for the strict JSON format.

## Avatar controls

- `avatarLayout` scales and places the complete transparent Chromium frame
  during Node-side compositing.
- `avatarFraming.scale`, `x`, and `y` adjust the model's Pixi transform before
  capture. Defaults are `2.5`, `0.5`, and `0.4` for a bust-up portrait shot.
- `avatarMotion.idle` selects a Live2D motion group. The first motion is pinned
  for deterministic playback. `Idle` is used automatically when present.
- `avatarWarmupSeconds` sets the uncaptured model-settle period before frame
  zero. It accepts `0` through `30` seconds and defaults to `3`, preventing pose
  part fades and idle-motion crossfades from appearing at the start of a video.
- `motion.intensity` changes the fixed-step Live2D update rate from `0` to `3`.
  At `0`, idle motion freezes while lip-sync and scheduled blinking remain.

## How rendering works

The Node process serves only three resources on an ephemeral loopback port:
the built harness, the configured Cubism Core file, and files beneath the
model3.json parent directory. Traversal and symlink escapes are rejected.

The page loads Cubism Core first, dynamically imports the Cubism 4 Live2D
renderer, and creates the model with `autoUpdate: false`. Each frame advances
the internal model by the fixed delta, then writes RMS directly to the first
available mouth parameter (`ParamMouthOpenY` and compatible fallbacks) and
writes `ParamEyeLOpen`/`ParamEyeROpen` from the seeded blink schedule. The
library's automatic eye blink is disabled. Idle restart uses the normal motion
manager with index zero pinned instead of random selection.

After the model and pinned idle motion load, the harness advances three seconds
of fixed-step model updates by default without taking screenshots. This settles
pose fades, physics, and the initial motion crossfade before the first captured
frame; it does not add frames or time to the MP4. The resolved duration and the
warm-up diagnostics are written to the config sidecar and render summary.

Chromium returns a transparent PNG. Node composites it with the background,
chapter label, and subtitle, then streams RGBA frames to ffmpeg for H.264/AAC
output. The dependency pair matches `react-live2d-app`: PixiJS `^7.4.3` and
`pixi-live2d-display-lipsyncpatch` at
`release/v0.5.0-ls-7-noMaskFix`.

## Tests

```bash
npm run fmt
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The unit suite uses a fake frame source and requires no proprietary files. The
E2E suite reads `LIVE2D_CORE_PATH` and `LIVE2D_MODEL_PATH`. Its local defaults
target the sibling React example's Core drop and a Hiyori model in the current
user's Documents directory. If either file is absent, the E2E test skips with
a clear reason instead of downloading or bundling the asset.
