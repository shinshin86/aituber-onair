# Node.js Examples

このディレクトリには、Node.js 環境で `@aituber-onair/voice` を使うための
サンプルがあります。

[English README](./README.md)

## ファイル一覧

- **`index.js`** - 基本セットアップ確認
- **`voicevox-example.js`** - VOICEVOX TTS サンプル
- **`aivis-speech-example.js`** - AivisSpeech TTS サンプル
- **`aivis-cloud-example.js`** - Aivis Cloud TTS サンプル
- **`voicepeak-example.js`** - VoicePeak TTS サンプル
- **`openai-compatible-colab-example.js`** - Colab 上の OpenAI 互換 TTS エンドポイント検証サンプル
- **`test-speaker-playback.js`** - 複数エンジンのスピーカー再生テスト

## 事前準備

voice パッケージをビルドします。

```bash
npm -w @aituber-onair/voice run build
```

Node.js で実スピーカー再生も試したい場合は、任意で以下のどちらかを
インストールします。インストールしなくても、音声ファイル保存による検証は
できます。

```bash
npm install speaker
# または
npm install play-sound
```

## Colab OpenAI 互換 TTS の検証

`openai-compatible-colab-example.js` は、Google Colab 上で起動した
OpenAI 互換 TTS サーバーを `@aituber-onair/voice` の
`openaiCompatible` エンジンから呼び出すためのシンプルなサンプルです。

想定しているサーバーは、たとえば
`shinshin86/local-tts-on-google-colab` が `trycloudflare` で発行する
`/v1/audio/speech` エンドポイントです。

### Agent Skill から使う場合

Codex や Claude Code などの AI エージェントから使う場合は、
`$connect-colab-local-tts` を指定して依頼します。エージェントは
Colab MCP Go で Colab に接続し、指定した
`local-tts-on-google-colab` の TTS エンジンを起動し、発行された
`trycloudflare` URL をこの Node.js サンプルへ渡して検証します。

依頼例:

```text
$connect-colab-local-tts を使って、Colab MCP Go 経由で
shinshin86/local-tts-on-google-colab の Irodori-TTS を起動してください。
trycloudflare で外部 URL を発行し、@aituber-onair/voice の Node.js
サンプルから日本語の動作確認テキストで検証してください。
```

サンプル候補としては `Irodori-TTS`、`Piper-Plus`、
`MOSS-TTS-v1.5` などがあります。`MOSS-TTS-v1.5` は通常 A100 クラスの
Colab ランタイムが必要です。

Google ログイン、GPU ランタイム選択、gated model の同意、
Hugging Face token / Colab Secrets 設定などは、必要に応じてユーザー側で
行います。

### 手動で実行する場合

Colab 側でサーバーが起動し、外部 URL が発行されたら、以下のように実行します。

```bash
OPENAI_COMPATIBLE_TTS_URL="https://xxxx.trycloudflare.com/v1/audio/speech" \
OPENAI_COMPATIBLE_TTS_MODEL="Irodori-TTS" \
OPENAI_COMPATIBLE_TTS_VOICE="" \
OPENAI_COMPATIBLE_TTS_TEXT="こんにちは。AITuber OnAir Voice から再生しています。" \
node examples/node-basic/openai-compatible-colab-example.js
```

任意の設定:

```bash
OPENAI_COMPATIBLE_TTS_SPEED="1.0"
OPENAI_COMPATIBLE_TTS_OUTPUT="openai-compatible-colab-output.wav"
OPENAI_COMPATIBLE_TTS_PLAY="0" # 保存のみ。Node.js での再生をスキップ
```

生成された WAV は `packages/voice/examples/node-basic/` 配下に保存され、
`.gitignore` により Git には含まれません。

## トラブルシューティング

### `fetch failed`

- `OPENAI_COMPATIBLE_TTS_URL` が `/v1/audio/speech` まで含んでいるか確認してください。
- `trycloudflare` URL が現在の Colab プロセスを指しているか確認してください。
- Colab ランタイムが停止していないか確認してください。

### 音が鳴らない

- `speaker` または `play-sound` がインストールされているか確認してください。
- まずは `OPENAI_COMPATIBLE_TTS_PLAY=0` で WAV 保存だけを検証してください。
- 保存された WAV を OS 標準のプレイヤーで再生してください。

### モデルや voice で失敗する

- `OPENAI_COMPATIBLE_TTS_MODEL` が Colab サーバー側のモデル ID と一致しているか確認してください。
- voice が不要なエンジンでは `OPENAI_COMPATIBLE_TTS_VOICE=""` のままにしてください。
- voice cloning や gated model を使うエンジンでは、Colab 側の前提設定を確認してください。
