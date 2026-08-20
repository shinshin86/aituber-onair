# Node Inochi2D ニュースデスク

入力文書から、Inochi2D の司会者が話す1080x1920のチャプター付きニュース
動画を生成する例です。Core chat / Core Agent SDK、音声、RMS 口パク、Node
canvas のオーバーレイ、ffmpeg の流れは他の Node newsdesk 例と共通です。
アバターは、隣接する `react-inochi2d-app` の未改変 WebAssembly bridge を
headless Chromium 内で描画します。

## 必要なもの

- Node.js 22 以上
- `PATH` 上の ffmpeg / ffprobe
- Playwright 用 Chromium
- このリポジトリ内の `react-inochi2d-app/public/inochi2d` 一式
- `hello-newsdesk.json` のみ、`127.0.0.1:10101` の AivisSpeech

```bash
npm install
npx playwright install chromium
npm run build
```

サンプルは sibling の runtime、Aka モデル、motion を台本相対パスで参照し、
この例へコピーも変更もしません。

## サンプルを描画する

外部音声サービスが不要な決定的 sine サンプル:

```bash
npm run gen -- \
  --script samples/hello-sine.json \
  --output work/hello-sine.mp4
```

それ以前の仮想フレームを順に進めて45フレーム目だけを書き出す例:

```bash
npm run gen -- \
  --script samples/hello-sine.json \
  --frame 45 \
  --png work/frame45.png
```

AivisSpeech 起動時は `samples/hello-newsdesk.json` が Mao の speaker
`888753760` を使います。全フィールドは
[docs/script-format.md](docs/script-format.md) を参照してください。

## 描画の仕組み

runtime bridge は独自の rAF ループを持ち、`performance.now()`、
`Date.now()`、`Math.random()` を参照します。bridge を import する前に、
harness がこれらを仮想時計と `blinkSeed` で初期化した mulberry32 RNG に
置き換えます。各 `renderFrame` は仮想時間を正確に `1 / 30` 秒進め、bridge
の rAF キューを1回 flush し、描画1回と次フレーム予約1件を検証します。

音声 RMS は React 例と同じ候補順で `Mouth:: Shape` vec2 を駆動し、瞬きは
`setEyeBlinkValue` を優先します。`original_idle_calm_breath` をループし、
`motion.intensity` を重みとして使います。既定カメラは React 例と同じ
縦動画向け既定カメラは `scale: 0.65`、`x: 0`、`y: 1450` です。React 例の
model-space offset を維持しつつ、より近い構図にしています。Node 側で透明スクリーンショットへ
背景、チャプター、字幕を合成し、RGBA を ffmpeg へ渡します。

CLI の `averageMsPerFrame` が実測ブラウザ描画時間です。ハードウェアと
Playwright の描画モードに依存するため、固定ベンチマーク値ではありません。
検証時の SwiftShader 描画は103フレーム平均で219.2 ms/frameでした。

## Aka のクレジット

この例は `react-inochi2d-app` に同梱された派生 Aka ファイルを参照します。

- Title: Aka
- Author: seagetch
- Source: https://github.com/Inochi2D/example-models
- License: Creative Commons Attribution 4.0 International
- License URL: https://creativecommons.org/licenses/by/4.0/

参照ファイルは `Aka.original-rig.inx` と `Aka.original.motion.json` です。
この同梱版は AITuber OnAir Inochi2D 例向けに調整されています。変更点は、
ブラウザ描画向け rig 調整、アバター動作用 helper rig、idle motion の調整、
`public/inochi2d/manifest.json` による motion metadata 設定です。元モデルの
クレジットとライセンスは sibling の `Aka.ATTRIBUTION.md` に保持されています。

## 検証

```bash
npm run fmt
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

E2E はリポジトリ内の Aka を2回描画し、timings JSON、H.264/AAC 構造、口の
閉開フレームを確認します。MP4 の byte-stable 性は WebGL / ffmpeg 環境に
依存するため、仮定せず検証マシン上の実測結果を報告します。
