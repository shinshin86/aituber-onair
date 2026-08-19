# Node VRM ニュースデスク

[English](./README.md)

この AITuber OnAir Core サンプルは、ソーステキストをチャプター付きの日本語
ニュース動画へ変換します。Core のチャットプロバイダーでレビュー可能な JSON
台本を生成し、Core の `VoiceEngineAdapter` またはローカルテスト音源で音声を
作り、音声 RMS と決定論的なまばたきに合わせてヘッドレス Chromium 内の VRM
アバターを動かし、チャプターラベルと字幕入りの縦型 H.264/AAC MP4 を出力します。

```text
ファイル、標準入力、URL
  -> Core chat / Core Agent SDK
  -> script.json + analysis.json（確認）
  -> Core voice / sine / macOS say
  -> Playwright + ヘッドレス Chromium の VRM フレーム
  -> RMS 口パク + 決定論的なまばたき + Node canvas オーバーレイ
  -> ffmpeg -> 1080x1920 MP4（確認）
```

2つの確認工程は意図的です。レンダリング前に事実と数値を確認し、公開前に
完成動画を最後まで確認してください。X や YouTube への自動投稿は行いません。

## 必要環境

- Node.js 22 以降と npm
- `PATH` 上の `ffmpeg` と `ffprobe`
- `npx playwright install chromium` でインストールした Chromium
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
台本では `.vrm` アバター、任意の `.vrma` アニメーション、音声エンジンと
オプション、背景、配置、固定のまばたき seed、3〜12行のナレーションを指定します。
各行には字幕、発音調整用の `reading`、チャプターラベル、後続 pause を設定できます。
完全な定義は [`script.json` フォーマット](./docs/script-format.md)を参照してください。

サンプルは隣接する `react-vrm-app` の `miko.vrm` と `idle_loop.vrma` を参照し、
25 MB のモデルをこのサンプルへ重複コピーしません。独自モデルを使う場合は
`avatar` と任意の `avatarAnimation` を差し替えてください。`motion.intensity` は
VRMA の再生速度を `0`〜`3` で調整し、`0` では口パクとまばたきを残してポーズを
固定します。

縦型出力では既定でバストアップのカメラになります。任意の
`avatarFraming.visibleHeightRatio` は小さくするほど寄り、
`avatarFraming.lookAtHeightRatio` は小さくするほどモデルを上へ移動します。
既定値はそれぞれ `0.39` と `0.845` です。これらのカメラ設定の後に、従来どおり
`avatarLayout` の拡大率と比率アンカーが適用されます。

レンダラーは three.js r182 の物理ベース光量単位に合わせた、柔らかい環境光と
指向性キーライトを使います。モデルごとに
`avatarLighting.ambientIntensity` と
`avatarLighting.directionalIntensity` で調整でき、既定値はそれぞれ `1.4` と
`2.35` です。

## 描画の仕組み

Node は TTS、WAV/RMS 解析、まばたき時刻、背景、チャプター、字幕、ffmpeg を
担当します。`127.0.0.1` の一時ポートで HTTP サーバーを起動し、Playwright で
1ページのヘッドレス Chromium を開始します。ページ側は three.js と
`@pixiv/three-vrm` で VRM/VRMA を読み込み、固定時間刻みでアニメーションを進め、
`aa` と `blink` 表情を適用して透過 1080x1920 フレームを描画します。Node は
PNG として取得し、`@napi-rs/canvas` でオーバーレイと合成して RGBA を ffmpeg へ
送ります。

光量単位と VRM ランタイムを再現可能にするため、描画スタックは three.js
`0.182.0`、`@pixiv/three-vrm` `3.4.5`、
`@pixiv/three-vrm-animation` `3.4.5` の組み合わせへ固定しています。

縦型キャンバスのカメラ距離はモデルの表示高を基準にします。横方向の超過を
検出した場合は小さな上限付き安全補正だけを加え、幅広いバインド姿勢によって
ニュース映像が全身構図へ戻ることを防ぎます。

Chromium はまず SwiftShader 指定で起動し、WebGL 初期化に失敗した場合だけ既定 GL
で再試行します。最終 JSON には使用した GL モードとブラウザフレームの平均時間を
出力します。このサンプルの基準レンダリングでは、初回フレームのウォームアップを
含めて `249.2` ms/frame でした。Linux CI では Playwright Chromium とシステム依存が
必要です。権限のある
コンテナでは通常 `npx playwright install --with-deps chromium` を使います。

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

E2E テストは `dist/gen.cjs` から実際に動画を生成し、ffprobe でフレーム数と
H.264/AAC を確認し、非空で変化する 1080x1920 PNG と `--render-only` 前後の
timing 入力一致を検証します。SwiftShader の画素 MD5 は環境間で一致しないため
検証対象にしません。

## 素材利用条件とクレジット

参照するミコ VRM アバターの著作権表記は © Yuki Shindo (AITuber OnAir) です。
このアバターはリポジトリの MIT License 対象外です。作品・コンテンツの一部
として一体で再配布できますが、素材単体・素材集としての再配布は禁止です。
正式な日本語ガイドラインへのリンクは
[Miko Asset Terms](./MIKO_ASSET_TERMS.md)を参照してください。

任意の `idle_loop.vrma` は `react-vrm-app` が
[`pixiv/ChatVRM`](https://github.com/pixiv/ChatVRM) の素材から流用しています。
アニメーション自体を再配布する前にライセンスを確認してください。モデル詳細は
https://miko.aituberonair.com/ を参照してください。

第三者の音声モデルを使う場合は、公開・収益化の前に利用規約を確認してください。
