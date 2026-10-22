# Authoring a biim-style video with an agent

Use this guide, the [generated field reference](./reference.md), and the
[executable JSON Schema](../schema/biim-script.schema.json). The schema is the
field contract; the CLI also checks references, files and timing relationships.
The biim system describes the screen arrangement here: main content at the left,
information windows at the right, and avatar commentary below.

[日本語](./authoring-guide.ja.md)

## First video: copy, check, preview, render

From the repository root, run `npm ci` and `npm run build` for Core, then:

```bash
cd packages/core/examples/node-biim-explainer
npm ci
npm run build
```

Requires Node.js 22+, ffmpeg/ffprobe on PATH, and a Japanese-capable font. Set
`BIIM_FONT_PATH` to a font file if needed. Build creates the original demo clip
and shapes image in `work/`; keep those files for the bundled samples.

Create `work/my-video.json` with this complete one-speaker script:

```json
{
  "$schema": "../schema/biim-script.schema.json",
  "speakers": {
    "dango": {
      "name": "だんご",
      "image": "../assets/yukkuri/dango",
      "mirror": true,
      "voice": { "engine": "sine" }
    }
  },
  "lines": [
    { "id": "intro", "speaker": "dango", "text": "画面の見方を説明します。" },
    { "id": "detail", "speaker": "dango", "text": "右の欄に要点を表示します。" }
  ],
  "main": [{ "at": 0, "color": "#14283d" }],
  "panels": [{ "at": "@detail", "box": "main", "text": "操作のポイント" }]
}
```

Then run these steps in order:

```bash
npm run validate -- work/my-video.json
npm run plan -- work/my-video.json --estimate --json --out work/my-plan.json
npm run preview -- work/my-video.json --at 0 --at @detail --out work/my-preview
npm run gen -- work/my-video.json --out work/my-video.mp4
```

| Step | What it checks / produces |
| --- | --- |
| `validate` | Schema, IDs, speaker keys, timing dependencies, readable file paths, known overlaps and conflicting widgets. Success starts with `Valid schema, references, and files.` No TTS, media decoding or font rendering. |
| `plan --estimate` | Estimates nonspace text/reading at 8 Unicode characters/sec, minimum 0.5s per spoken line; `--chars-per-second` changes the rate. Silent captions keep their duration. Probes video duration/ranges. Writes `estimated: true` JSON with absolute line/page/main/panel/timer/counter intervals. No TTS. |
| `preview --at` | Uses actual synthesized/cached audio by default, then writes numbered PNGs such as `01-0.000.png`. Inspect start, panel changes, later subtitle pages and each speaker. `--at` may be repeated or use an anchor. |
| `gen` | Uses actual audio, checks resolved overlaps, and produces MP4, `.mixed.wav` and `.timeline.json`. The console prints duration. Inspect extracted MP4 frames and play the WAV. |

Plain `plan` prints `AUDIO ...s` and uses real audio. `plan --estimate` without
`--json` prints `ESTIMATE ...s` and readable intervals. For JSON-only stdout,
use `node dist/gen.js plan work/my-video.json --estimate --json`; npm itself
adds command headings. `plan --out` writes JSON even without `--json`.

Preview also supports `--estimate` for a quick layout check without TTS. Its
clock/page/scene times are approximate and its avatars have no synthesized audio
to drive mouth movement. A successful estimated preview is not an audio check.
Preview times must be in `[0, duration)`; use `@detail:end-0.1` to view near an end.
Anchor seeks select the first frame at/after that time, capped at the last frame;
numeric-second seeks select the frame at/before it. Filenames show requested seconds.

The input paths above are relative to `work/my-video.json`. CLI `--out` is
relative to the current directory; script `output` is relative to the script.
Without either, gen uses `../work/out.mp4` relative to the script. Voice WAVs
are cached in `work/voice-cache/` under a hash of text and engine options.
Delete that directory to refresh audio after changing server-side presets.
No voice options/credentials are written into the timeline JSON.

## Timing rules

- The first line starts at 0 unless it has `at`. Later omitted starts equal
  previous audio/caption end + previous `pauseAfter`. The fallback pause is
  `defaults.pauseAfter`, then 0.3 seconds. The final pause contributes to duration.
- `text` is displayed; optional `reading` replaces it only for speech synthesis.
  Real spoken duration is the returned audio duration. An estimate ignores sine
  `secondsPerChar`/`minDuration` and uses its own character-rate heuristic.
- `at: 12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`,
  `"@intro:end"`, and `"@intro:end+0.3"` work in every timed field.
  `:end` is audio/caption end, excluding the following pause.
- Exact IDs win over offset parsing; avoid an ID that looks like an offset from
  another ID. Use unique IDs beginning with an ASCII letter. Independent forward
  anchors work, but a dependency cycle is rejected.
- An explicit line `at` may shorten the planned pause but must not precede the
  previous audio/caption end. Only actual audio can settle speech-dependent
  overlaps; estimated timing can be too short or too long.
- A main slot ends at `until`, otherwise next main `at`, otherwise timeline end.
  Main slots must be ordered and must not overlap; gaps are black. A video range
  lasts `(to - from) / speed`, clipped to the slot. Its final decoded frame is
  held for the rest of the slot. Its audio stops when playback ends.
- Panels persist until the next update to the **same** box. `clear: true`
  removes content while keeping the border. Counter values persist similarly.
- Duration is the maximum of final line+pause, explicit main ends and event
  times (including timer stop). An event exactly at the final endpoint has no
  display time; extend a main `until` or add a silent final line when needed.

## Recipes

The following are fragments to merge into the complete script above. Replace
an existing array/member when the fragment names it; do not create duplicate
JSON keys. Paths assume the script stays in this example's `work/` or `samples/`.

### Two speakers

Add this member inside `speakers`, after dango, and append the line to `lines`:

```json
{
  "bob": {
    "name": "ぼぶ",
    "image": "../assets/yukkuri/bob",
    "mirror": true,
    "voice": { "engine": "sine", "options": { "frequency": 660 } }
  }
}
```

```json
{ "id": "reply", "speaker": "bob", "text": "二人目の話者です。" }
```

Insertion order determines left/right placement; `mirror` flips art, not position.
The bubble tail follows the speaker key. The listener's mouth stays closed.

### Your gameplay or screen recording, with a range

Put your authorized local recording at `work/local/gameplay.mp4`. Replace `main`
with this and adjust `from`/`to` to its actual duration:

```json
[{ "at": "@intro", "video": "local/gameplay.mp4", "from": 30, "to": 75, "speed": 1, "audio": true, "fit": "contain" }]
```

Source times are seconds before speed adjustment. Inspect the source with
`ffprobe -v error -show_format -show_streams work/local/gameplay.mp4`. To try the
same recipe with the generated demo, use `../work/demo.mp4`, `from: 0`, `to: 4`.
`audio` defaults to false; `defaults.mainAudioVolume` defaults to 0.25.

### Normal playback, then fast-forward

```json
[
  { "at": "@intro", "until": "@detail", "video": "../work/demo.mp4", "from": 0, "to": 4, "audio": true },
  { "at": "@detail", "video": "../work/demo.mp4", "from": 1, "to": 3, "speed": 2, "speedBadge": true, "audio": false }
]
```

The second range plays for one second, then holds if its slot is longer.
Use `speedBadge: false` to hide ×2. A positive speed below 1 slows playback;
source audio follows speed with pitch preserved when enabled.

### Switch to an image or a color

```json
[
  { "at": "@intro", "image": "../work/demo-slide.png", "fit": "contain" },
  { "at": "@detail", "color": "#182a20" }
]
```

`contain` fits the full image with black bars; `cover` fills/crops it. Each main
item must choose exactly one of video/image/color.

### Update right-column boxes

```json
[
  { "at": 0, "box": "top", "text": "操作手順" },
  { "at": "@intro", "box": "main", "items": [{ "text": "最初の確認", "color": "yellow" }, { "text": "補足説明", "color": "white" }] },
  { "at": "@detail", "box": "main", "image": "../work/demo-slide.png" },
  { "at": "@detail:end", "box": "main", "clear": true }
]
```

For a bottom panel use `box: "bottom"`. Remove `counter` and avoid a
`right-bottom` timer first; that box is exclusive for the entire script.
Panels choose exactly one text/items/image/clear. Item colors are the names
`yellow`/`white`; speaker `textColor` and main `color` instead use `#rrggbb`.

### Silent caption

Append a line (with its ID available for later anchors):

```json
{ "id": "quiet", "speaker": "dango", "text": "ここで画面を確認してください。", "spoken": false, "duration": 2, "pauseAfter": 0.3 }
```

Do not set `duration` on spoken lines. Long captions paginate to two rows at a
time, with page times proportional to character count; they have no speech.
Paging does not extend duration: leave enough time to read every page.

### Timer, counter and 4:3

Add the members you need; timer and counter can coexist at these positions:

```json
{
  "canvas": "4:3",
  "timer": { "start": "@intro", "stop": "@detail:end", "offset": 60, "format": "H:MM:SS.cc", "position": "main-bottom-right" },
  "counter": { "label": "確認数", "events": [{ "at": "@intro", "value": 0 }, { "at": "@detail", "value": 1 }] }
}
```

The clock is hidden before start, adds `offset` seconds, and freezes after stop.
For `position: "right-bottom"`, remove counter and all bottom panels, even if
their time ranges differ. Counter values may be fractional or negative.

## Assets and formats

Use equal-sized transparent PNGs with identical character placement:

```text
mouth_close_eyes_open.png
mouth_open_eyes_open.png
mouth_close_eyes_close.png
mouth_open_eyes_close.png
```

A square canvas such as 1024×1024 is convenient, not required. The renderer fits
each avatar within a 250×250 pixel area at 1080p. Four mismatched image dimensions
fail during rendering; `validate` checks files, not pixel dimensions or codecs.
Transparency prevents a rectangular background around the head. Background
removal is not included. Keep your local media in ignored `work/local/`; paths
are relative to the JSON file, not to the repository root.

For **one still image**, use an object mapping all four states to the same file.
A string ending in `.png` is treated as a directory and will fail:

```json
{
  "image": {
    "mouth_close_eyes_open": "local/avatar.png",
    "mouth_open_eyes_open": "local/avatar.png",
    "mouth_close_eyes_close": "local/avatar.png",
    "mouth_open_eyes_close": "local/avatar.png"
  },
  "motion": "none"
}
```

This uses existing state selection and requires no extra avatar mode. Without
`motion: "none"`, the still image can still move. See the complete static-avatar
[bottom-panel sample](../samples/biim-bottom-panel.json).

MP4 with H.264 video/AAC audio is tested. Other containers/codecs work only if
your installed ffmpeg/ffprobe can decode them and report a finite duration;
there is no extension allowlist. PNG (including transparency) and JPEG stills
are tested through @napi-rs/canvas. Other image formats depend on that decoder;
check with `preview` before using them. The renderer expands video to temporary
PNG frames and allocates the mixed WAV in memory, so allow disk/RAM for long clips.

## Voices

`sine` needs no server. Options are `frequency` (440Hz), `secondsPerChar` (0.08s),
`minDuration` (0.5s), and `amplitude` (0.22, range 0–1). It generates tones,
not Japanese pronunciation. Use it to check layout/timing without network calls.

The local aqtpserver path is verified in this example through Core's
`VoiceEngineAdapter` with both `れいむ` and `まりさ`. Start your installed
AquesTalkPlayer and aqtpserver first, following
[Local TTS setup and usage terms](../../../../../docs/local-tts.md#aquestalkplayer-aqtpserver).
Use this speaker `voice` and change `speaker` to `まりさ` for bob:

```json
{
  "engine": "aituber-voice",
  "options": {
    "engineType": "openaiCompatible",
    "openAiCompatibleApiUrl": "http://127.0.0.1:20203/v1/audio/speech",
    "openAiCompatibleModel": "aquestalkplayer",
    "speaker": "れいむ",
    "openAiCompatibleResponseFormat": "wav"
  }
}
```

Run `npm run gen -- samples/biim-duo-aqtp.json --out work/aqtp.mp4`. Presets must
exist in AquesTalkPlayer. Their speed/pitch settings are used; do not add
unsupported instructions. A server connection failure is not a schema failure.

For other engines, `voice.options` maps directly to Core's `VoiceServiceOptions`;
the adapter replaces `onPlay` to capture audio, then converts it to mono 48kHz WAV.
For example, `{"engine":"aituber-voice","options":{"engineType":"voicevox","voicevoxApiUrl":"http://127.0.0.1:50021","speaker":"1"}}`
uses the existing Core voicevox options. **This provider configuration is not
live-verified in this example.** Consult Core/Voice documentation for its settings.
Schema checks `engineType` is nonempty, not whether all provider options work.
Engines that do not return capturable audio cannot be used by this renderer.

## Common errors and fixes

These are actual validator/CLI messages (indices/IDs/numbers vary):

| Message | Fix |
| --- | --- |
| `lines[1].speaker: unknown speaker missing` | Use a key from `speakers`, not its name. |
| `lines[1].id: duplicate ID intro` | Give each anchor ID a unique name. |
| `main[0].at: unknown line anchor @missing` | Define that line ID or correct the reference. |
| `lines[0].at: cyclic line timing dependency` | Remove a forward reference whose target depends on this line. |
| `lines[0].duration: must have required property 'duration'` | Add positive duration to `spoken: false`. Remove duration for spoken lines. |
| `main[0]: must match exactly one schema in oneOf` | Pick only one video/image/color. |
| `main[0].image: file does not exist or is not readable (missing.png)` | Resolve the path from the script's directory. |
| `lines[1].at: must be >= previous line end (at least 2s)` | Move at later or use a sequential start/anchor; actual TTS can increase the required end. |
| `main[1].at: overlaps previous main slot` | End the previous slot at/before this start. |
| `counter: cannot share bottom with panels` | Remove counter or every bottom panel. |
| `timer.position: right-bottom cannot share bottom with panels/counter` | Move the clock to main-bottom-right or free the bottom box. |
| `--at 999: outside timeline [0, ...` | Preview a time strictly before the endpoint. |

The CLI reports all shape errors, then (if the shape is valid) semantic/file
errors. It exits nonzero on failure. Do not treat `validate` success as a
guarantee that fonts, image dimensions, video codecs or external TTS will work.

## Coverage and limits

[biim-all-features.json](../samples/biim-all-features.json) combines two sine
speakers, directory/explicit avatar paths, root/speaker performance settings,
all line fields/emotions, long silent pages, range/speed/audio/badge/fit options,
color/image/video slots, text/item/image/clear panels, an offset clock and counter.
Mutually exclusive bottom choices cannot be combined in one valid document:
[biim-bottom-panel.json](../samples/biim-bottom-panel.json) covers bottom panels
and a still-image avatar; [biim-timer-right.json](../samples/biim-timer-right.json)
covers the right-bottom clock. The aqtp sample covers the alternative voice engine.

Use your own or authorized footage. Do not commit commercial footage, logos or
third-party screenshots into this repository. Use neutral text without meme
phrases or imitation of a particular creator. Limits are 1–2 speakers, a fixed
four-state avatar set per speaker for the entire video, and no separate BGM/SE
tracks. Source-video audio can be mixed; mid-video avatar/expression-set changes
and 3+ speakers are not implemented.

After editing the schema, run `npm run docs:reference`. Tests fail if either
generated reference differs from the schema or descriptions are missing,
placeholders, or reused for fields with different meanings.
