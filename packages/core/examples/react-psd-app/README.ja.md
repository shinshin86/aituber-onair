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

対応 PSD 形式、motion/static の判定、Anime2.5DRig レイヤー名、
PSDTool 記法、制限、troubleshooting は
**[PSD-FORMATS.ja.md](./PSD-FORMATS.ja.md)** を参照してください。

同梱サンプルは次のコマンドで再生成できます。

```bash
npm run generate:sample-psd
```

生成には dev-only の `ag-psd` を使います。実行時の PSD 読み込みは
`@webtoon/psd` を使います。

## PSD modes

アプリはまず vendored Anime2.5DRig 互換 rigger で motion auto-rig 判定を行います。
必須 part、anchor、rigger check をすべて満たした場合だけ motion mode になります。
それ以外の PSD は static PSDTool mode に fallback します。

static mode は PSDTool 風の `!` 強制表示、`*` radio item、口と目の role
自動検出に対応しています。同梱の `public/avatar/sample.psd` は static PSDTool
sample です。

motion 関連の設定は **Settings -> Visual** にあります。

| 設定 | 挙動 |
|---|---|
| `PSD motion` | motion-mode PSD の idle motion、まばたき、physics を有効/無効化します。 |
| `Motion intensity` | idle sway、呼吸、髪揺れの強さを `0.0` から `2.0` で調整します。 |
| `Avatar view reset` | アバターの表示位置と拡大率を `{ x: 0, y: 0, scale: 1 }` に戻します。 |

ホイールズームはアバター自身の中心を基準に拡大縮小します。位置を変える操作は
ドラッグだけです。offset は clamp されるため、アバターが完全に画面外へ消えて
復帰できなくなることはありません。

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
