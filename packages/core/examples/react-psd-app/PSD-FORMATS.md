# PSD Format Support

This example has two PSD paths:

- **Motion auto-rig mode** for flat Anime2.5DRig-compatible PSDs.
- **Static PSDTool mode** for PSDTool-style layer trees.

The app always tries motion detection first. If the loaded PSD is not eligible
for motion, it falls back to static mode.

## Decision Flow

1. The selected `.psd` is inspected by `src/lib/rig/anime25Rig.ts` with the
   vendored rigger in `src/vendor/anime25drig/rigger.js`.
2. Motion mode is selected when the rigger produces a normalized `face` part.
   Eye, mouth, and hair parts add their corresponding motion capabilities but
   are not required. Missing optional parts and incomplete eye anchors remain
   visible as non-blocking diagnostic warnings.
3. Otherwise the app parses the file with `@webtoon/psd` and uses static
   PSDTool mode.

When a PSD falls back to static mode, **Settings -> Visual** shows the static
mode status and the motion rejection reason. In the Japanese UI this appears as
`静的モード` and `モーション判定の詳細`.

## Motion Mode Layer Specification

Motion mode uses only flat pixel layers. Grouped PSDs are rejected by the
vendored rigger with:

```text
レイヤーが見つかりません（グループは未対応・フラット構成にしてください）
```

Layer names are normalized by `normName` in `rigger.js`:

- Unicode is normalized with `NFKC`.
- Leading/trailing whitespace is removed.
- Japanese copy suffixes like ` のコピー 12` are stripped.
- Names are lower-cased.
- Only trailing numeric suffixes in the form `_<number>` are stripped by
  `baseName` after alias resolution.

### Recognized Input Names

| Input name | Eligibility | Notes |
|---|---:|---|
| `face` | Required | Main face region and face anchor source. |
| `eyewhite` | Optional | Split internally into visible left/right eye whites and used to derive eye anchors. A single detected side is supported. |
| `irides` | Optional | Split internally into visible left/right irises for gaze motion. |
| `eyelash` | Optional | Split internally into visible left/right open-eye lashes. |
| `mouth_open` | Optional | Enables the open-mouth side of audio-driven lip sync. |
| `front hair` | Optional | Hair layer with physics. Numbered variants are allowed. |
| `back hair` | Optional | Hair layer with physics. Numbered variants are allowed. |
| `mouth_close` | Optional | Used for closed-mouth shape and may help mouth anchor placement. |
| `eye_close` | Optional | Split internally into left/right closed eyes. If missing, blink falls back to compressing eye-open layers. |
| `eyebrow` | Optional | Split internally into left/right brows. |
| `nose` | Optional | Follows face/head deformation. |
| `ears` | Optional | Follows face/head deformation. |
| `neck` | Optional | Body-side part. |
| `topwear` | Optional | Body-side part. |
| `bottomwear` | Optional | Body-side part. |
| `handwear` | Optional | Body-side part. |
| `earwear` | Optional | Head-side accessory. |
| `headwear` | Optional | Head-side accessory. |
| `facedetail` | Optional | Face-side detail. |

Aliases verified from the vendored rigger:

| Input name | Normalized as |
|---|---|
| `eyelash_c` | `eye_close` |
| `mouth_c` | `mouth_close` |
| `mouth`, `mouth 2`, `mouth_3`, `mouth-4` | `mouth_open` |
| `レイヤー 1` | `facedetail` |

Hair strand names can use underscore numbering such as `front hair_1` or
`back hair_12`. The rigger strips the trailing `_<number>` for slot lookup and
uses numbered hair layers for strand grouping. Hyphen numbering such as
`front hair-1` is not stripped.

### Motion Naming Pitfalls

- Input split-eye layers should use the base names `eyewhite`, `irides`,
  `eyelash`, `eye_close`, and `eyebrow`. The rigger splits them into left and
  right parts internally.
- `eyewhite_l`, `irides_r`, `eyewhite-l`, and `irides-r` are not recognized
  input slot names by the vendored rigger.
- Unknown names are demoted to `body` or `head` placement and produce a
  diagnostic warning like `未知のレイヤー名 "..." — head/body として扱います`.
- If the rigger derives only one eye anchor, the detected side keeps its eye
  motion and the unavailable side is skipped. The incomplete-anchor warning is
  diagnostic and does not disable motion mode.

## Static PSDTool Mode

Static mode renders a PSD layer tree with `@webtoon/psd` and canvas
compositing. It supports the PSDTool-like name markers implemented in
`src/lib/psdModel.ts` and `src/lib/psdVisibility.ts`.

| Notation | Support | Behavior |
|---|---:|---|
| Leading `!` | Supported | Forced visible. The node is always composited and has no checkbox. |
| Leading `*` | Supported | Radio item. Making one visible hides sibling radio items in the same parent. |
| `:flipx` | Parsed only | Removed from the display name; no horizontal flip is applied. |
| `:flipy` | Parsed only | Removed from the display name; no vertical flip is applied. |
| `:flipxy` | Parsed only | Removed from the display name; no flip is applied. |

Radio initial visibility is normalized per sibling set: the first visible radio
item remains visible and later visible radio siblings are hidden.

Role auto-detection is implemented in `src/lib/psdBinding.ts`:

| Role | Group hints | Layer hints |
|---|---|---|
| `mouthOpen` | `口`, `mouth`, `くち` | `開`, `あ`, `open` |
| `mouthClosed` | `口`, `mouth`, `くち` | `閉`, `ん`, `close`, `むっ` |
| `eyesOpen` | `目`, `eye`, `め` | `開`, `open` |
| `eyesClosed` | `目`, `eye`, `め` | `閉`, `close`, `つぶり` |

The layer tree and role controls are shown only when
`hasPsdToolLayerControls(model)` is true. That requires at least one group,
radio node, or forced-visible node. A plain flat PSD without PSDTool controls is
still rendered, but the detailed layer tree UI is hidden.

## Limitations

These limits apply to this example unless noted otherwise:

- The UI accepts `.psd` files. PSB is not supported or tested by this example.
- The known-good format is an 8-bit RGB PSD with normal pixel layers. The
  static parser exposes broader PSD header enums, but this example's rendering
  path is verified for 8-bit RGB/grayscale layer pixels. The motion path is
  verified for 8-bit RGB flat pixel layers.
- Non-normal blend modes are parsed but rendered as normal alpha compositing.
- Layer masks and vector masks are ignored.
- Clipping masks are ignored.
- Adjustment/effect layers are not rendered as Photoshop effects.
- `:flip*` variants are parsed but not visually flipped.
- PSDTool faview/simple-view metadata is not supported.
- Motion mode has idle and breathing motion. Hair, eye, blink, and mouth motion
  are applied when their corresponding layers can be detected. It has no camera
  tracking.

If a PSD fails with color mode or bit depth errors, export it again as an
8-bit RGB `.psd`.

## Troubleshooting

| Message | Meaning | Fix |
|---|---|---|
| `missing part: face` | The required face motion slot was not found after rigger name normalization. | Rename the main flat face pixel layer to `face`, or use static PSDTool mode. |
| `未知のレイヤー名 "..." — head/body として扱います` | The layer name is not in the rigger slot table or alias table. Motion mode can still run when `face` is present. | Rename it to a recognized base name when it should receive part-specific motion. Avoid side suffixes such as `eyewhite_l` and hyphenated names such as `eyewhite-l`. |
| `目のアンカーが不完全です（eyewhite/irides を確認）` | Eye anchor detection found only one side or no usable eye components. Motion mode can still run. | No change is needed for a deliberate single-eye/profile avatar. Otherwise, make `eyewhite` and `irides` flat pixel layers with separable eye components. |

## Bundled Samples

`public/avatar/sample.psd` is a procedurally drawn motion-mode demo. It is
generated from 10 transparent PNG parts drawn by
`scripts/draw_doodle_parts.py` and assembled by `scripts/build-doodle-sample.mjs`.
The PSD uses a fixed 1024x1536 canvas and these bottom-to-top flat layer names:

```text
back hair
topwear
face
mouth_open
eyewhite
eyelash
irides
front hair
mouth_close
eye_close
```

Regenerate it with:

```bash
uv run --with pillow python scripts/draw_doodle_parts.py local-assets/doodle-parts
npm run build:doodle-sample
```

The static PSDTool notation demo is `public/avatar/sample-static.psd`. Load it
from **Settings -> Visual -> PSD avatar** when you want to inspect layer-tree,
radio, forced visibility, and role-assignment behavior. Its verified layer tree
is:

```text
ROOT
  口
    *開き
    *閉じ
  目
    *閉じ
    *開き
  !body
```

The `口` and `目` groups demonstrate radio items. `!body` demonstrates forced
visibility. Regenerate it with:

```bash
npm run generate:static-sample
```

The motion detector rejects `sample-static.psd` because it has no flat `face`
motion part. A rig smoke check reports `!body` as an unknown layer and reports
incomplete eye and mouth anchors, so the app correctly uses static mode.
