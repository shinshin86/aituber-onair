# `script.json` format

A script is the JSON object consumed by `npm run gen`. Paths in the document
are resolved relative to the script file.

```json
{
  "avatar": "/path/to/live2d_models/model/runtime/model.model3.json",
  "cubismCore": "/path/to/CubismSdkForWeb/Core/live2dcubismcore.min.js",
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
    "scale": 2.5,
    "x": 0.5,
    "y": 0.4
  },
  "avatarMotion": {
    "idle": "Idle"
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

- `avatar`: Cubism 4 `.model3.json` file. Script-relative, absolute, and `~/...`
  paths are accepted.
- `cubismCore`: local `live2dcubismcore.min.js` from Cubism SDK for Web, using
  the same path rules. It is required and is never bundled by this example.
- `output` (optional): MP4 path. The CLI `--output` takes precedence.
- `voice.engine`: `sine`, `say`, or `aituber-voice`.
- `voice.options`: options passed to that engine. The `aituber-voice` engine
  accepts Core `VoiceServiceOptions`; its audio is captured through `onPlay`.
- `leadIn`, `leadOut`: silence in seconds.
- `defaultPauseAfter`: default silence after each line.
- `background.color` and optional `background.image`: canvas background.
- `telop` (optional): title shown only while no line chapter is active.
- `avatarLayout`: avatar `scale` and fractional `x`/`y` anchors.
- `avatarFraming` (optional): in-harness Pixi transform overrides. `scale` is a
  multiplier after width fitting; `x` and `y` are fractional canvas anchors.
  Defaults are `scale: 2.5`, `x: 0.5`, and `y: 0.4`. `avatarLayout` is applied
  afterward and keeps its Node-side composite semantics.
- `avatarMotion.idle` (optional): deterministic idle motion group. Its index
  zero is pinned. Without this field the `Idle` group is used when present.
- `motion.intensity`: Live2D update-rate multiplier clamped from 0 through 3;
  `0` freezes idle motion while RMS lip-sync and deterministic blinking remain.
- `blinkSeed`: deterministic blink schedule seed.
- `lines`: ordered narration and subtitle entries.

Headless Chromium renders the Cubism 4 model to a transparent frame. After each
fixed-step model update, normalized audio RMS is written directly to the first
available mouth-open parameter and the deterministic blink schedule writes
`ParamEyeLOpen`/`ParamEyeROpen`. Node composites that browser frame with the
background, chapter label, and subtitle.

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
