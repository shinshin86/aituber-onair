# Pet Chat

静止画の PNGTuber ではなく、Codex Pet 互換のスプライトシートを動かす
AITuber チャットサンプルです。

基本構造は既存の React core サンプルと同じです。

- `@aituber-onair/core` による LLM チャット
- TTS 再生と音声レベル解析
- Web Speech API による音声入力
- YouTube Live / Twitch コメント取り込み
- **Settings → Screen Vision** から OBS Virtual Camera の1フレームを取得し、
  Vision 対応モデルに送ってコメント
- **Settings → Visual** からグリーンバック背景と、Pet の発話字幕だけを出す
  ソロ配信表示を選択可能
- Comment Intelligence とマンネリ検知

## Screen Vision

OBS Virtual Camera を開始し、**Settings → Screen Vision** で選択してから
**画面を見る** を押すと、現在のフレームを Vision 対応モデルに送信します。
30秒、1分、2分、5分ごとの自動送信も選択できます。

## 配信用表示

**Settings → Visual** から背景をグリーンバックに切り替え、表示モードを
ソロ配信にできます。ソロ配信では通常のチャットログを隠し、Pet の
最新発話だけを下部字幕として表示します。ユーザー入力欄は初期状態では
非表示ですが、同じ Visual 設定から表示できます。

## Pet アニメーション

Pet 素材は次の場所から読み込みます。

```text
public/pet/pet.json
public/pet/spritesheet.webp
```

同梱サンプルは、192x208 セルの 8x9 Codex Pet スプライトシートを使います。
行の意味は次の通りです。

| 行 | 状態 |
| --- | --- |
| 0 | idle |
| 1 | running-right |
| 2 | running-left |
| 3 | waving |
| 4 | jumping |
| 5 | failed |
| 6 | waiting |
| 7 | running |
| 8 | review |

チャット中はアプリの状態に応じて Pet が反応します。

- 応答生成中: review
- 発話中: 音量に応じて waving / jumping
- 嬉しそうな応答: ステージ内を走り回る
- 失敗・謝罪系の応答: failed

## 起動方法

```bash
cd packages/core/examples/react-pet-app
npm install
npm run dev
```

起動後、Settings で LLM / TTS provider を設定してください。
設定は `react-pet-app-settings` として `localStorage` に保存されます。

## Pet の差し替え

Settings の Pet セクションから、別の Codex Pet 互換パッケージを登録
できます。`pet.json` とスプライトシート画像を選択して `登録` を押すと、
ブラウザ内に保存され、次回起動時もその Pet が使われます。

同梱の Miko に戻したい場合は `Mikoに戻す` を押してください。

`pet.json` は次のような形式です。

```json
{
  "id": "miko",
  "displayName": "Miko",
  "description": "A tiny animated pet.",
  "spritesheetPath": "spritesheet.webp"
}
```

開発時にデフォルト素材として差し替える場合は、
`public/pet/pet.json` と `public/pet/spritesheet.webp` を置き換えてください。

生成した Pet やローカル由来の素材をコミットする場合は、再配布できる素材か
確認してください。
