# PSD 形式サポート

この example には 2 つの PSD パスがあります。

- **Motion auto-rig mode**: flat な Anime2.5DRig 互換 PSD 向け。
- **Static PSDTool mode**: PSDTool 風のレイヤーツリー向け。

アプリは常に motion 判定を先に試します。motion 条件を満たさない PSD は
static mode に fallback します。

## 判定フロー

1. 選択された `.psd` を `src/lib/rig/anime25Rig.ts` が読み取り、
   `src/vendor/anime25drig/rigger.js` の vendored rigger で検査します。
2. 次の条件をすべて満たす場合だけ motion mode になります。
   - 必須 part がある: `face`, `eyewhite`, `irides`, `eyelash`,
     `mouth_open`, さらに `front hair` または `back hair` のどちらか。
   - 必須 anchor がある: `face`, `eyeL`, `eyeR`, `mouth`。
   - rigger の blocking warning が 1 件もない。
3. 条件を満たさない場合は `@webtoon/psd` で parse し、static PSDTool
   mode で表示します。

static mode に fallback した場合、**Settings -> Visual** に `静的モード`
という状態表示と、`モーション判定の詳細` として不採用理由が表示されます。

## Motion Mode のレイヤー仕様

motion mode は flat な pixel layer だけを使います。グループ化された PSD は
vendored rigger で次のエラーになります。

```text
レイヤーが見つかりません（グループは未対応・フラット構成にしてください）
```

レイヤー名は `rigger.js` の `normName` で正規化されます。

- Unicode は `NFKC` で正規化されます。
- 前後の空白は除去されます。
- ` のコピー 12` のような日本語コピー suffix は除去されます。
- 小文字化されます。
- alias 解決後、`baseName` により末尾の `_<number>` だけが除去されます。

### 認識される入力名

| 入力名 | motion 判定 | 補足 |
|---|---:|---|
| `face` | 必須 | 顔領域と face anchor の元になります。 |
| `eyewhite` | 必須 | component 位置で左右の白目に内部分割されます。 |
| `irides` | 必須 | component 位置で左右の虹彩に内部分割されます。 |
| `eyelash` | 必須 | component 位置で左右の開き目まつげに内部分割されます。 |
| `mouth_open` | 必須 | この app の motion 判定で必須です。 |
| `front hair` | `back hair` がない場合は必須 | 髪レイヤー。numbered variant も使えます。 |
| `back hair` | `front hair` がない場合は必須 | 髪レイヤー。numbered variant も使えます。 |
| `mouth_close` | 任意 | 閉じ口形状と mouth anchor の補助に使われます。 |
| `eye_close` | 任意 | 左右の閉じ目に内部分割されます。ない場合は eye-open layer を圧縮する blink fallback を使います。 |
| `eyebrow` | 任意 | 左右の眉に内部分割されます。 |
| `nose` | 任意 | face/head 変形に追従します。 |
| `ears` | 任意 | face/head 変形に追従します。 |
| `neck` | 任意 | body 側 part です。 |
| `topwear` | 任意 | body 側 part です。 |
| `bottomwear` | 任意 | body 側 part です。 |
| `handwear` | 任意 | body 側 part です。 |
| `earwear` | 任意 | head 側 accessory です。 |
| `headwear` | 任意 | head 側 accessory です。 |
| `facedetail` | 任意 | face 側 detail です。 |

vendored rigger で確認済みの alias は次の通りです。

| 入力名 | 正規化後 |
|---|---|
| `eyelash_c` | `eye_close` |
| `mouth_c` | `mouth_close` |
| `mouth`, `mouth 2`, `mouth_3`, `mouth-4` | `mouth_open` |
| `レイヤー 1` | `facedetail` |

髪の strand 名は `front hair_1` や `back hair_12` のような underscore
numbering を使えます。rigger は slot 判定時に末尾の `_<number>` を除去し、
numbered hair layer を strand group として扱います。`front hair-1` のような
hyphen numbering は除去されません。

### Motion 命名の注意点

- 入力 PSD の左右目パーツは `eyewhite`, `irides`, `eyelash`,
  `eye_close`, `eyebrow` という base name を使います。rigger が内部で左右に
  分割します。
- `eyewhite_l`, `irides_r`, `eyewhite-l`, `irides-r` は vendored rigger の
  input slot 名として認識されません。
- 未知の名前は `body` または `head` 扱いに降格され、
  `未知のレイヤー名 "..." — head/body として扱います` という blocking
  warning になります。
- 左右の eye anchor を導出できない場合は
  `目のアンカーが不完全です（eyewhite/irides を確認）` と
  `missing anchor: eyeL` または `missing anchor: eyeR` で motion 不採用に
  なります。

## Static PSDTool Mode

static mode は `@webtoon/psd` で PSD レイヤーツリーを読み取り、canvas に合成します。
対応する PSDTool 風 marker は `src/lib/psdModel.ts` と
`src/lib/psdVisibility.ts` に実装されています。

| 記法 | 対応 | 挙動 |
|---|---:|---|
| 先頭 `!` | 対応 | 強制表示。常に合成され、checkbox は表示されません。 |
| 先頭 `*` | 対応 | radio item。表示すると同じ親の sibling radio item を非表示にします。 |
| `:flipx` | parse のみ | 表示名から除去しますが、左右反転はしません。 |
| `:flipy` | parse のみ | 表示名から除去しますが、上下反転はしません。 |
| `:flipxy` | parse のみ | 表示名から除去しますが、反転はしません。 |

radio の初期表示は sibling set ごとに正規化されます。最初に visible な radio
item だけを表示し、それ以降の visible radio sibling は非表示になります。

role 自動検出は `src/lib/psdBinding.ts` に実装されています。

| Role | グループ名ヒント | レイヤー名ヒント |
|---|---|---|
| `mouthOpen` | `口`, `mouth`, `くち` | `開`, `あ`, `open` |
| `mouthClosed` | `口`, `mouth`, `くち` | `閉`, `ん`, `close`, `むっ` |
| `eyesOpen` | `目`, `eye`, `め` | `開`, `open` |
| `eyesClosed` | `目`, `eye`, `め` | `閉`, `close`, `つぶり` |

レイヤーツリーと role controls は `hasPsdToolLayerControls(model)` が true の
場合だけ表示されます。条件は group、radio node、forced-visible node のいずれかが
存在することです。PSDTool control のない plain flat PSD も描画はされますが、
詳細なレイヤーツリー UI は非表示になります。

## 制限

この example では、特に記載がない限り次の制限があります。

- UI が受け付けるのは `.psd` です。PSB はこの example では未対応・未検証です。
- known-good 形式は normal pixel layer を持つ 8-bit RGB PSD です。static parser は
  より広い PSD header enum を持ちますが、この example の描画パスは 8-bit
  RGB/grayscale layer pixel で検証しています。motion path は 8-bit RGB の flat
  pixel layer PSD で検証しています。
- normal 以外の blend mode は parse しますが通常の alpha 合成として描画します。
- layer mask / vector mask は無視します。
- clipping mask は無視します。
- adjustment/effect layer は Photoshop の効果としては描画しません。
- `:flip*` variant は parse しますが視覚的な反転はしません。
- PSDTool faview/simple-view metadata は未対応です。
- motion mode には idle/breath/hair/eye/mouth animation control がありますが、
  camera tracking はありません。

color mode や bit depth のエラーが出る場合は、8-bit RGB の `.psd` として
書き出し直してください。

## Troubleshooting

| Message | 意味 | 修正 |
|---|---|---|
| `missing part: face` または `missing part: X` | rigger の名前正規化後に必須 motion slot が見つかっていません。 | flat pixel layer を `face`, `eyewhite`, `irides`, `eyelash`, `mouth_open`, `front hair`, `back hair` などの必須 base name に変更します。 |
| `missing anchor: eyeL` | 左目 anchor を導出できませんでした。 | `eyewhite` と `irides` が visible な pixel layer で、左右 component に分離できる形になっているか確認します。 |
| `未知のレイヤー名 "..." — head/body として扱います` | layer name が rigger の slot table / alias table にありません。 | 認識される base name に変更します。`eyewhite_l` のような side suffix や `eyewhite-l` のような hyphenated name は避けます。 |
| `目のアンカーが不完全です（eyewhite/irides を確認）` | eye anchor detection が両目を見つけられていません。 | `eyewhite` と `irides` を、左右 2 component に分離できる flat pixel layer にします。 |

## 同梱 samples

`public/avatar/sample.psd` は procedural に描画した motion-mode demo です。
`scripts/draw_doodle_parts.py` が描画した 10 個の透明 PNG part を、
`scripts/build-doodle-sample.mjs` が組み立てています。PSD は固定の 1024x1536
canvas を使い、bottom-to-top で次の flat layer 名を持ちます。

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

再生成コマンドは次の通りです。

```bash
uv run --with pillow python scripts/draw_doodle_parts.py local-assets/doodle-parts
npm run build:doodle-sample
```

static PSDTool 記法の demo は `public/avatar/sample-static.psd` です。
レイヤーツリー、radio、forced visibility、role assignment の挙動を確認したい場合は、
**Settings -> Visual -> PSD avatar** からこのファイルを読み込んでください。
確認済みのレイヤーツリーは次の通りです。

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

`口` と `目` の group は radio item を示します。`!body` は forced visibility を
示します。再生成コマンドは次の通りです。

```bash
npm run generate:static-sample
```

`sample-static.psd` は `face`, `eyewhite`, `irides`, `eyelash`, `mouth_open`,
hair layer などの flat な Anime2.5DRig part を持たないため、motion detector では
不採用になります。rig smoke check では `!body` が未知の layer として報告され、
eye と mouth anchor も不完全になるため、アプリが static mode を使うのは正しい
挙動です。
