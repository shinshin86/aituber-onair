# Node PuruPuru Newsdesk

[日本語](./README.ja.md)

This AITuber OnAir Core example turns source text into a chaptered Japanese
news video. It generates a reviewed JSON script with a Core chat provider,
synthesizes narration through Core's `VoiceEngineAdapter` or a local test
engine, animates a `.purupuru` avatar from the audio RMS, and writes a vertical
H.264/AAC MP4 with chapter labels and subtitles.

```text
file, stdin, or URL
  -> Core chat / Core Agent SDK
  -> script.json + analysis.json (review)
  -> Core voice / sine / macOS say
  -> RMS lip sync + blink + hair spring + canvas frames
  -> ffmpeg -> 1080x1920 MP4 (review)
```

The two review points are intentional: check facts and numbers before render,
then watch the complete video before publishing. This example does not post to
X, YouTube, or another service.

## Requirements

- Node.js 22 or later and npm
- `ffmpeg` and `ffprobe` on `PATH`
- A ChatGPT sign-in for the default `codex-sdk` provider, or an API key for an
  API provider
- Optional: AivisSpeech at `http://127.0.0.1:10101` for the bundled Mao sample

The deterministic `sine` engine needs no voice service. The `say` engine is a
macOS-only smoke-test option and is not intended for published narration.

## Setup

```sh
npm install
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
the current working directory. A script selects a `.purupuru` avatar, voice
engine/options, background, avatar layout, deterministic blink seed, and 3–12
narration lines. Each line may set subtitle text, a pronunciation-only
`reading`, a chapter label, and its following pause. See the complete
[`script.json` format](./docs/script-format.md).

## Verification

```sh
npm run fmt
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The end-to-end test renders through the bundled `dist/gen.cjs`, checks the
H.264/AAC streams with ffprobe, verifies a 1080x1920 PNG, and confirms that a
`--render-only` pass has the same MD5 as the initial deterministic sine render.

## Asset terms and attribution

The bundled Miko avatar is © Yuki Shindo (AITuber OnAir) and is not covered by
the repository's MIT License. It may be redistributed as an integral part of a
work or other content, but standalone redistribution and asset collections are
prohibited. See [Miko Asset Terms](./MIKO_ASSET_TERMS.md), which links to the
authoritative Japanese guidelines.

The `.purupuru` package format and renderer behavior were created by rotejin
in [PuruPuruPNGTuber](https://github.com/rotejin/PuruPuruPNGTuber)
(Apache-2.0). This example is an AITuber-oriented Node reimplementation of its
face-state selection, idle motion, hair physics, item layers, blinking, and
audio-driven mouth behavior. Many thanks to the original project.

Check the terms of any third-party voice model before publishing or monetizing
a video.
