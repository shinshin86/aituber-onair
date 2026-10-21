# Biim-style Explainer (Node)

Render an MP4 from a JSON timeline with one or two characters, a main video/image,
right-side information panels, and a two-line speech bubble. This example uses the
screen arrangement commonly called the biim system: black backgrounds, white
window borders, and separately timed commentary. It works for tutorials, travel,
slides, and gameplay. It does not reproduce a particular creator's dialogue.

[日本語](./README.ja.md)

## Quick start

Requires Node.js 22+, `ffmpeg` and `ffprobe` on PATH, and a Japanese-capable font.
Set `BIIM_FONT_PATH` to a font file if the system has no suitable font.

```bash
# From the repository root, build the local Core dependency first.
npm ci
npm run build
cd packages/core/examples/node-biim-explainer
npm ci
npm run build
npm run validate -- samples/biim-hello-sine.json
npm run plan -- samples/biim-hello-sine.json --estimate
npm run preview -- samples/biim-hello-sine.json --at 0 --at @speed --out work/preview
npm run gen -- samples/biim-hello-sine.json --out work/hello.mp4
```

Build generates an original four-second test-pattern video and a shapes image in
`work/`; no game footage is bundled. The sine sample produces tones rather than
Japanese speech and needs no API key or speech server. Output includes
`hello.mp4`, `hello.mixed.wav`, and `hello.timeline.json`. `work/` is ignored.

## Commands

| Command | Behavior |
| --- | --- |
| `validate script.json` | JSON Schema, speaker/anchor references, timing dependencies, definite numeric overlaps, widget conflicts, and file existence. No TTS or rendering. |
| `plan script.json` | Synthesize narration and print absolute line, page, main, panel, timer and counter intervals. |
| `plan script.json --estimate` | No TTS. Estimate speech using 8 nonspace characters/sec; override with `--chars-per-second 6`. |
| `plan script.json --json --out work/plan.json` | Print JSON and optionally save it. The `estimated` field distinguishes approximate timing. |
| `preview script.json --at 12.5 --at @intro-2:end --out work/preview` | Save PNG frames; repeated `--at` accepts seconds or anchors. Optional `--estimate` skips TTS. |
| `gen script.json --out work/out.mp4` | Encode H.264/AAC MP4, mixed mono 48 kHz WAV, and timeline JSON. |

All commands run via `npm run <command> -- ...`. For JSON-only stdout use
`node dist/gen.js plan samples/biim-hello-sine.json --estimate --json`.
Paths in a script are relative to that script. CLI `--out` is relative to the
working directory. Preview times must be within `[0, duration)`.

Validation cannot know the duration of unsynthesized speech. `plan` and `gen`
check every resolved overlap using the actual audio. An estimate can flag an
overlap that real audio would avoid, or miss one caused by longer audio. Prefer
anchors over fixed seconds when timing depends on speech. Video planning probes
source durations with ffprobe, including in estimate mode.

Audio is cached in `work/voice-cache/` by a hash of engine settings and reading
text. Preview, plan, and generation reuse it; delete that directory to refresh
voices after changing server presets. Scripts and credentials are not copied into
timeline artifacts. A synthesis failure reports the line index and speaker.

## Script reference

The complete executable [JSON Schema](./schema/biim-script.schema.json) is also
linked by `$schema` in each sample. Unknown fields are rejected.

| Field | Meaning / default |
| --- | --- |
| `canvas`, `fps`, `seed` | `"16:9"` (1920×1080) or `"4:3"` (1440×1080); 30 fps; deterministic seed 1. |
| `output` | MP4 path, overridden by `--out`. |
| `speakers` | Object with 1–2 entries in left-to-right insertion order. Each needs `name`, `image`, `voice`. Optional `mirror`, `textColor` (`#rrggbb`, default white). |
| `speakers.*.image` | Four-state PNG directory, or object with `mouth_close_eyes_open`, `mouth_open_eyes_open`, `mouth_close_eyes_close`, `mouth_open_eyes_close` file paths. All dimensions must match. |
| `speakers.*.voice` | `engine: "sine"` or `"aituber-voice"`, plus `options`. Sine: positive `frequency` (440 Hz), `secondsPerChar` (0.08), `minDuration` (0.5s). Core: existing `VoiceServiceOptions`, including required `engineType`. |
| `mouthMode`, `flapInterval`, `mouthThreshold`, `motion` | Top-level or speaker override: `"flap"`/`"rms"`, 0.12s (1/30–1), 0.08 (>0–1), `"subtle"`/`"bounce"`/`"none"`. Silence/listening closes the mouth. Blink is independent. |
| `defaults` | `pauseAfter: 0.3`, `mainAudioVolume: 0.25` (0–1). |
| `lines[]` | Required `speaker`, `text`; optional unique `id`, `reading`, `at`, `pauseAfter`, `emotion`. Silent captions require `spoken: false` and positive `duration`; spoken duration comes from audio. |
| `main[]` | Chronological `at`, optional `until`, exactly one `video`, `image`, or `color: "#rrggbb"`. Uncovered time is black. Missing `until` uses the next slot or timeline end. |
| `main[].video` | Optional `from` (0), `to` (source end), positive `speed` (1), `audio` (false), `speedBadge` (true). Range is in source seconds. Hold the last frame after playback ends. Clip audio ends there; it is not repeated. |
| `main[].fit` | `"contain"` (default) or `"cover"` for images/video. |
| `panels[]` | `at`, `box: "top" / "main" / "bottom"`, exactly one `text`, `items`, `image`, or `clear: true`. Each item has `text` and optional `color: "yellow" / "white"`. Content persists until the next update to that box. |
| `timer` | Required `start`; optional `stop` (timeline end), nonnegative `offset` (0), `format: "H:MM:SS.cc"`, `position: "main-bottom-right" / "right-bottom"`. Hidden before start and frozen after stop. |
| `counter` | Optional generic `label` and chronological `events: [{at, value}]`. Uses the bottom-right box. Do not combine it with bottom panels or a right-bottom timer. |

`emotion` is one of `neutral`, `happy`, `surprised`, `sad`, `angry`, `relaxed` and
only adjusts body-motion energy. The layout has unboxed avatars, normal-weight
42px subtitles and up to two lines per page. Long speech is paged in proportion
to each page's character count. Japanese word segmentation keeps words together
where possible; unusually long tokens are broken to fit. Panel text scales down
when necessary. Keep panel content short for readability. The renderer decodes
video frames to a temporary directory and removes it afterwards; allow disk
space for longer videos. Layout constants are in `src/layout.ts`.

## Time anchors

```json
{ "id": "intro-2", "speaker": "dango", "text": "説明します。" }
```

- `12.5`: absolute seconds.
- `"@intro-2"`: line start; `"@intro-2:end"`: audio/caption end.
- `"@intro-2+1.5"`, `"@intro-2-0.5"`, `"@intro-2:end+0.3"`: offsets.

Exact IDs win before interpreting an offset, so `@intro-2` refers to that ID.
Use an unambiguous ID when another ID could look like an offset. Every timed
field uses this syntax. Lines are sequential by default, including the previous
line's pause. Explicit `at` may place a line anywhere after the previous audio
ends. Cycles, unknown IDs, negative resolved times, reversed events and overlaps
are errors with JSON paths. Use `spoken: false` for intentional quiet captions.

## Speech with AquesTalkPlayer / aqtpserver

Start your installed AquesTalkPlayer and
[aqtpserver](https://github.com/shinshin86/aqtpserver), then:

```bash
npm run gen -- samples/biim-duo-aqtp.json --out work/duo.mp4
```

The sample uses Core's `VoiceEngineAdapter`, assigning `れいむ` to dango and
`まりさ` to bob at `http://127.0.0.1:20203/v1/audio/speech` with model
`aquestalkplayer`, `engineType: "openaiCompatible"`, and WAV response format.
Change both speaker endpoints when necessary. Presets must exist in
AquesTalkPlayer; speed and pitch come from those presets, and instructions are
not supported. See [Local TTS setup and usage terms](../../../../docs/local-tts.md#aquestalkplayer-aqtpserver).
The dango/bob images are copied from this repository's Node yukkuri example;
speech synthesis software has its own usage and licensing terms.

## Writing scripts with an AI agent

Copy and adapt this prompt:

```text
Write a general-purpose explainer JSON for node-biim-explainer about <topic>.
Read schema/biim-script.schema.json and samples/biim-hello-sine.json first.
Use 1–2 existing speakers, short panel items, natural subtitles, and line IDs.
Use @id / @id:end anchors for media/panel changes; keep timer/counter optional.
Use only supplied or original media. Do not imitate a particular creator.
Save samples/my-script.json and run:
  npm run validate -- samples/my-script.json
  npm run plan -- samples/my-script.json --estimate --json --out work/plan.json
Fix every error, then preview the start, each panel change and a later page:
  npm run preview -- samples/my-script.json --at 0 --at @chosen-id --out work/preview
Inspect the PNGs for clipping, bubble tails, text and avatar placement.
  npm run gen -- samples/my-script.json --out work/my-video.mp4
Inspect extracted MP4 frames and listen to the mixed WAV before reporting success.
```

## Development

```bash
npm ci
npm run fmt
npm run build
npm run test
npm run lint
```

Tests cover validation, timeline resolution, paging, compositor pixels and a
short sine MP4 pipeline. The pipeline test skips only when ffmpeg is unavailable.
The live-streaming React sample is independent from this offline renderer.
