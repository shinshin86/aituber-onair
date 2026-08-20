# Node PSD ニュースデスク

[English](./README.md)

この AITuber OnAir Core サンプルは、ソーステキストをチャプター付きの日本語
ニュース動画へ変換します。Core のチャットプロバイダーでレビュー可能な JSON
台本を生成し、Core の `VoiceEngineAdapter` またはローカルテスト音源で音声を
作り、静的 PSDTool 合成または Anime2.5DRig WebGL motion を選択して、
チャプターラベルと字幕入りの縦型 H.264/AAC MP4 を出力します。

```text
ファイル、標準入力、URL
  -> Core chat / Core Agent SDK
  -> script.json + analysis.json（確認）
  -> Core voice / sine / macOS say
  -> 自動判定 -> Anime2.5DRig motion または静的 PSDTool fallback
  -> 音声口パク + 決定論的な motion / まばたき
  -> ffmpeg -> 1080x1920 MP4（確認）
```

2つの確認工程は意図的です。レンダリング前に事実と数値を確認し、公開前に
完成動画を最後まで確認してください。X や YouTube への自動投稿は行いません。

## 必要環境

- Node.js 22 以降と npm
- `PATH` 上の `ffmpeg` と `ffprobe`
- `auto` 判定と motion mode 用に Playwright からインストールした Chromium
- 既定の `codex-sdk` 用の ChatGPT サインイン、または API プロバイダー用の
  API キー
- 任意: 同梱の「まお」サンプルを使う場合は
  `http://127.0.0.1:10101` で動作する AivisSpeech

決定論的な `sine` エンジンには音声サービスが不要です。`say` は macOS 専用の
スモークテスト向けであり、公開用のナレーションには適しません。

## セットアップ

```sh
npm install
npx playwright install chromium
npm run build
```

既定プロバイダーを使う場合は、最初に `codex login` でサインインします。
利用側アプリが `@openai/codex-sdk` をインストールし、Core は `codex-sdk`
プロバイダーを選択したときだけ動的に読み込みます。

## 台本を生成する

```sh
npm run script-gen -- article.txt \
  --focus "料金を中心に" \
  --output work/article.json
```

入力はローカルファイル、標準入力を表す `-`、HTTP(S) URL に対応します。URL
からは Readability で記事本文を抽出します。既定の `codex-sdk` はローカルの
ChatGPT サインインを使うため API キーは不要です。API キーを使う
プロバイダーも選択できます。

```sh
export OPENAI_API_KEY="..."
# または ANTHROPIC_API_KEY / GEMINI_API_KEY

npm run script-gen -- article.txt \
  --provider openai \
  --output work/article.json
```

`--dry-run` はプロバイダーを呼ばずに、正規化したソースと最終プロンプトを
表示します。

```sh
npm run script-gen -- tests/fixtures/CHANGELOG.md \
  --focus "0.49.0" \
  --dry-run
```

台本と隣接する `<名前>.analysis.json` が出力されます。両方を確認してから
レンダリングしてください。

## 動画を生成する

音声サービス不要のサンプルは、native canvas パッケージと ffmpeg が使える
環境で実行できます。

```sh
npm run gen -- \
  --script samples/hello-sine.json \
  --output work/hello-sine.mp4
```

AivisSpeech サンプルは「まお」の speaker/style ID `888753760` を使います。

```sh
npm run gen -- \
  --script samples/hello-newsdesk.json \
  --output work/hello-newsdesk.mp4
```

motion sample は、隣接する React example の procedural な motion 対応 PSD を
コピーせずに参照します。

```sh
npm run gen -- \
  --script samples/hello-sine-motion.json \
  --output work/hello-sine-motion.mp4

npm run gen -- \
  --script samples/hello-newsdesk-motion.json \
  --output work/hello-newsdesk-motion.mp4
```

追加モード:

```sh
# 音声と timing/config ファイルだけを作成
npm run gen -- --script samples/hello-sine.json --output work/hello.mp4 --dry-run

# 既存 WAV と解決済み config から再レンダリング
npm run gen -- --script samples/hello-sine.json --output work/hello.mp4 --render-only

# 順番にシミュレーションした1フレームを PNG 出力
npm run gen -- --script samples/hello-sine.json --frame 45 --png work/frame45.png
```

台本内のパスは台本ファイル基準、`--output` はカレントディレクトリ基準です。
台本では `.psd` アバター、任意のロール上書き、音声エンジンとオプション、背景、
配置、固定のまばたき seed、3〜12行のナレーションを指定します。各行には字幕、
発音調整用の `reading`、チャプターラベル、後続 pause を設定できます。完全な
定義は [`script.json` フォーマット](./docs/script-format.md)を参照してください。

## PSD モード

描画モードは2つとも第一級です。既定の `avatarMode: "auto"` は最初に
Anime2.5DRig rigger を実行し、正規化された `face` part があれば motion mode、
対象外なら静的 PSDTool mode に fallback します。`avatarMode: "static"` は
Chromium を起動せず、既存の pure Node Canvas 2D renderer を使います。
`avatarMode: "motion"` は利用可能な rig を必須とし、対象外 PSD では rigger の
診断文をそのまま表示して停止します。

## 静的 PSDTool モード

Node レンダラーは `react-psd-app` の静的 PSDTool 経路を再現します。各ピクセル
レイヤーを `@webtoon/psd` で一度だけデコードし、表示レイヤーを Canvas 2D で
下から上へ、親グループの不透明度も含めて描画します。

| 記法 | 対応 | 動作 |
|---|---:|---|
| 先頭の `!` | 対応 | PSD で非表示でも強制表示します。 |
| 先頭の `*` | 対応 | ラジオ項目。同じ親の表示項目を1つにします。 |
| `:flipx`, `:flipy`, `:flipxy` | 解析のみ | 表示名から除去しますが反転描画しません。 |

初期表示では、同じ兄弟集合のうち最初に表示されているラジオ項目だけを残します。
口と目のロールは React サンプルと同じヒントで自動検出します。

| ロール | グループ名ヒント | レイヤー名ヒント |
|---|---|---|
| `mouthOpen` | `口`, `mouth`, `くち` | `開`, `あ`, `open` |
| `mouthClosed` | `口`, `mouth`, `くち` | `閉`, `ん`, `close`, `むっ` |
| `eyesOpen` | `目`, `eye`, `め` | `開`, `open` |
| `eyesClosed` | `目`, `eye`, `め` | `閉`, `close`, `つぶり` |

別の命名規則では、ピクセルレイヤーの正確なパスを指定します。

```json
{
  "avatarRoles": {
    "mouthOpen": "Face/Mouth/Open",
    "mouthClosed": "Face/Mouth/Closed",
    "eyesOpen": "Face/Eyes/Open",
    "eyesClosed": "Face/Eyes/Closed"
  }
}
```

自動検出と上書きのどちらでも全ロールを解決できなければ、レイヤーツリーを表示して
停止します。正規化 RMS が `0.45` 以上なら `mouthOpen`、未満なら
`mouthClosed` を表示します。

小さな呼吸上下動とロールは動画フレーム専用の変換で、
`motion.intensity` の `0` で無効化できます。

静的モードの制限は `react-psd-app` と同じです。PSB は非対応、既知の正常入力は
通常ピクセルレイヤーを持つ8-bit RGB PSD です。通常以外のブレンドモードは通常の
アルファ合成として描画し、レイヤー/ベクターマスク、クリッピングマスク、調整・
エフェクト、PSDTool faview/simple-view メタデータ、`:flip*` の実描画には
対応しません。

同梱の `assets/sample-static.psd` はミコ PNGTuber 画像から生成されています。
`口`、`目`、`!body` のツリーでラジオロールと強制表示を確認できます。隣接する
React PNGTuber サンプルから決定的に再生成するには `npm run generate:sample-psd`
を実行します。`!body` はキャンバス全体、口と目のロールは差分領域に余白を足した
部分だけを持ちます。この切り抜きにより、キャンバス全体を覆う一方のロールが他方を
隠すことなく、口と目のグループを独立して切り替えられます。

## Anime2.5DRig motion mode

motion mode は headless Chromium を使い、次の sibling source を read-only で
bundle します。

- `react-psd-app/src/vendor/anime25drig/rigger.js`
- `react-psd-app/src/lib/rig/anime25Rig.ts`
- `react-psd-app/src/lib/rig/anime25Renderer.ts`

harness は renderer bundle より先に seeded virtual clock を導入し、
`requestAnimationFrame`、`cancelAnimationFrame`、`performance.now`、
`Date.now`、`Math.random` を置き換えます。各出力フレームでは renderer が公開する
audio `mouthOpen` 入力を設定し、仮想時刻を進め、現在の rAF callback を正確に1回
flush し、次の callback が1件だけ queue されたことを確認します。idle sway、呼吸、
random motion、mesh physics は有効なまま再現可能になります。
`motion.intensity` は renderer へ渡され、motion 側では `0` から `2` です。

sibling renderer は目の開閉を直接設定する API を公開していません。そのため
motion mode では Node の `eyesClosed` schedule を使わず、内蔵 blink automation を
維持します。時刻と乱数を `blinkSeed` から固定するため、まばたきも決定論的です。
static mode は従来どおり Node schedule で目を直接切り替えます。

motion sample は `../../react-psd-app/public/avatar/sample.psd` を参照します。
この PSD は React example が procedural に生成した配布可能な素材で、この package
にはコピーしません。

## 検証

```sh
npm install
npx playwright install chromium
npm run fmt
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

常時 E2E は `dist/gen.cjs` から static / motion の両方を描画し、ffprobe で
H.264/AAC、1080x1920 PNG、motion の口・idle pixel 差分を確認します。motion は
同じ入力を連続2回描画して timings JSON と MP4 MD5 も比較します。

## 素材利用条件とクレジット

Anime2.5DRig 互換 auto-rigging と renderer のクレジットは次のとおりです。

- Project: [Anime2.5DRig](https://github.com/852wa/Anime2.5DRig)
- Author: 852wa (hakoniwa)
- Copyright: Copyright (c) 2026 hakoniwa
- License: MIT License
- Upstream commit: `d48825867acd081de22b0e7b5585bb562288796d`

この example は vendored sibling rigger と renderer を read-only で import し、
コピーしません。sibling の `public/avatar/sample.psd` は procedural に生成された
license-clean な素材です。

同梱のミコ由来 PSD アバターの著作権表記は © Yuki Shindo (AITuber OnAir) です。
このアバターはリポジトリの MIT License 対象外です。作品・コンテンツの一部
として一体で再配布できますが、素材単体・素材集としての再配布は禁止です。
正式な日本語ガイドラインへのリンクは
[Miko Asset Terms](./MIKO_ASSET_TERMS.md)を参照してください。

第三者の音声モデルを使う場合は、公開・収益化の前に利用規約を確認してください。
