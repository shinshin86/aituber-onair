# PSD Format Support

This example has two PSD paths:

- **Motion auto-rig mode** for flat Anime2.5DRig-compatible PSDs.
- **Static PSDTool mode** for PSDTool-style layer trees.

The app always tries motion detection first. If the loaded PSD is not eligible
for motion, it falls back to static mode.

## Decision Flow

1. The selected `.psd` is inspected by `src/lib/rig/anime25Rig.ts` with the
   vendored rigger in `src/vendor/anime25drig/rigger.js`.
2. Motion mode is selected only when all of these are true:
   - Required parts are present: `face`, `eyewhite`, `irides`, `eyelash`,
     `mouth_open`, and at least one of `front hair` or `back hair`.
   - Required anchors are present: `face`, `eyeL`, `eyeR`, and `mouth`.
   - The rigger produced no blocking warnings.
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
| `eyewhite` | Required | Split internally into left/right eye whites by component position. |
| `irides` | Required | Split internally into left/right irises by component position. |
| `eyelash` | Required | Split internally into left/right open-eye lashes. |
| `mouth_open` | Required | Required by this app for motion eligibility. |
| `front hair` | Required if no `back hair` | Hair layer. Numbered variants are allowed. |
| `back hair` | Required if no `front hair` | Hair layer. Numbered variants are allowed. |
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
  blocking warning like `未知のレイヤー名 "..." — head/body として扱います`.
- If the rigger cannot derive both eye anchors, motion eligibility fails with
  `目のアンカーが不完全です（eyewhite/irides を確認）` and
  `missing anchor: eyeL` or `missing anchor: eyeR`.

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
- Motion mode has idle/breath/hair/eye/mouth animation controls, but no camera
  tracking.

If a PSD fails with color mode or bit depth errors, export it again as an
8-bit RGB `.psd`.

## Troubleshooting

| Message | Meaning | Fix |
|---|---|---|
| `missing part: face` or `missing part: X` | A required motion slot was not found after rigger name normalization. | Rename a flat pixel layer to the required base name, for example `face`, `eyewhite`, `irides`, `eyelash`, `mouth_open`, `front hair`, or `back hair`. |
| `missing anchor: eyeL` | The rigger could not derive the left eye anchor. | Check that `eyewhite` and `irides` are visible pixel layers and separate into usable left/right components. |
| `未知のレイヤー名 "..." — head/body として扱います` | The layer name is not in the rigger slot table or alias table. | Rename it to a recognized base name. Avoid side suffixes such as `eyewhite_l` and hyphenated names such as `eyewhite-l`. |
| `目のアンカーが不完全です（eyewhite/irides を確認）` | Eye anchor detection did not find both eyes. | Make `eyewhite` and `irides` flat pixel layers with two separable eye components. |

## Bundled `sample.psd`

`public/avatar/sample.psd` is a static PSDTool sample, not a motion sample.
Its verified layer tree is:

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
visibility.

The motion detector rejects this file because it has no flat Anime2.5DRig
parts such as `face`, `eyewhite`, `irides`, `eyelash`, `mouth_open`, or hair
layers. A rig smoke check reports `!body` as an unknown layer and reports
incomplete eye and mouth anchors, so the app correctly uses static mode.

