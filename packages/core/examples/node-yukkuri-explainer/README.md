# Yukkuri Explainer (Node)

Generate a 1920×1080, 30 fps MP4 from a JSON conversation and two sets of transparent
character images. Each speaker has its own voice, subtitle color and blink timing.
The speaking character opens and closes its mouth at a fixed cadence, with a small
audio-driven hop; the listener keeps its mouth closed and breathes gently.

[日本語](./README.ja.md)

## Run

Requires Node.js 22+, ffmpeg on PATH, and a Japanese-capable system font. On
systems without one, set `YUKKURI_FONT_PATH` to a font file such as Noto Sans JP.

From the repository root, install and build the local Core dependency first:

```bash
npm ci
npm run build
cd packages/core/examples/node-yukkuri-explainer
npm ci
npm run build
npm run gen -- samples/yukkuri-hello-sine.json --out work/hello.mp4
```

The sine demo uses tones, not spoken Japanese, and needs no speech server or API
key. The two tones use different frequencies. Output includes the MP4, combined
WAV, line timings, and a render config. `work/` is gitignored.

## AquesTalkPlayer through aqtpserver

Start your installed AquesTalkPlayer and
[aqtpserver](https://github.com/shinshin86/aqtpserver), then run:

```bash
npm run gen -- samples/yukkuri-hello-aqtp.json --out work/aqtp.mp4
```

Each speaker uses `voice.engine: "aituber-voice"`. Its `voice.options` are passed
to Core's `VoiceEngineAdapter`:

```json
{
  "engineType": "openaiCompatible",
  "openAiCompatibleApiUrl": "http://127.0.0.1:20203/v1/audio/speech",
  "openAiCompatibleModel": "aquestalkplayer",
  "speaker": "れいむ",
  "openAiCompatibleResponseFormat": "wav"
}
```

The sample assigns `れいむ` to dango and `まりさ` to bob. Change the full speech
endpoint in both speakers to use a different server address. Preset names must
exist in AquesTalkPlayer. Speed and pitch come from the presets; instructions
are not supported. Setup and usage terms are covered in
[Local TTS](../../../../docs/local-tts.md#aquestalkplayer-aqtpserver).
A connection failure stops generation and identifies the failing line and speaker.

## Script format

Use exactly two entries in `speakers`, one `left` and one `right`. Each entry needs
`name`, `image`, `position`, `subtitleColor` (`#rrggbb`), and `voice` (`engine` and
optional `options`). Set `mirror: true` to flip the image horizontally.

`image` is a directory relative to the script, such as `"../assets/yukkuri/dango"`,
containing four equally sized PNGs:

```text
mouth_close_eyes_open.png
mouth_open_eyes_open.png
mouth_close_eyes_close.png
mouth_open_eyes_close.png
```

Alternatively, use an object with those four names (without `.png`) as keys and
individual file paths as values. Images must share the same character placement
and transparent canvas; the renderer checks their dimensions. Old single-PNG
`image` values must be replaced with a state directory or four-path object.

Set these options at the top level or override them per speaker:

| Option | Default | Behavior |
| --- | --- | --- |
| `mouthMode` | `"flap"` | `"flap"` alternates open/closed; `"rms"` opens above the audio threshold. |
| `flapInterval` | `0.12` | Seconds per mouth state, from 1/30 to 1 second. |
| `mouthThreshold` | `0.08` | Normalized RMS threshold (greater than 0, at most 1). Silence always closes the mouth. |
| `motion` | `"subtle"` | `"subtle"` gives a small hop, `"bounce"` restores the larger hop, `"none"` disables all body motion. |

Each character blinks independently, roughly every 2–6 seconds for 0.1–0.2
seconds, including while listening. Mouth and eye changes still work with
`motion: "none"`.

Each line needs `speaker` (a key from `speakers`) and `text`. An unknown speaker
is rejected before synthesis. Optional fields:

- `reading`: pronunciation text used instead of `text` for speech.
- `chapter`, `point`: central panel heading and explanation; persist until replaced.
  A new chapter clears the previous point and slide.
- `keywords`: up to three short labels.
- `slide`: `{ "text": "Short explanation" }` or `{ "image": "../assets/slide.png" }`.
- `emotion`: `neutral`, `happy`, `surprised`, `sad`, `angry`, or `relaxed`; adjusts bounce strength.
- `pauseAfter`: silence after the line, in seconds.
- `spoken: false` with positive `duration`: show a silent subtitle.

Top-level options are `show` (`title`, `subtitle`), `seed`, `leadIn`, `leadOut`,
`defaultPauseAfter`, and `output`. Image, slide, and script output paths are relative
to the JSON file. `--out`/`--output` and `--png` paths are relative to the working
directory. See [the sine sample](./samples/yukkuri-hello-sine.json) for a complete
8-line conversation. Subtitles are limited to 100 characters per line and fit
within the subtitle bar.

## Preview and checks

```bash
# Prepare audio and timing without encoding a video.
npm run gen -- samples/yukkuri-hello-sine.json --out work/hello.mp4 --dry-run
# Reuse that audio/config to capture a frame (zero-based, 30 fps).
npm run gen -- samples/yukkuri-hello-sine.json --out work/hello.mp4 --render-only --frame 30 --png work/frame.png
# Re-encode using the saved config, without calling TTS again.
npm run gen -- samples/yukkuri-hello-sine.json --out work/hello.mp4 --render-only
npm run fmt
npm run build
npm run test
npm run lint
```

`--render-only` uses the saved config, not subsequent edits to the script. Run
without that flag to apply script changes. `--keep-temp` retains individual line
WAVs for inspection. Motion uses a fixed clock and seed, so seeking and fresh
renders produce the same poses. Pixel-level reproducibility also requires the
same fonts and renderer versions. LLM script generation and other avatar
backends are not included.
