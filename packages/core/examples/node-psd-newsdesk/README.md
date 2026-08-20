# Node PSD Newsdesk

[日本語](./README.ja.md)

This AITuber OnAir Core example turns source text into a chaptered Japanese
news video. It generates a reviewed JSON script with a Core chat provider,
synthesizes narration through Core's `VoiceEngineAdapter` or a local test
engine, selects either static PSDTool compositing or Anime2.5DRig WebGL motion,
and writes a vertical H.264/AAC MP4 with chapter labels and subtitles.

```text
file, stdin, or URL
  -> Core chat / Core Agent SDK
  -> script.json + analysis.json (review)
  -> Core voice / sine / macOS say
  -> auto detection -> Anime2.5DRig motion or static PSDTool fallback
  -> audio lip sync + deterministic motion/blink
  -> ffmpeg -> 1080x1920 MP4 (review)
```

The two review points are intentional: check facts and numbers before render,
then watch the complete video before publishing. This example does not post to
X, YouTube, or another service.

## Requirements

- Node.js 22 or later and npm
- `ffmpeg` and `ffprobe` on `PATH`
- Chromium installed through Playwright for `auto` detection and motion mode
- A ChatGPT sign-in for the default `codex-sdk` provider, or an API key for an
  API provider
- Optional: AivisSpeech at `http://127.0.0.1:10101` for the bundled Mao sample

The deterministic `sine` engine needs no voice service. The `say` engine is a
macOS-only smoke-test option and is not intended for published narration.

## Setup

```sh
npm install
npx playwright install chromium
npm run build
```

For the default provider, sign in once with `codex login`. The consuming app
installs `@openai/codex-sdk`; Core loads it dynamically only when the
`codex-sdk` provider is selected.

## Generate a script

```sh
npm run script-gen -- article.txt \
  --focus "pricing" \
  --output work/article.json
```

The input may be a local file, `-` for standard input, or an HTTP(S) URL. URL
input is reduced to readable article text with Readability. The default
provider is `codex-sdk`, which uses the local ChatGPT sign-in without an API
key. API-key providers are also available:

```sh
export OPENAI_API_KEY="..."
# or ANTHROPIC_API_KEY / GEMINI_API_KEY

npm run script-gen -- article.txt \
  --provider openai \
  --output work/article.json
```

Use `--dry-run` to print the normalized source and final prompts without
calling a provider:

```sh
npm run script-gen -- tests/fixtures/CHANGELOG.md \
  --focus "0.49.0" \
  --dry-run
```

The CLI writes the script and an adjacent `<name>.analysis.json`. Review both
before rendering.

## Generate a video

The no-service sample works everywhere that the native canvas package and
ffmpeg are available:

```sh
npm run gen -- \
  --script samples/hello-sine.json \
  --output work/hello-sine.mp4
```

The AivisSpeech sample uses the Mao (まお) speaker/style ID `888753760`:

```sh
npm run gen -- \
  --script samples/hello-newsdesk.json \
  --output work/hello-newsdesk.mp4
```

Motion samples reference the procedural, motion-capable PSD from the sibling
React example without copying it:

```sh
npm run gen -- \
  --script samples/hello-sine-motion.json \
  --output work/hello-sine-motion.mp4

npm run gen -- \
  --script samples/hello-newsdesk-motion.json \
  --output work/hello-newsdesk-motion.mp4
```

Additional generation modes:

```sh
# Synthesize and write timing/config files without rendering frames
npm run gen -- --script samples/hello-sine.json --output work/hello.mp4 --dry-run

# Re-render from the existing WAV and resolved config
npm run gen -- --script samples/hello-sine.json --output work/hello.mp4 --render-only

# Render one sequentially simulated frame as PNG
npm run gen -- --script samples/hello-sine.json --frame 45 --png work/frame45.png
```

Paths inside a script are relative to that script. `--output` is relative to
the current working directory. A script selects a `.psd` avatar, optional role
overrides, voice engine/options, background, avatar layout, deterministic blink
seed, and 3–12 narration lines. Each line may set subtitle text, a
pronunciation-only `reading`, a chapter label, and its following pause. See the
complete [`script.json` format](./docs/script-format.md).

## PSD modes

There are two first-class render modes. `avatarMode: "auto"` is the default:
the Anime2.5DRig rigger runs first, and a normalized `face` part selects motion
mode. Ineligible PSDs fall back to static PSDTool mode. `avatarMode: "static"`
skips Chromium and keeps the existing pure-Node Canvas 2D renderer.
`avatarMode: "motion"` requires a usable rig and stops with the rigger's exact
diagnostic when the PSD is ineligible.

## Static PSDTool mode

The Node renderer mirrors the static PSDTool path in `react-psd-app`. Every
pixel layer is decoded once with `@webtoon/psd`, then visible layers are drawn
bottom-up with Canvas 2D and inherited opacity.

| Notation | Support | Behavior |
|---|---:|---|
| Leading `!` | Supported | Forced visible even when hidden in the PSD. |
| Leading `*` | Supported | Radio item; only one visible sibling remains selected. |
| `:flipx`, `:flipy`, `:flipxy` | Parsed only | Removed from the display name; no flip is applied. |

Initial radio visibility keeps the first visible item in each sibling set.
Mouth and eye roles are auto-detected with the same hints as the React example:

| Role | Group hints | Layer hints |
|---|---|---|
| `mouthOpen` | `口`, `mouth`, `くち` | `開`, `あ`, `open` |
| `mouthClosed` | `口`, `mouth`, `くち` | `閉`, `ん`, `close`, `むっ` |
| `eyesOpen` | `目`, `eye`, `め` | `開`, `open` |
| `eyesClosed` | `目`, `eye`, `め` | `閉`, `close`, `つぶり` |

For other naming schemes, set exact pixel-layer paths:

```json
{
  "avatarRoles": {
    "mouthOpen": "Face/Mouth/Open",
    "mouthClosed": "Face/Mouth/Closed",
    "eyesOpen": "Face/Eyes/Open",
    "eyesClosed": "Face/Eyes/Closed"
  }
}
```

If detection and overrides cannot resolve every role, generation stops and
prints the layer tree. Normalized RMS at or above `0.45` shows `mouthOpen`;
lower values show `mouthClosed`.

The small deterministic breath bob and roll are video-frame transforms
controlled by `motion.intensity`, and `0` disables them.

Static-mode limitations match `react-psd-app`: PSB is unsupported; the
known-good input is an 8-bit RGB PSD with normal pixel layers; non-normal blend
modes are rendered as normal alpha; layer/vector masks, clipping masks,
adjustment/effect rendering, PSDTool faview/simple-view metadata, and visual
`:flip*` transforms are unsupported.

The bundled `assets/sample-static.psd` was generated from the Miko PNGTuber
images. Its `口`, `目`, and `!body` tree demonstrates radio roles and forced
visibility. Run `npm run generate:sample-psd` to rebuild it deterministically
from the sibling React PNGTuber example. The body is a full-canvas layer, while
the mouth and eye role layers contain only padded feature-difference regions.
Those cropped roles let the mouth and eye groups switch independently instead
of one full-canvas role covering the other.

## Anime2.5DRig motion mode

Motion mode uses headless Chromium and bundles these sibling sources read-only:

- `react-psd-app/src/vendor/anime25drig/rigger.js`
- `react-psd-app/src/lib/rig/anime25Rig.ts`
- `react-psd-app/src/lib/rig/anime25Renderer.ts`

The harness installs its seeded virtual clock before the renderer bundle loads.
It replaces `requestAnimationFrame`, `cancelAnimationFrame`,
`performance.now`, `Date.now`, and `Math.random`. For each output frame it
sets the renderer's documented audio `mouthOpen` input, advances virtual time,
flushes exactly one current rAF callback, and requires one next callback to be
queued. Idle sway, breathing, random motion, and mesh physics therefore remain
active but reproducible. `motion.intensity` is passed to the renderer, whose
motion range is `0` through `2`.

The sibling renderer exposes no direct eye-open input. Motion mode therefore
keeps its built-in blink automation instead of using the Node `eyesClosed`
schedule; blink timing is deterministic because both time and randomness are
patched from `blinkSeed`. Static mode continues to use the Node schedule
directly.

The motion samples reference
`../../react-psd-app/public/avatar/sample.psd`. That PSD is procedurally
generated by the React example and is safe to ship; this package does not copy
it.

## Verification

```sh
npm install
npx playwright install chromium
npm run fmt
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The always-on end-to-end suite renders both modes through `dist/gen.cjs`, checks
H.264/AAC streams with ffprobe, verifies 1080x1920 PNG frames, and checks motion
mouth/idle pixel differences. Two consecutive motion renders compare timings
JSON and MP4 MD5.

## Asset terms and attribution

Anime2.5DRig-compatible auto-rigging and rendering carry this attribution:

- Project: [Anime2.5DRig](https://github.com/852wa/Anime2.5DRig)
- Author: 852wa (hakoniwa)
- Copyright: Copyright (c) 2026 hakoniwa
- License: MIT License
- Upstream commit: `d48825867acd081de22b0e7b5585bb562288796d`

This example imports the vendored sibling rigger and renderer read-only and
does not copy them. The sibling `public/avatar/sample.psd` is procedurally
generated and license-clean.

The bundled Miko-derived PSD avatar is © Yuki Shindo (AITuber OnAir) and is not covered by
the repository's MIT License. It may be redistributed as an integral part of a
work or other content, but standalone redistribution and asset collections are
prohibited. See [Miko Asset Terms](./MIKO_ASSET_TERMS.md), which links to the
authoritative Japanese guidelines.

Check the terms of any third-party voice model before publishing or monetizing
a video.
