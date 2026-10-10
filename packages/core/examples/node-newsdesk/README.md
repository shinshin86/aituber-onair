# Node Newsdesk

Generate a vertical news video from a JSON script, or turn source text into a
script with AITuber OnAir Core. The same script can be rendered with PNGTuber,
Purupuru, or Mesh by changing `--avatar`.

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
```

The sample uses a deterministic sine voice and requires no API key. Output is
1080 × 1920 at 30 fps, with a narration WAV, timings JSON, and render config
beside the MP4. PNGTuber is the default. PNGTuber and Purupuru run in Node
using native Canvas2D and do not load Playwright or launch Chromium. Mesh
renders its WebGL avatar and the same Canvas2D screen in headless Chromium.
Only Mesh needs the Chromium installation step above.

The shared screen includes a news panel, chapter progress, keyword pop-ups,
emotion effects, karaoke subtitles, a ticker, and opening/closing title cards.
PNGTuber provides four mouth/eye states and gentle breathing/roll. Purupuru
provides three mouth states, blinking, breathing/roll, and hair springs. These
two adapters keep their original faces; line emotions affect screen effects.
Mesh supports facial emotions and scheduled motions, using the framework-free
engine and default qipao assets from the sibling `react-mesh-avatar-app` example.
The engine and assets are used read-only; keep that sibling directory available.

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
`manifest.json`. Omitting it selects each adapter's default Miko assets.
`scale` ranges from 0.1 to 3; `x` and `y` are normalized positions inside the
660 × 700 avatar frame; `intensity` ranges from 0 to 3. Unknown fields and
invalid values produce an error. Config validation and defaults belong to each
adapter. Mesh accepts `padTop`, `padSide`, and `talkGain` instead of `intensity`.

| Avatar | Default placement | Adapter options |
| --- | --- | --- |
| PNGTuber | `scale: 1`, `x: 0.5`, `y: 0.5` | `intensity: 1` (0–3) |
| Purupuru | `scale: 1.5`, `x: 0.5`, `y: 0.65` | `intensity: 1` (0–3) |
| Mesh | `scale: 1`, `x: 0.5`, `y: 0.5` | `padTop: -0.07` (-0.5–1), `padSide: -0.18` (-0.45–1), `talkGain: 0.55` (0–3) |

Purupuru uses a closer upper-body view. Mesh padding controls the source-image
crop, and `talkGain` controls voice-driven body movement. For example:

```json
{ "padTop": -0.07, "padSide": -0.18, "talkGain": 0.55 }
```

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
that run. Native adapters seek directly to a frame; Mesh replays from frame 0
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
| Mesh | Sibling `react-mesh-avatar-app/public/avatar/qipao` | [Miko terms](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| Purupuru | Bundled `miko.purupuru` | [Miko terms](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |

The Japanese [Miko Character Usage Guidelines](https://miko.aituberonair.com/#terms)
are authoritative. Miko is the official character of AITuber OnAir. The
remaining avatar adapters are not available in this example yet.

## Development

```bash
npm run fmt
npm run lint
npm run typecheck
npm run test
npm run build
```
