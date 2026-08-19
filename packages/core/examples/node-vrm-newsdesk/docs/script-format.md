# `script.json` format

A script is the JSON object consumed by `npm run gen`. Paths in the document
are resolved relative to the script file.

```json
{
  "avatar": "../../react-vrm-app/public/avatar/miko.vrm",
  "avatarAnimation": "../../react-vrm-app/public/avatar/idle_loop.vrma",
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
    "visibleHeightRatio": 0.39,
    "lookAtHeightRatio": 0.845
  },
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

- `avatar`: `.vrm` model file.
- `avatarAnimation` (optional): `.vrma` idle-animation file. The model works
  without it in a frozen pose.
- `output` (optional): MP4 path. The CLI `--output` takes precedence.
- `voice.engine`: `sine`, `say`, or `aituber-voice`.
- `voice.options`: options passed to that engine. The `aituber-voice` engine
  accepts Core `VoiceServiceOptions`; its audio is captured through `onPlay`.
- `leadIn`, `leadOut`: silence in seconds.
- `defaultPauseAfter`: default silence after each line.
- `background.color` and optional `background.image`: canvas background.
- `telop` (optional): title shown only while no line chapter is active.
- `avatarLayout`: avatar `scale` and fractional `x`/`y` anchors.
- `avatarFraming` (optional): browser-camera overrides. The portrait defaults
  are `visibleHeightRatio: 0.39` and `lookAtHeightRatio: 0.845` for a bust-up
  news shot. A smaller `visibleHeightRatio` zooms in; a smaller
  `lookAtHeightRatio` moves the model upward. Valid ranges are `0.1`–`2` and
  `0`–`1.5`, respectively. `avatarLayout` is applied afterward and keeps its
  existing scale/anchor semantics.
- `motion.intensity`: VRMA playback-rate multiplier clamped from 0 through 3;
  `0` freezes the animation while lip-sync and blinking continue.
- `blinkSeed`: deterministic blink schedule seed.
- `lines`: ordered narration and subtitle entries.

Headless Chromium renders the VRM and optional VRMA to a transparent frame.
Normalized audio RMS is sent to the model's `aa` mouth expression, and the
deterministic blink schedule drives its `blink` expression. Node composites
that browser frame with the background, chapter label, and subtitle.

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
