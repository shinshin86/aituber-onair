# PSD Tachie Chat

A PSD-based tachie chat app built with `@aituber-onair/core`.
It keeps the same LLM, TTS, stream-comment, screen-vision, lip-sync, blink,
green-screen, and broadcast UI flow as `react-pngtuber-app`, but renders the
avatar from one runtime-loaded PSD file on a canvas.

The bundled `public/avatar/sample.psd` is generated from this repository's
PNGTuber sample images, so the app animates with zero setup.

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

## PSD avatar

Open **Settings → Visual** and use **PSD avatar** to select a local `.psd`
file. The file itself is not stored. Visibility and role settings are stored
only as layer IDs for that exact file name and size.

For supported PSD formats, motion/static mode selection, Anime2.5DRig layer
names, PSDTool notation, limitations, and troubleshooting, see
**[PSD-FORMATS.md](./PSD-FORMATS.md)**.

The bundled sample can be regenerated with:

```bash
npm run generate:sample-psd
```

This uses `ag-psd` as a dev-only generator. Runtime PSD parsing uses
`@webtoon/psd`.

## PSD modes

The app first tries motion auto-rig detection with the vendored
Anime2.5DRig-compatible rigger. Motion mode is used only when required parts,
anchors, and rigger checks all pass. Otherwise, the file falls back to static
PSDTool mode.

Static mode supports PSDTool-style `!` forced visibility, `*` radio items, and
role auto-detection for mouth and eye layers. The bundled
`public/avatar/sample.psd` is a static PSDTool sample.

Motion settings are in **Settings -> Visual**:

| Control | Behavior |
|---|---|
| `PSD motion` | Enables or disables idle motion, blink, and physics for motion-mode PSDs. |
| `Motion intensity` | Scales idle sway, breathing, and hair motion from `0.0` to `2.0`. |
| `Avatar view reset` | Restores avatar position and scale to `{ x: 0, y: 0, scale: 1 }`. |

Wheel zoom scales around the avatar's own center. Dragging is the only operation
that changes avatar position, and offsets are clamped so the avatar cannot be
lost completely off-screen.

## Credits

- Anime2.5DRig-compatible auto-rigging is based on
  [Anime2.5DRig](https://github.com/852wa/Anime2.5DRig) by 852wa (hakoniwa),
  MIT License. The vendored files live in `src/vendor/anime25drig/`.
- The bundled `public/avatar/sample.psd` is generated from this repository's
  PNGTuber sample images and is safe to ship with this example.

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
