# `script.json` format

A script is the JSON object consumed by `npm run gen`. Paths in the document
are resolved relative to the script file.

```json
{
  "avatar": "/path/to/inochi2d/models/avatar.inx",
  "avatarMotion": "/path/to/inochi2d/models/avatar.motion.json",
  "inochi2dRuntime": "/path/to/inochi2d/runtime",
  "voice": {
    "engine": "sine",
    "options": {
      "frequency": 440,
      "secondsPerChar": 0.06,
      "minDuration": 0.4
    }
  },
  "leadIn": 0.1,
  "leadOut": 0.2,
  "defaultPauseAfter": 0.08,
  "background": { "color": "#20242c" },
  "avatarLayout": { "scale": 1, "x": 0.5, "y": 0.5 },
  "avatarFraming": {
    "scale": 0.65,
    "x": 0,
    "y": 1450
  },
  "motion": { "intensity": 1 },
  "blinkSeed": 42,
  "lines": [
    {
      "text": "こんにちは。",
      "chapter": "ごあいさつ",
      "pauseAfter": 0.08
    }
  ]
}
```

## Top-level fields

- `avatar`: Inochi2D `.inx` file. Script-relative, absolute, and `~/...` paths
  are accepted.
- `avatarMotion` (optional): motion JSON passed to the runtime with the model.
- `inochi2dRuntime`: directory containing `inochi_bridge.js`, `inochi2d.js`,
  `inochi2d_bg.wasm`, and `secondary_motion.js`. The files are served read-only
  to the harness and are not copied or modified.
- `output` (optional): MP4 path. The CLI `--output` takes precedence.
- `voice.engine`: `sine`, `say`, or `aituber-voice`.
- `voice.options`: options passed to that engine. The `aituber-voice` engine
  accepts Core `VoiceServiceOptions`; its audio is captured through `onPlay`.
- `leadIn`, `leadOut`: silence in seconds.
- `defaultPauseAfter`: default silence after each line.
- `background.color` and optional `background.image`: canvas background.
- `telop` (optional): title shown only while no line chapter is active.
- `avatarLayout`: avatar `scale` and fractional `x`/`y` anchors.
- `avatarFraming` (optional): Inochi2D camera transform in model space. The
  portrait defaults are `scale: 0.65`, `x: 0`, and `y: 1450`. They retain the
  React example's model-space offset with a tighter vertical-video zoom.
  `avatarLayout` is applied afterward by the Node compositor.
- `motion.intensity`: weight of the looping `original_idle_calm_breath`
  animation, clamped from 0 through 3. Virtual time always advances at 30fps,
  so the value does not affect deterministic timing.
- `blinkSeed`: deterministic blink schedule seed.
- `lines`: ordered narration and subtitle entries.

Before the unmodified runtime bridge is imported, the harness replaces rAF,
`performance.now()`, `Date.now()`, and `Math.random()` with a seeded virtual
clock. Every requested video frame advances that clock exactly once. Normalized
audio RMS drives `Mouth:: Shape` as a vec2 when available, the blink schedule
uses `setEyeBlinkValue`, and the bridge renders one WebGL frame. Node then
composites the transparent browser frame with the background, chapter, and
subtitle.

## Line fields

- `text`: subtitle and narration unless `reading` is set.
- `reading` (optional): pronunciation-only narration text.
- `chapter` (optional): topic label shown until a later line changes it. The
  first chapter also covers the lead-in.
- `spoken` (optional): set to `false` for a silent subtitle.
- `duration`: required in seconds when `spoken` is `false`.
- `pauseAfter` (optional): silence after this line.

Scripts produced by `script-gen` contain 3 to 12 lines, with each `text`
limited to 35 Unicode characters. Every number and semantic-version token in
`telop`, `chapter`, `text`, or `reading` must occur in the source or optional
focus hint. Pure integers are compared without leading zeroes (for example,
source `07` may appear as `7`), while dotted version and decimal tokens are
compared unchanged.
