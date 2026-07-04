# Inochi2D Chat

`@aituber-onair/core` を使った React サンプルアプリです。Inochi2D
アバターをフルスクリーンのステージに表示し、音声合成の再生に合わせて
リップシンクします。チャット、配信コメント、画面認識、設定 UI は既存の
`packages/core/examples` 配下の React サンプルと同じ形式に揃えています。

## 主な機能

- ビルド済みの Inochi2D ランタイム bridge を使った WebGL 表示
- ローカル `.inx` / `.inp` ファイルの一時読み込み
- `public/inochi2d/manifest.json` によるモデル登録
- ドラッグ、ホイールズーム、ダブルクリックで表示リセット、タップ/フリック反応
- TTS 再生中のリップシンクと、対応ランタイムでの speaking 表情適用
- LLM / TTS / screen vision / 配信コメント設定は既存サンプルと同じ形式

## ランタイムとアセット

Inochi2D ランタイムは以下に配置しています。

```txt
packages/core/examples/react-inochi2d-app/public/inochi2d/runtime/
├── inochi2d.js
├── inochi2d_bg.wasm
├── inochi_bridge.js
├── secondary_motion.js
└── THIRD-PARTY-NOTICES.md
```

これらは Inochi2D ランタイムのビルド済みブラウザ向け成果物です。このサンプルの
ビルド出力として扱ってください。アプリは実行時にこれらを読み込むため、手作業で
直接編集しないでください。ランタイムを再生成する場合は、`public/inochi2d/runtime/`
配下の生成物だけを差し替えてください。

wasm ランタイム(`inochi2d_bg.wasm` と wasm-bindgen glue の `inochi2d.js`)は
Rust 製で、Inochi2D 公式の Rust 実装である
[Inox2D](https://github.com/Inochi2D/inox2d)(BSD 2-Clause)などの
オープンソース Rust クレートを静的リンクしています。必要なライセンス表記は
バイナリと同じ場所の
[`public/inochi2d/runtime/THIRD-PARTY-NOTICES.md`](./public/inochi2d/runtime/THIRD-PARTY-NOTICES.md)
に同梱しています。ランタイムを再配布する場合は、このファイルも一緒に
配置してください。

このサンプルには初回表示用に Aka Inochi2D モデルを同梱しています。同梱モデルは
以下に配置しています。

```txt
packages/core/examples/react-inochi2d-app/public/inochi2d/models/
├── Aka.ATTRIBUTION.md
├── Aka.original-rig.inx
└── Aka.original.motion.json
```

別の manifest モデルを使う場合は `public/inochi2d/models/` にモデルを配置し、
`public/inochi2d/manifest.json` に登録してください。

```json
{
  "version": 1,
  "runtime": {
    "bridge": "./runtime/inochi_bridge.js",
    "wasm": "./runtime/inochi2d_bg.wasm",
    "maxDevicePixelRatio": 1.25
  },
  "defaultModelId": "aka",
  "models": [
    {
      "id": "aka",
      "name": "Aka",
      "model": "./models/Aka.original-rig.inx",
      "motion": "./models/Aka.original.motion.json",
      "attribution": {
        "title": "Aka",
        "author": "seagetch",
        "license": "Creative Commons Attribution 4.0 International",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        "sourceUrl": "https://github.com/Inochi2D/example-models",
        "changes": "Rig and idle motion adapted for the AITuber OnAir Inochi2D example."
      },
      "camera": {
        "x": 0,
        "y": 1450,
        "scale": 0.32
      }
    }
  ]
}
```

任意項目の `camera` は、そのモデルの初期表示位置を指定します。`scale` が
ズーム倍率、`x` / `y` はモデル空間での移動量です(`y` を正にするとモデルが
画面下方向へ移動します)。同梱の Aka は VRM サンプルに近いバストアップ表示に
しています。`camera` 未指定のモデル(ローカル `.inx` / `.inp` 読み込みを含む)
は従来の引きの全身表示になります。ドラッグで移動、ホイールでズーム、
ダブルクリックでこの初期表示にリセットできます。

追加で別モデルを確認する場合は、設定画面からローカルの `.inx` または `.inp`
ファイルを選択できます。この場合は別ファイルの motion JSON を紐づけないため、
motion が必要なモデルは manifest に登録してください。

## 同梱モデルのクレジット

同梱している Aka モデルは、Inochi2D example model `Aka` の派生版です。

- 作品名: Aka
- 作者: seagetch
- 出典: https://github.com/Inochi2D/example-models
- ライセンス: Creative Commons Attribution 4.0 International
- ライセンス URL: https://creativecommons.org/licenses/by/4.0/
- 変更点: AITuber OnAir Inochi2D サンプル用に rig と idle motion を調整

モデルファイルと一緒に配布する attribution notice として
`public/inochi2d/models/Aka.ATTRIBUTION.md` も同梱しています。

## 起動方法

```bash
cd packages/core/examples/react-inochi2d-app
npm install
npm run dev
```

Vite が表示した URL を開き、右上の設定ボタンから API key やモデルを設定します。

## ビルド

```bash
npm run build
```

## メモ

- ブラウザ側で WebGL が必要です。
- この追加では公開パッケージの package metadata や version は変更していません。
- Inochi2D ランタイムを更新する場合は、`public/inochi2d/runtime/` 配下の
  生成物だけを差し替えてください。
