# Node Live2D ニュースデスク

入力資料から、Cubism 4 Live2D キャラクターが出演する縦型 1080x1920
ニュース動画を生成する例です。`node-vrm-newsdesk` と同じ Core chat / Agent
SDK の台本生成、Core `VoiceEngineAdapter` のナレーション、RMS 口パク、決定的な
まばたき、Node canvas のテロップ合成、ffmpeg を使い、アバターだけを PixiJS と
`pixi-live2d-display-lipsyncpatch` の headless Chromium ハーネスで描画します。

## 前提条件

- Node.js 22 以上
- `PATH` 上の ffmpeg / ffprobe
- Playwright Chromium（`npx playwright install chromium`）
- 利用許諾を確認した Cubism 4 `.model3.json` と参照先一式
- ローカルの `live2dcubismcore.min.js`

```bash
cd packages/core/examples/node-live2d-newsdesk
npm install
npx playwright install chromium
npm run build
```

## Live2D の必要ファイル

[Live2D 公式ダウンロードページ](https://www.live2d.com/sdk/download/web/)
から Cubism SDK for Web を、使用許諾を確認・同意したうえで取得し、同梱の
`Core/live2dcubismcore.min.js` を使います。Core を直リンクしないでください。
Cubism Core とモデルにはそれぞれのライセンスがあるため、このリポジトリには
どちらも同梱しません。

台本の次の 2 項目をローカルファイルへ向けます。

```json
{
  "avatar": "/path/to/live2d_models/model/runtime/model.model3.json",
  "cubismCore": "/path/to/CubismSdkForWeb/Core/live2dcubismcore.min.js"
}
```

台本相対パス、絶対パス、`~/` 始まりのパスを使用できます。この例の中へ置く
場合は `models/` と `vendor/live2dcubismcore.min.js` が gitignore 済みです。
隣接する React 例の `public/scripts/live2dcubismcore.min.js` も gitignore 済みで、
明示的なパスを指定すれば利用できます。

Hiyori は Live2D のサンプルキャラクターです。Hiyori を使った動画を公開する場合は
[無償提供マテリアルの使用許諾契約書](https://www.live2d.com/eula/live2d-free-material-license-agreement.html)
と
[Live2D Cubism サンプルデータ利用条件](https://www.live2d.com/eula/live2d-sample-model-terms.html)
の両方を確認し、利用者・事業者区分ごとの条件や必要な著作権表示に従ってください。

## 動画生成

コミット済みサンプルのファイルパスは意図的なプレースホルダーです。サンプルを
gitignore 済みの `work/` にコピーし、手元のパスへ直してから描画します。

```bash
mkdir -p work
cp samples/hello-sine.json work/my-live2d-sine.json
npm run gen -- --script work/my-live2d-sine.json \
  --output work/my-live2d-sine.mp4
```

AivisSpeech 版は Core の `VoiceEngineAdapter` 経由で Mao（`888753760`）を使います。

```bash
npm run gen -- --script work/my-live2d-newsdesk.json \
  --output work/my-live2d-newsdesk.mp4
```

`--dry-run` は音声とタイミング・設定だけを作り、アバターを描画しません。
`--render-only` は作成済み WAV と `*.live2d-gen.config.json` を再利用します。
単一フレームは次のように取得できます。

```bash
npm run gen -- --script work/my-live2d-sine.json \
  --output work/frame-source.mp4 --frame 45 --png work/frame45.png
```

## 台本生成

ファイル、URL、標準入力から厳格なスキーマのニュース台本を生成できます。

```bash
npm run script-gen -- tests/fixtures/CHANGELOG.md --dry-run
npm run script-gen -- tests/fixtures/CHANGELOG.md \
  --provider codex-sdk --output work/release-news.json
```

`codex-sdk` は利用側ランタイムで OpenAI Codex SDK の導入と認証が必要です。
`openai`、`claude`、`gemini` は各環境変数を使います。生成台本にはライセンス上安全な
ローカルパスのプレースホルダーが入り、描画前に利用者が置き換えます。

厳格な JSON 形式は [docs/script-format.md](docs/script-format.md) を参照してください。

## アバター設定

- `avatarLayout` は Chromium の透明フレーム全体を Node 側で拡大・配置します。
- `avatarFraming.scale` / `x` / `y` は取得前の Pixi モデル変換です。縦型ニュース構図の
  バストアップ構図の既定値は `2.5` / `0.5` / `0.4` です。
- `avatarMotion.idle` は Live2D のモーショングループを指定します。決定的にするため
  index 0 を固定し、未指定なら存在する `Idle` グループを使います。
- `avatarWarmupSeconds` はフレーム 0 より前に撮影せずモデルを安定させる時間です。
  `0`〜`30` 秒を指定でき、既定値は `3` です。動画冒頭に pose のパーツ切り替えや
  Idle モーションのクロスフェードが映り込むのを防ぎます。
- `motion.intensity` は固定ステップの更新速度を `0`〜`3` で変えます。`0` でも
  RMS 口パクとスケジュール済みまばたきは動作します。

## 描画の仕組み

Node は一時的な loopback ポートで、ビルド済みハーネス、指定した Cubism Core、
model3.json の親ディレクトリ以下だけを配信します。パストラバーサルとシンボリック
リンクによる脱出を拒否します。

ページは Cubism Core を先に読み、Cubism 4 レンダラーを動的 import して
`autoUpdate: false` でモデルを生成します。各フレームで固定 delta の内部更新を
先に進め、その後 RMS を最初に見つかった口開閉パラメータへ、seed 付きまばたきを
`ParamEyeLOpen` / `ParamEyeROpen` へ直接書きます。ライブラリの自動まばたきは
無効です。Idle の再開は通常の motion manager を使いつつ、ランダム選択ではなく
index 0 に固定します。

モデルと固定した Idle モーションの読み込み後、既定では 3 秒分の固定ステップ更新を
スクリーンショットを撮らずに進めます。これにより pose のフェード、physics、最初の
モーションのクロスフェードをフレーム 0 より前に収束させます。この処理は MP4 の
フレーム数や時間を増やしません。解決済みの秒数は設定 sidecar に、warm-up の診断値は
描画サマリーに記録されます。

Chromium の透明 PNG を Node が背景・チャプター・字幕と合成し、RGBA を ffmpeg に
渡して H.264/AAC MP4 にします。依存は `react-live2d-app` と同じ PixiJS `^7.4.3`
および `release/v0.5.0-ls-7-noMaskFix` 固定 ref です。

## テスト

```bash
npm run fmt
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

単体テストは偽フレームソースを使うため、プロプライエタリファイルは不要です。E2E は
`LIVE2D_CORE_PATH` と `LIVE2D_MODEL_PATH` を読みます。既定では隣接 React 例の
Core と、現在ユーザーの Documents 内の Hiyori を探し、どちらかがなければ理由を
表示して skip します。ファイルをダウンロードしたり同梱したりはしません。
