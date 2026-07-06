# PSD 立ち絵 Chat

`@aituber-onair/core` を使った PSD 立ち絵チャットアプリです。
`react-pngtuber-app` と同じ LLM、TTS、ライブコメント、Screen Vision、
口パク、まばたき、グリーンバック、配信用表示を保ちつつ、アバターだけを
1つの PSD ファイルから canvas 合成して表示します。

同梱の `public/avatar/sample.psd` は、このリポジトリ内の PNGTuber サンプル
画像から生成しているため、追加設定なしでアニメーションを確認できます。

## このアプリでできること

- `@aituber-onair/core` が提供する LLM プロバイダでチャット
- PNGTuber example と同じ TTS エンジンと音声出力ベースの口パク
- `@webtoon/psd` で PSD アバターを実行時に読み込み
- 表示状態が変わった時だけ PSD pixel layer を canvas に再合成
- 初回起動時に `public/avatar/sample.psd` を自動読み込み
- Settings から PSDTool 風の forced/radio レイヤー操作
- `mouthOpen`, `mouthClosed`, `eyesOpen`, `eyesClosed` へのレイヤー割り当て
- 日本語/英語のレイヤー名から口・目レイヤーを自動検出
- Anime2.5DRig 互換の PSD レイヤー名から motion mode を自動検出
- 対応 PSD では idle motion、まばたき fallback、髪揺れ、音声連動の口パクを表示
- canvas 上のドラッグ/ホイールズームと Settings からの表示位置リセット
- `${fileName}:${fileSize}` をキーに、表示状態と role 割り当てを
  `localStorage` に保存
- アップロードした PSD の pixel data はメモリ保持のみ。リロード後は同じ
  ファイルを再選択すると保存済み設定を復元

## セットアップ

```bash
cd packages/core/examples/react-psd-app
npm install
npm run dev
```

起動後に **Settings** を開き、APIキーや各種設定を入力してください。
通常のアプリ設定は `react-psd-app-settings` として `localStorage` に保存されます。

## PSD アバター

**Settings → Visual** の **PSD avatar** からローカルの `.psd` ファイルを
選択します。ファイル自体は保存されません。表示状態と role 設定だけが、
そのファイル名とサイズに紐づいて保存されます。

同梱サンプルは次のコマンドで再生成できます。

```bash
npm run generate:sample-psd
```

生成には dev-only の `ag-psd` を使います。実行時の PSD 読み込みは
`@webtoon/psd` を使います。

## auto-rig motion mode

読み込んだ PSD が Anime2.5DRig のレイヤー命名に合う場合、static な
PSDTool 風 renderer ではなく **Motion (auto-rig)** が選択されます。
motion mode では `ag-psd` で pixel layer を読み取り、
`src/vendor/anime25drig/` に vendoring した Anime2.5DRig 互換 rigger を使います。

auto-rig detector は、face、左右の eye、mouth anchor が使えることを要求します。
`eye_close_l` / `eye_close_r` は optional です。存在しない場合は eyelashes を表示したまま、
eye-open layer を閉じ方向に圧縮する blink fallback を使います。

motion 関連の設定は **Settings -> Visual** にあります。

| 設定 | 挙動 |
|---|---|
| `PSD motion` | motion-mode PSD の idle motion、まばたき、physics を有効/無効化します。 |
| `Motion intensity` | idle sway、呼吸、髪揺れの強さを `0.0` から `2.0` で調整します。 |
| `Avatar view reset` | アバターの表示位置と拡大率を `{ x: 0, y: 0, scale: 1 }` に戻します。 |

ホイールズームはアバター自身の中心を基準に拡大縮小します。位置を変える操作は
ドラッグだけです。offset は clamp されるため、アバターが完全に画面外へ消えて
復帰できなくなることはありません。

## auto-rig レイヤー命名

PSD は flat なレイヤー構造にし、次の名前を使います。左右別パーツは `_l` と `_r`
suffix を使います。髪の strand は `front hair_1` のような numbered suffix を使えます。

| Part | 必須 | 補足 |
|---|---:|---|
| `face` | 必須 | 主な face region として anchor に使います。 |
| `eyewhite_l`, `eyewhite_r` | 必須 | 左右の eye mask / 白目として使います。 |
| `irides_l`, `irides_r` | 必須 | eyewhite stencil で切り抜かれる iris layer です。 |
| `eyelash_l`, `eyelash_r` | 必須 | eye-open の eyelash layer です。 |
| `eye_close_l`, `eye_close_r` | 任意 | 存在すると blink 形状がより自然になります。 |
| `mouth_open`, `mouth_close` | 必須 | 音声レベルに応じて cross-fade / 変形します。 |
| `front hair`, `front hair_1`, ... | 任意 | strand data が検出されると髪揺れに使います。 |
| `back hair` | 任意 | 検出されると髪揺れに参加します。 |
| `eyebrow_l`, `eyebrow_r` | 任意 | 目や頭部の変形に追従します。 |
| `nose`, `ears`, `neck`, `topwear`, `bottomwear`, `handwear`, `headwear` | 任意 | 存在する場合は head/body motion の group として描画します。 |

## PSDTool 記法の対応

| 記法 | 対応 | 挙動 |
|---|---:|---|
| 先頭 `!` | 対応 | 強制表示。常に合成され、チェックボックスは表示されません。 |
| 先頭 `*` | 対応 | ラジオ項目。同じ親グループ内の sibling `*` 項目を排他表示します。 |
| `:flipx` | parse のみ | 表示名からは除去しますが、v1 では反転しません。 |
| `:flipy` | parse のみ | 表示名からは除去しますが、v1 では反転しません。 |
| `:flipxy` | parse のみ | 表示名からは除去しますが、v1 では反転しません。 |

表示名は、これらの marker を取り除いたレイヤー名です。

## role 自動検出

読み込み時に、次のパターンでレイヤー/グループ名を探索します。

| Role | グループ名のヒント | レイヤー名のヒント |
|---|---|---|
| `mouthOpen` | `口`, `mouth`, `くち` | `開`, `あ`, `open` |
| `mouthClosed` | `口`, `mouth`, `くち` | `閉`, `ん`, `close`, `むっ` |
| `eyesOpen` | `目`, `eye`, `め` | `開`, `open` |
| `eyesClosed` | `目`, `eye`, `め` | `閉`, `close`, `つぶり` |

4つの割り当ては **Settings → Visual → Role assignment** で上書きできます。

## 制限

v1 renderer は通常の pixel layer 合成だけを対象にしています。読み込んだ PSD に
未対応機能が含まれる場合は、console に一度だけ警告を出します。

- normal 以外の blend mode は parse しますが通常の alpha 合成として描画します
- layer mask / vector mask は無視します
- clipping mask は無視します
- adjustment layer は無視します
- `:flip*` variant は parse しますが反転しません
- この example UI では PSB は未対応です
- PSDTool faview/simple-view metadata は未対応です

グループ表示はネストを考慮します。自分自身と全 ancestor group が表示状態の時だけ、
その node は表示されます。

motion mode は static renderer とは別の auto-rig path です。レイヤー名と anchor を
重視し、必須 anchor や必須 part が使えない場合は static mode に戻ります。
選択された mode と rejection reason は **Settings -> Visual** に表示されます。

## Credits

- Anime2.5DRig 互換の auto-rigging は、852wa (hakoniwa) さんの
  [Anime2.5DRig](https://github.com/852wa/Anime2.5DRig) を元にしています。
  License は MIT です。vendored file は `src/vendor/anime25drig/` にあります。
- 同梱の `public/avatar/sample.psd` は、このリポジトリ内の PNGTuber サンプル画像から
  生成しており、この example に含めて配布できます。

## ライブコメントと Screen Vision

YouTube Live / Twitch のコメント取得と OBS Virtual Camera の Screen Vision は、
PNGTuber example と同じ流れを引き継いでいます。どちらも **Settings** から設定します。

## 口パク調整

`src/hooks/useAudioLipsync.ts` の先頭定数で調整できます。

| 定数 | デフォルト | 説明 |
|---|---|---|
| `SMOOTH_FACTOR` | `0.5` | 平滑化係数。大きいほどなめらか（0.0-1.0） |
| `RMS_CEILING` | `0.12` | RMS の正規化上限。小さいほど敏感に口が開く |
| `MOUTH_LEVELS` | `5` | 口パク段階数。この PSD example では現在 binary open/closed に割り当てます |

## Web Speech API について

- **Chrome / Edge** で動作（推奨: Chrome）
- Firefox, Safari は未対応
- 未対応ブラウザではマイクボタンが無効化
- HTTPS または localhost 環境が必要
