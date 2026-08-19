# Node VRM Newsdesk

[日本語](./README.ja.md)

This AITuber OnAir Core example turns source text into a chaptered Japanese
news video. It generates a reviewed JSON script with a Core chat provider,
synthesizes narration through Core's `VoiceEngineAdapter` or a local test
engine, drives a VRM avatar in headless Chromium from audio RMS and a
deterministic blink schedule, and writes a vertical H.264/AAC MP4 with chapter
labels and subtitles.

```text
file, stdin, or URL
  -> Core chat / Core Agent SDK
  -> script.json + analysis.json (review)
  -> Core voice / sine / macOS say
  -> Playwright + headless Chromium VRM frames
  -> RMS lip sync + deterministic blink + Node canvas overlays
  -> ffmpeg -> 1080x1920 MP4 (review)
```

The two review points are intentional: check facts and numbers before render,
then watch the complete video before publishing. This example does not post to
X, YouTube, or another service.

## Requirements

- Node.js 22 or later and npm
- `ffmpeg` and `ffprobe` on `PATH`
- Playwright Chromium installed with `npx playwright install chromium`
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
the current working directory. A script selects a `.vrm` avatar, optional
`.vrma` animation, voice engine/options, background, avatar layout,
deterministic blink seed, and 3–12 narration lines. Each line may set subtitle
text, a pronunciation-only `reading`, a chapter label, and its following
pause. See the complete [`script.json` format](./docs/script-format.md).

The samples reference `miko.vrm` and `idle_loop.vrma` in the sibling
`react-vrm-app`; the 25 MB model is intentionally not copied here. Point
`avatar` and optional `avatarAnimation` at other files to use your own model.
`motion.intensity` scales VRMA playback from `0` through `3`; `0` freezes the
pose while lip-sync and blinking continue.

Portrait renders default to a bust-up camera. Optional
`avatarFraming.visibleHeightRatio` changes the zoom (smaller is tighter), and
`avatarFraming.lookAtHeightRatio` changes the vertical target (smaller moves
the model upward). The defaults are `0.39` and `0.845`. These camera controls
run before the existing `avatarLayout` scale and fractional anchors.

The renderer uses a soft ambient fill plus a directional key tuned for
three.js r182's physically based light units. Per-model overrides are
available as `avatarLighting.ambientIntensity` and
`avatarLighting.directionalIntensity`; the defaults are `1.4` and `2.35`.

## How rendering works

Node remains responsible for TTS, WAV/RMS analysis, blink timing, backgrounds,
chapter labels, subtitles, and ffmpeg. It starts an HTTP server on an ephemeral
`127.0.0.1` port and launches one headless Chromium page through Playwright.
That page loads the VRM/VRMA with three.js and `@pixiv/three-vrm`, advances the
animation by a fixed time step, applies the `aa` and `blink` expressions, and
renders a transparent 1080x1920 frame. Node captures the frame as PNG and
composites it with `@napi-rs/canvas` before streaming RGBA to ffmpeg.

The rendering stack is pinned together at three.js `0.182.0`,
`@pixiv/three-vrm` `3.4.5`, and `@pixiv/three-vrm-animation` `3.4.5` so its
lighting units and VRM runtime remain reproducible.

On portrait canvases the camera distance is driven by visible model height.
A detected horizontal overflow can add a small bounded safety pullback, but a
wide bind pose cannot force the news shot back to a full-body composition.

Chromium starts with SwiftShader flags for a predictable headless WebGL path
and retries with default GL if WebGL initialization fails. The final JSON
summary reports the selected GL mode and average browser-frame time. On the
reference render used to validate this example, the measured result was
`249.2` ms/frame (including the first-frame warm-up). Linux CI needs the
Playwright Chromium binary
and its system dependencies; `npx playwright install --with-deps chromium` is
the usual container setup when elevated package installation is available.

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

The end-to-end test renders through the bundled `dist/gen.cjs`, checks frame
count and H.264/AAC stream metadata with ffprobe, verifies changing nonblank
1080x1920 PNG frames, and confirms timing inputs remain identical for a
`--render-only` pass. SwiftShader pixels are not MD5-stable across machines.

## Asset terms and attribution

The referenced Miko VRM avatar is © Yuki Shindo (AITuber OnAir) and is not
covered by the repository's MIT License. It may be redistributed as an
integral part of a work or other content, but standalone redistribution and
asset collections are prohibited. See
[Miko Asset Terms](./MIKO_ASSET_TERMS.md), which links to the authoritative
Japanese guidelines and https://miko.aituberonair.com/ for model details.

The optional `idle_loop.vrma` is reused by `react-vrm-app` from the
[`pixiv/ChatVRM`](https://github.com/pixiv/ChatVRM) assets. Review its license
before redistributing the animation itself.

Check the terms of any third-party voice model before publishing or monetizing
a video.
