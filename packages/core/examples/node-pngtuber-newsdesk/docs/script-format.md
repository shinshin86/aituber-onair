# `script.json` format

A script is the JSON object consumed by `npm run gen`. Paths in the document
are resolved relative to the script file.

```json
{
  "avatar": "../assets/avatar",
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
  "avatarLayout": { "scale": 1, "x": 0.5, "y": 0.51 },
  "motion": { "intensity": 1 },
  "blinkSeed": 42,
  "lines": [
    {
      "text": "ミコです。",
      "chapter": "ごあいさつ",
      "pauseAfter": 0.08
    }
  ]
}
```

## Top-level fields

- `avatar`: directory containing the four required PNGTuber state images.
- `output` (optional): MP4 path. The CLI `--output` takes precedence.
- `voice.engine`: `sine`, `say`, or `aituber-voice`.
- `voice.options`: options passed to that engine. The `aituber-voice` engine
  accepts Core `VoiceServiceOptions`; its audio is captured through `onPlay`.
- `leadIn`, `leadOut`: silence in seconds.
- `defaultPauseAfter`: default silence after each line.
- `background.color` and optional `background.image`: canvas background.
- `telop` (optional): title shown only while no line chapter is active.
- `avatarLayout`: avatar `scale` and fractional `x`/`y` anchors.
- `motion.intensity`: multiplier clamped from 0 through 3 for the subtle,
  deterministic breath bob and roll. This idle motion is a video-only addition;
  `0` disables it.
- `blinkSeed`: deterministic blink schedule seed.
- `lines`: ordered narration and subtitle entries.

The renderer uses `mouth_close_eyes_open.png`,
`mouth_close_eyes_close.png`, `mouth_open_eyes_open.png`, and
`mouth_open_eyes_close.png`. They must be PNG files with equal canvas sizes.
Normalized audio RMS values at or above `0.45` select an open-mouth image;
lower values select a closed-mouth image. The threshold gives the bundled sine
fixture clear open/closed alternation while remaining a simple binary lip-sync.

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
