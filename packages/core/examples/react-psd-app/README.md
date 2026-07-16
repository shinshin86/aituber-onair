# PSD Tachie Chat

Web Speech API TTS is available with browser voice selection and rate, pitch,
volume, and language controls. Because the browser plays it directly without
exposing audio bytes, lip sync is not supported when this engine is selected.

![react-psd-app image](./images/react-psd-app.webp)

A PSD-based tachie chat app built with `@aituber-onair/core`.
It keeps the same LLM, TTS, stream-comment, screen-vision, lip-sync, blink,
green-screen, and broadcast UI flow as `react-pngtuber-app`, but renders the
avatar from one runtime-loaded PSD file on a canvas.

The bundled `public/avatar/sample.psd` is a license-clean procedural motion
sample, so the app animates with zero setup.

## What this app can do

- Chat with the LLM providers exposed by `@aituber-onair/core`
- Use the same TTS engines and audio-driven lip-sync as the PNGTuber example
- Load a PSD avatar at runtime with `@webtoon/psd`
- Composite visible PSD pixel layers to a canvas only when avatar state changes
- Auto-load `public/avatar/sample.psd` on first run
- Toggle PSD layers in Settings with PSDTool-style forced/radio behavior
- Bind PSD layers to `mouthOpen`, `mouthClosed`, `eyesOpen`, and `eyesClosed`
- Auto-detect mouth and eye role bindings from Japanese/English layer names
- Auto-detect Anime2.5DRig-compatible PSD layer names for motion mode
- Animate supported PSDs with idle motion, blink fallback, hair physics, and
  audio-driven mouth movement
- Overlay model-independent emotion effects in both static and motion modes
- Drag, wheel-zoom, and reset the avatar view from the canvas / Settings
- Persist visibility overrides and role bindings in `localStorage`, keyed by
  `${fileName}:${fileSize}`
- Keep uploaded PSD pixel data in memory only; re-select the same file after
  reload to restore the saved setup

## Setup

```bash
cd packages/core/examples/react-psd-app
npm install
npm run dev
```

After launch, open **Settings** and set API keys / provider options there.
General app settings are saved in `localStorage` under
`react-psd-app-settings`.
The LLM section also lets you edit the system prompt. It is applied when the
field loses focus and is saved with the other settings.

## PSD avatar

Open **Settings → Visual** and use **PSD avatar** to select a local `.psd`
file. The file itself is not stored. Visibility and role settings are stored
only as layer IDs for that exact file name and size.

For supported PSD formats, motion/static mode selection, Anime2.5DRig layer
names, PSDTool notation, limitations, and troubleshooting, see
**[PSD-FORMATS.md](./PSD-FORMATS.md)**.

The bundled motion sample can be regenerated with:

```bash
uv run --with pillow python scripts/draw_doodle_parts.py local-assets/doodle-parts
npm run build:doodle-sample
```

The Python script draws 10 transparent part PNGs with supersampled
antialiasing. `build:doodle-sample` assembles those parts into
`public/avatar/sample.psd` with `ag-psd`.

The static PSDTool notation sample can be regenerated with:

```bash
npm run generate:static-sample
```

This writes `public/avatar/sample-static.psd`. Runtime static PSD parsing uses
`@webtoon/psd`.

## PSD modes

The app first tries motion auto-rig detection with the vendored
Anime2.5DRig-compatible rigger. Motion mode is used only when required parts,
anchors, and rigger checks all pass. Otherwise, the file falls back to static
PSDTool mode.

Static mode supports PSDTool-style `!` forced visibility, `*` radio items, and
role auto-detection for mouth and eye layers. To inspect those controls, load
`public/avatar/sample-static.psd` from **Settings -> Visual -> PSD avatar**.

Motion settings are in **Settings -> Visual**:

| Control | Behavior |
|---|---|
| `PSD motion` | Enables or disables idle motion, blink, and physics for motion-mode PSDs. |
| `Motion intensity` | Scales idle sway, breathing, and hair motion from `0.0` to `2.0`. |
| `Avatar view reset` | Restores avatar position and scale to `{ x: 0, y: 0, scale: 1 }`. |

Wheel zoom scales around the avatar's own center. Dragging is the only operation
that changes avatar position, and offsets are clamped so the avatar cannot be
lost completely off-screen.

## Emotion expression effects

Open **Settings -> Emotion expression effects** and choose one of these modes:

| Mode | Behavior |
|---|---|
| `None` | Preserves the original display: no controls and no effects. |
| `Manual buttons + anchor settings` | Shows preview buttons and an anchor editor over the avatar. |
| `Link to speech emotions only` | Maps screenplay emotion tags such as `happy` and `sad` to effects during speech. |

The effects are procedural canvas overlays rather than PSD layers, so the same
sparkles, surprise lines, tears, anger mark, bubbles, and thinking mark work for
both static PSDTool avatars and Anime2.5DRig motion avatars. The mapping from
emotion tags to effects can be changed in Settings.

In manual mode, use **Anchor settings** to place the face center and both eyes,
and to adjust effect size. Anchor values are saved per PSD profile
(`${fileName}:${fileSize}`) in `react-psd-app-settings`. The PSD pixels and PSD
file itself are never copied into this setting.

## Credits

- Anime2.5DRig-compatible auto-rigging is based on
  [Anime2.5DRig](https://github.com/852wa/Anime2.5DRig) by 852wa (hakoniwa),
  MIT License. The vendored files live in `src/vendor/anime25drig/`.
- The bundled `public/avatar/sample.psd` and `sample-static.psd` are
  procedurally generated in this example and are safe to ship.

## Stream comments and Screen Vision

This app inherits the PNGTuber example's YouTube Live / Twitch comment intake
and OBS Virtual Camera screen-vision flow. Configure both from **Settings**.

## Lip-sync tuning

You can tune constants in `src/hooks/useAudioLipsync.ts`:

| Constant | Default | Description |
|---|---|---|
| `SMOOTH_FACTOR` | `0.5` | Smoothing factor (higher = smoother, 0.0-1.0) |
| `RMS_CEILING` | `0.12` | RMS normalization ceiling (lower = more sensitive mouth movement) |
| `MOUTH_LEVELS` | `5` | Number of mouth levels; this PSD example currently maps it to binary open/closed state |

## Notes for Web Speech API

- Works on **Chrome / Edge** (Chrome recommended)
- Firefox and Safari are not supported
- Mic button is disabled on unsupported browsers
- Requires HTTPS or localhost
