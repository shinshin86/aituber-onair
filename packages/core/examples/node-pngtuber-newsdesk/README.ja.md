# Node PNGTuber ニュースデスク

[English](./README.md)

この AITuber OnAir Core サンプルは、ソーステキストをチャプター付きの日本語
ニュース動画へ変換します。Core のチャットプロバイダーでレビュー可能な JSON
台本を生成し、Core の `VoiceEngineAdapter` またはローカルテスト音源で音声を
作り、音声 RMS と決定論的なまばたきに合わせて4状態の PNGTuber 画像を選び、
チャプターラベルと字幕入りの縦型 H.264/AAC MP4 を出力します。

```text
ファイル、標準入力、URL
  -> Core chat / Core Agent SDK
  -> script.json + analysis.json（確認）
  -> Core voice / sine / macOS say
  -> 2値 RMS 口パク + 決定論的なまばたき + canvas フレーム
  -> ffmpeg -> 1080x1920 MP4（確認）
```

2つの確認工程は意図的です。レンダリング前に事実と数値を確認し、公開前に
完成動画を最後まで確認してください。X や YouTube への自動投稿は行いません。

## 必要環境

- Node.js 22 以降と npm
- `PATH` 上の `ffmpeg` と `ffprobe`
- 既定の `codex-sdk` 用の ChatGPT サインイン、または API プロバイダー用の
  API キー
- 任意: 同梱の「まお」サンプルを使う場合は
  `http://127.0.0.1:10101` で動作する AivisSpeech

決定論的な `sine` エンジンには音声サービスが不要です。`say` は macOS 専用の
スモークテスト向けであり、公開用のナレーションには適しません。

## セットアップ

```sh
npm install
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
台本では4画像のアバターディレクトリ、音声エンジンとオプション、背景、配置、
固定のまばたき seed、3〜12行のナレーションを指定します。各行には字幕、
発音調整用の `reading`、チャプターラベル、後続 pause を設定できます。完全な
定義は [`script.json` フォーマット](./docs/script-format.md)を参照してください。

アバターディレクトリには次の4ファイルが必要です。

- `mouth_close_eyes_open.png`
- `mouth_close_eyes_close.png`
- `mouth_open_eyes_open.png`
- `mouth_open_eyes_close.png`

4枚は同じキャンバスサイズ、透過背景で用意してください。独自アバターへ差し替える
場合もファイル名は維持します。互換画像の生成・位置合わせはリポジトリの
[`create-pngtuber-avatar-states`](../../../../skills/create-pngtuber-avatar-states/SKILL.md)
スキルを参照してください。

正規化 RMS が `0.45` 以上なら口開き画像を選ぶため、同梱 sine fixture で
開閉が明確に交互表示されます。決定論的な呼吸上下動と小さなロールは動画専用の
追加モーションです。`motion.intensity` で調整し、`0` で無効化できます。

## 検証

```sh
npm install
npm run fmt
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

E2E テストは `dist/gen.cjs` から実際に動画を生成し、ffprobe で H.264/AAC、
1080x1920 PNG を確認します。同じ sine 音声を `--render-only` で再生成した
MP4 の MD5 が一致することも検証します。

## 素材利用条件とクレジット

同梱のミコアバターの著作権表記は © Yuki Shindo (AITuber OnAir) です。
このアバターはリポジトリの MIT License 対象外です。作品・コンテンツの一部
として一体で再配布できますが、素材単体・素材集としての再配布は禁止です。
正式な日本語ガイドラインへのリンクは
[Miko Asset Terms](./MIKO_ASSET_TERMS.md)を参照してください。

第三者の音声モデルを使う場合は、公開・収益化の前に利用規約を確認してください。
