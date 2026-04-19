# Live2D Chat

`@aituber-onair/core` を使った React 製のサンプルです。`models/`
フォルダ配下の Live2D モデルを読み込み、`@aituber-onair/core` が
生成した音声を再生して口パクを動かします。

## このサンプルでできること

- LLM / TTS の設定 UI を内蔵
- `models/` フォルダ配下の Live2D モデルを読み込み
- モデルファイルはメモリ内だけで扱い、アプリ固有の永続保存をしない
- アバターステージ上でドラッグ移動、ホイールズーム
- `@aituber-onair/core` が生成した音声を使った口パク

## Live2D アセットの置き場所

このサンプルには Live2D アセットは含まれていません。手元のモデルは
`packages/core/examples/react-live2d-app/models/<モデル名>/` に配置して
ください。

あわせて Cubism Core ランタイムを次に配置してください。

- `packages/core/examples/react-live2d-app/public/scripts/live2dcubismcore.min.js`

`live2dcubismcore.min.js` はこのリポジトリには同梱していません。
Live2D のライセンスに従い、利用者自身が Live2D 公式サイトから
`Cubism Core for Web` または `Cubism SDK for Web` をダウンロードし、
展開後に含まれている `live2dcubismcore.min.js` を上記パスへ配置して
ください。

- ダウンロードページ:
  https://www.live2d.com/sdk/download/web/
- 参考:
  https://docs.live2d.com/cubism-sdk-manual/cubism-core/
  https://docs.live2d.com/cubism-sdk-manual/cubism-sdk-for-web/

このサンプルは Cubism 4 系を前提としているため、`live2d.min.js` は不要です。

選択するのは `.model3.json` 単体ではなく、そのファイルと参照先アセット一式を含むフォルダ全体です。

例:

```text
packages/core/examples/react-live2d-app/models/Hiyori/
├── Hiyori.model3.json
├── Hiyori.moc3
├── Hiyori.physics3.json
├── textures/
│   ├── texture_00.png
│   └── texture_01.png
└── motions/
    └── idle.motion3.json
```

```text
packages/core/examples/react-live2d-app/public/scripts/
└── live2dcubismcore.min.js
```

## セットアップ

```bash
cd packages/core/examples/react-live2d-app
npm install
npm run dev
```

起動後に `http://localhost:5173` を開き、`設定` から次を行います。

1. LLM / TTS の設定値
2. `models/` フォルダに置いたモデルがあれば一覧から選んで
   `読み込む` を押す

## 補足

- Live2D モデル自体は同梱していません
- `live2dcubismcore.min.js` も同梱していません
- モデルデータはメモリ保持のみで、リロードすると消えます
- `models/` 配下の一覧は起動時に解決されるため、モデルを追加した場合は
  dev サーバーの再起動が必要です
- Live2D 描画には `pixi-live2d-display-lipsyncpatch` を利用しています
