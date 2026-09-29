# Node Mesh Avatar Newsdesk

[日本語](./README.ja.md)

This AITuber OnAir Core example turns source text into a vertical 1080x1920
news program. The single-image mesh avatar from the sibling
`react-mesh-avatar-app` reads the news as the host, framed by a news panel,
keyword pop-ups, emotion effects, karaoke subtitles and a ticker.

```text
file, stdin, URL
  -> Core chat / Core Agent SDK
  -> script.json + analysis.json (review)
  -> Core voice / sine / macOS say
  -> director (a schedule of scene-appropriate motions and screen events)
  -> headless Chromium draws each frame (mesh avatar + screen effects)
  -> ffmpeg -> 1080x1920 MP4 (review)
```

Both review steps are intentional: check facts and numbers before rendering,
and watch the finished video before publishing. Nothing is posted anywhere.

## Screen

- Header with a blinking LIVE badge, program title, running clock, shimmering rule
- News panel: typed topic headline with a marker sweep, bullet points that slide
  in and light up while their line is read, a RUNDOWN of all topics and a
  progress bar
- The avatar in a framed shot with a glow and slowly turning light rays; the
  camera pushes in on strong lines
- Keyword pop-ups beside the avatar and a voice meter
- Emotion effects: sparkles (happy), a shake and "！" burst (surprised), blue
  rain (sad), a red pulse and anger mark (angry), bokeh (relaxed)
- "NEXT TOPIC" cut-in with a panel slide at topic changes
- Karaoke subtitles, a scrolling ticker, opening and closing title cards

## Avatar direction

`src/shared/schedule.ts` turns the timed lines into a motion schedule. Motions
are random, but drawn only from a pool that suits the moment: a greeting at the
start, an emotion-matched move at line starts, a glance at the notes between
lines, a breath or a tilt at topic changes, a nod or bow at the end. While
reading, the head follows the voice more calmly than in chat. Every random
choice follows the script `seed`, so the same script and audio render the same
video.

## Requirements

- Node.js 22+ and npm
- `ffmpeg` and `ffprobe` on `PATH`
- Chromium installed through Playwright
- The sibling `react-mesh-avatar-app` (its engine and images are used read-only)
- A ChatGPT sign-in for the default `codex-sdk` provider, or an API key

## Setup

```sh
npm install
npx playwright install chromium
npm run build
```

## Render

No script is bundled: generate one with `script-gen` or write one from the
[`script.json` format](./docs/script-format.md) example. `work/` is gitignored.

```sh
npm run script-gen -- article.txt --output work/news.json
npm run gen -- --script work/news.json --output work/news.mp4
npm run gen -- --script work/news.json --frame 150 --png work/frame150.png
```

Generated scripts use the `sine` voice so they render without a voice service.
To hear a real voice, change `voice`, for example AivisSpeech "Mao":
`{ "engine": "aituber-voice", "options": { "engineType": "aivisSpeech", "speaker": "888753760" } }`.
A frame takes about 0.25 s (about 4 minutes for a 30-second video).

## Limitations

- The rig is authored for the bundled image; other images need new layers and
  rig tuning in `react-mesh-avatar-app`.
- Lip sync is estimated from loudness; vowels are picked per syllable.
- Check the terms of any third-party voice model before publishing or
  monetizing a video.

## Asset terms and attribution

This example imports the sibling `react-mesh-avatar-app` engine and images
read-only and does not copy them. The Miko-derived avatar images it uses are
© Yuki Shindo (AITuber OnAir) and are not covered by the repository's MIT
License. They may be redistributed as an integral part of a work or other
content, but standalone redistribution and asset collections are prohibited.
See [Miko Asset Terms](./MIKO_ASSET_TERMS.md), which links to the authoritative
Japanese guidelines.
