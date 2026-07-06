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

The bundled sample can be regenerated with:

```bash
npm run generate:sample-psd
```

This uses `ag-psd` as a dev-only generator. Runtime PSD parsing uses
`@webtoon/psd`.

## Auto-rig motion mode

When a loaded PSD matches the Anime2.5DRig layer naming convention, the app
selects **Motion (auto-rig)** instead of the static PSDTool-style renderer.
Motion mode uses `ag-psd` to read pixel layers and the vendored
Anime2.5DRig-compatible rigger under `src/vendor/anime25drig/`.

The auto-rig detector requires usable face, left/right eye, and mouth anchors.
`eye_close_l` / `eye_close_r` are optional; when they are missing, the renderer
keeps eyelashes visible and compresses eye-open layers as a blink fallback.

Motion settings are in **Settings -> Visual**:

| Control | Behavior |
|---|---|
| `PSD motion` | Enables or disables idle motion, blink, and physics for motion-mode PSDs. |
| `Motion intensity` | Scales idle sway, breathing, and hair motion from `0.0` to `2.0`. |
| `Avatar view reset` | Restores avatar position and scale to `{ x: 0, y: 0, scale: 1 }`. |

Wheel zoom scales around the avatar's own center. Dragging is the only operation
that changes avatar position, and offsets are clamped so the avatar cannot be
lost completely off-screen.

## Auto-rig layer naming

Use a flat PSD layer structure with these names. Side-specific parts use `_l`
and `_r` suffixes. Hair strands can use numbered suffixes such as
`front hair_1`.

| Part | Required | Notes |
|---|---:|---|
| `face` | Yes | Main face region used as the primary anchor. |
| `eyewhite_l`, `eyewhite_r` | Yes | Eye masks / whites for left and right eyes. |
| `irides_l`, `irides_r` | Yes | Iris layers clipped by the eyewhite stencil. |
| `eyelash_l`, `eyelash_r` | Yes | Eye-open eyelash layers. |
| `eye_close_l`, `eye_close_r` | Optional | Improves blink shape when present. |
| `mouth_open`, `mouth_close` | Yes | Cross-faded and deformed by audio level. |
| `front hair`, `front hair_1`, ... | Optional | Strand data is used for hair physics. |
| `back hair` | Optional | Can participate in hair physics when detected. |
| `eyebrow_l`, `eyebrow_r` | Optional | Follows eye/head deformation. |
| `nose`, `ears`, `neck`, `topwear`, `bottomwear`, `handwear`, `headwear` | Optional | Rendered and grouped into head/body motion when present. |

## PSDTool notation support

| Notation | Support | Behavior |
|---|---:|---|
| Leading `!` | Yes | Forced visible. The layer/group is always composited and has no checkbox. |
| Leading `*` | Yes | Radio item. Selecting it hides sibling `*` items in the same parent group. |
| `:flipx` | Parsed | Marker is stripped from display name; flipping is not applied in v1. |
| `:flipy` | Parsed | Marker is stripped from display name; flipping is not applied in v1. |
| `:flipxy` | Parsed | Marker is stripped from display name; flipping is not applied in v1. |

Display names are the raw layer names with these markers removed.

## Role auto-detection

On load, the app searches layer/group names for these patterns:

| Role | Group hints | Layer hints |
|---|---|---|
| `mouthOpen` | `口`, `mouth`, `くち` | `開`, `あ`, `open` |
| `mouthClosed` | `口`, `mouth`, `くち` | `閉`, `ん`, `close`, `むっ` |
| `eyesOpen` | `目`, `eye`, `め` | `開`, `open` |
| `eyesClosed` | `目`, `eye`, `め` | `閉`, `close`, `つぶり` |

You can override all four bindings in **Settings → Visual → Role assignment**.

## Limitations

The v1 renderer intentionally supports normal pixel-layer compositing only.
It warns once in the console when a loaded PSD uses unsupported features.

- Non-normal blend modes are parsed but rendered as normal alpha compositing
- Layer masks and vector masks are ignored
- Clipping masks are ignored
- Adjustment layers are ignored
- `:flip*` variants are parsed but not flipped
- PSB is not supported by this example UI
- PSDTool faview/simple-view metadata is not supported

Group visibility still nests correctly: a node is visible only when its own
visibility and all ancestor group visibility states are visible.

Motion mode has a separate auto-rig path. It is intentionally naming-driven and
falls back to static mode when required anchors or required part names are not
usable. The selected mode and rejection reason are shown in **Settings ->
Visual**.

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
