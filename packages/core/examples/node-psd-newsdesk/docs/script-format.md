# `script.json` format

A script is the JSON object consumed by `npm run gen`. Paths in the document
are resolved relative to the script file.

```json
{
  "avatar": "../assets/sample-static.psd",
  "avatarMode": "static",
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

- `avatar`: `.psd` path.
- `avatarMode` (optional): `auto` (default), `static`, or `motion`. `auto`
  selects motion only when the Anime2.5DRig rigger produces a normalized
  `face` part, then falls back to static PSDTool compositing.
- `avatarRoles` (optional): exact pixel-layer paths overriding automatic
  `mouthOpen`, `mouthClosed`, `eyesOpen`, and `eyesClosed` detection.
- `output` (optional): MP4 path. The CLI `--output` takes precedence.
- `voice.engine`: `sine`, `say`, or `aituber-voice`.
- `voice.options`: options passed to that engine. The `aituber-voice` engine
  accepts Core `VoiceServiceOptions`; its audio is captured through `onPlay`.
- `leadIn`, `leadOut`: silence in seconds.
- `defaultPauseAfter`: default silence after each line.
- `background.color` and optional `background.image`: canvas background.
- `telop` (optional): title shown only while no line chapter is active.
- `avatarLayout`: avatar `scale` and fractional `x`/`y` anchors.
- `motion.intensity`: motion multiplier. Static mode clamps it from 0 through 3
  for the video-only breath bob and roll. Motion mode passes it to the sibling
  renderer, which clamps it from 0 through 2 for idle sway, breathing, random
  motion, and physics.
- `blinkSeed`: deterministic blink schedule seed.
- `lines`: ordered narration and subtitle entries.

The renderer auto-detects each role from Japanese or English group and layer
name hints. If a PSD uses other names, supply exact paths such as:

```json
{
  "avatarRoles": {
    "mouthOpen": "Face/Mouth/Open",
    "mouthClosed": "Face/Mouth/Closed",
    "eyesOpen": "Face/Eyes/Open",
    "eyesClosed": "Face/Eyes/Closed"
  }
}
```

Normalized audio RMS values at or above `0.45` select the open-mouth role;
lower values select the closed-mouth role. The threshold gives the bundled sine
fixture clear open/closed alternation while remaining a simple binary lip-sync.

## PSD modes

The general rule is motion detection first, static fallback second. With the
default `auto`, the vendored Anime2.5DRig rigger must produce a normalized
`face` part for motion mode. `static` skips Chromium and keeps the pure-Node
Canvas 2D path. `motion` requires a usable rig and fails with the rigger's
diagnostic when the PSD is ineligible.

### Static PSDTool behavior

Leading `!` forces a node visible. Leading `*` creates a sibling radio item;
initial visibility keeps only the first visible radio item. The suffixes
`:flipx`, `:flipy`, and `:flipxy` are parsed and removed from display paths, but
the pixels are not flipped.

PSB, non-normal blend rendering, masks, clipping masks, adjustment/effect
rendering, PSDTool metadata, and visual flip variants are unsupported. Use an
8-bit RGB PSD with normal pixel layers.

### Anime2.5DRig motion behavior

Motion mode bundles the sibling rigger and WebGL mesh renderer read-only into a
headless-Chromium harness. Before those modules load, the harness replaces
`requestAnimationFrame`, `cancelAnimationFrame`, `performance.now`, `Date.now`,
and `Math.random` with a virtual clock seeded by `blinkSeed`. Each video frame
sets audio-derived `mouthOpen`, advances time, flushes exactly one current rAF
callback, and requires the renderer to queue exactly one next callback.

The renderer has no direct eye-open input, so the external `eyesClosed`
schedule is intentionally unused in motion mode. Its built-in blink automation
stays enabled and becomes deterministic through the seeded virtual clock. Idle
sway, breathing, random motion, and physics also remain enabled.

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
