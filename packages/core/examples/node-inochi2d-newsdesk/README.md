# Node Inochi2D Newsdesk

This example turns source text into a chaptered 1080x1920 news video with an
Inochi2D presenter. It shares the Core chat, Core Agent SDK, voice, RMS
lip-sync, Node canvas overlay, and ffmpeg pipeline used by the other Node
newsdesk examples. The avatar itself is rendered by the unmodified WebAssembly
bridge from the sibling `react-inochi2d-app` example in headless Chromium.

## Requirements

- Node.js 22 or newer
- ffmpeg and ffprobe on `PATH`
- Chromium installed for Playwright
- the sibling `react-inochi2d-app/public/inochi2d` assets in this repository
- AivisSpeech on `127.0.0.1:10101` only for `hello-newsdesk.json`

```bash
npm install
npx playwright install chromium
npm run build
```

The samples reference the sibling runtime, Aka model, and Aka motion by
script-relative paths. This example does not copy or modify those files.

## Render a sample

The sine sample is deterministic and needs no external voice service:

```bash
npm run gen -- \
  --script samples/hello-sine.json \
  --output work/hello-sine.mp4
```

Render a single frame while advancing every earlier virtual frame:

```bash
npm run gen -- \
  --script samples/hello-sine.json \
  --frame 45 \
  --png work/frame45.png
```

When AivisSpeech is running, `samples/hello-newsdesk.json` uses Mao speaker
`888753760`. See [docs/script-format.md](docs/script-format.md) for every field.

## Generate a script from source text

```bash
npm run script-gen -- path/to/CHANGELOG.md --dry-run
npm run script-gen -- path/to/CHANGELOG.md --output work/script.json
```

The default `codex-sdk` provider requires `@openai/codex-sdk`. OpenAI, Claude,
and Gemini are also supported through their usual environment API keys. The
generated model, motion, and runtime paths are generic local placeholders;
replace them before rendering.

## How rendering works

The runtime bridge owns an rAF loop and reads `performance.now()`, `Date.now()`,
and `Math.random()`. Before importing any bridge code, the harness replaces
those APIs with a virtual clock and a mulberry32 RNG seeded by `blinkSeed`.
Each `renderFrame` call advances exactly `1 / 30` second, flushes the bridge rAF
queue once, and verifies that the bridge rendered one frame and queued one next
frame. Nested callbacks stay queued for the next timestamp, matching browser
rAF behavior.

Audio RMS drives the `Mouth:: Shape` vec2 parameter using the same candidate
order as the React example. Blink values prefer `setEyeBlinkValue`. The
`original_idle_calm_breath` animation loops with `motion.intensity` as its
weight. The portrait transform (`scale: 0.65`, `x: 0`, `y: 1450`) keeps the
React example's model-space offset with a tighter vertical-video zoom. Node composites the
transparent screenshot with the background, chapter label, and subtitle before
streaming RGBA frames to ffmpeg.

The generator reports measured browser-render time as `averageMsPerFrame`.
Hardware and Playwright graphics mode affect this value, so measure it on the
target machine rather than treating one recorded run as a benchmark. The
verification SwiftShader render averaged 219.2 ms/frame for 103 frames.

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

## Verification

```bash
npm run fmt
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The E2E test renders the repository's Aka asset twice, compares timing JSON,
probes H.264/AAC structure, and checks closed/open mouth frames. MP4 byte
stability can depend on the local WebGL and ffmpeg stack and is reported from
the verification machine rather than assumed.
