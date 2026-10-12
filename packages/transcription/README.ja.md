# @aituber-onair/transcription

![@aituber-onair/transcription ロゴ](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/transcription/images/aituber-onair-transcription.png)

[English](./README.md)

AITuber OnAir 向けの、プロバイダーに依存しないマイク文字起こしパッケージです。

> このパッケージはα版です。安定版になるまでに公開 API が変更される可能性が
> あります。

Web Speech、ブラウザ WebRTC を利用する OpenAI Realtime、ブラウザ WebSocket を
利用する Gemini Live、WebGPU でローカル推論する Whisper Tiny、Base、Small に
加え、OpenAI 互換サーバーへのバッチ文字起こしに対応しています。すべてのプロバイダーが、
発話ごとに同じ形式のスナップショット
イベントを発行します。ファイルの文字起こし、サーバー WebSocket入力、チャットへの
自動送信、プロバイダーのフォールバックは、意図的に対象外です。

## ブラウザサンプル

AITuber OnAir Core に依存せず、5つのプロバイダーを試せるフレームワーク非依存の
ブラウザサンプルが含まれています。リポジトリルートで依存関係をインストールした後、
サンプルのディレクトリから起動できます。

```sh
cd packages/transcription/examples/browser-basic
npm run dev
```

リポジトリルートからワークスペースコマンドで起動することもできます。

```sh
npm -w @aituber-onair/transcription run example:dev
```

表示された localhost の URL を開き、セッション開始時にマイクの使用を許可して
ください。Web Speech と Local Whisper にキーは不要です。OpenAI または Gemini を
利用する場合は、エンドユーザー自身が所有する API キーを画面に入力します。サンプルは
選択したサービスへブラウザから直接接続するため、共有端末での利用は避けてください。
Local Whisper には WebGPU が必要で、初回開始時にモデルとランタイムをダウンロード
してブラウザにキャッシュします。画面は日本語・英語を切り替えられ、初期表示には
ブラウザの言語設定が使われます。詳細は
[サンプルの README](https://github.com/shinshin86/aituber-onair/blob/main/packages/transcription/examples/browser-basic/README.md)
を参照してください。OpenAI 互換サーバーでは接続先 URL と任意の API キーを指定します。
ローカルの speech.cpp サーバーにキーは不要です。

サーバーを起動せずにサンプルをビルドするには、次のコマンドを実行します。

```sh
npm -w @aituber-onair/transcription run example:build
```

## 使用方法

```ts
import { createRealtimeTranscriptionSession } from '@aituber-onair/transcription';

const session = createRealtimeTranscriptionSession({
  provider: 'web-speech',
  language: 'ja-JP',
});

session.onTranscript(({ utteranceId, text, isFinal }) => {
  console.log({ utteranceId, text, isFinal });
});

await session.start();
// Later:
await session.stop();
await session.dispose();
```

進捗イベントを発行するのは、時間のかかる初期化を伴うプロバイダーだけです。現在は
`local-whisper` のみが `onProgress` を発行し、Web Speech、OpenAI Realtime、
Gemini Live、OpenAI 互換サーバーは発行しません。

### Local Whisper

Local Whisper は選択した Whisper モデルをモジュールWorker内で実行し、確定結果のみを
発行します。

```ts
import { createRealtimeTranscriptionSession } from '@aituber-onair/transcription';

const session = createRealtimeTranscriptionSession({
  provider: 'local-whisper',
  model: 'tiny',
  language: 'ja-JP',
  silenceDurationMs: 500,
});

session.onTranscript(({ text, isFinal }) => {
  if (isFinal) {
    console.log(text);
  }
});

session.onProgress(({ phase, progress }) => {
  updateLoadingIndicator(phase, progress);
});

session.onError((error) => {
  console.error(error.code, error.message);
});

await session.start();

// Later:
await session.stop();
await session.dispose();
```

Local Whisper の認識精度は Web Speech / OpenAI Realtime より劣ります。APIキーが
不要で、マイク音声を外部サービスへ送信しないことを優先する用途向けです。認識品質が
必要な場合は `small` を選択してください。

| モデル | 進捗で報告された初回DL量 | 品質の目安 | 推論（日本語 / 英語） |
| --- | ---: | --- | ---: |
| `tiny`（既定） | 約122 MB | 低め | 237.3 ms / 203.0 ms |
| `base` | 約209 MB | 中間 | 255.9 ms / 311.2 ms |
| `small` | 約589 MB | 実用品質 | 574.7 ms / 551.6 ms |

Chrome/WebGPUで、同じ短い日本語・英語マイククリップを使って計測しました。推論時間は
音声取得/VADを含まず、GPUによって変わります。初回ダウンロード時間はネットワーク速度に
依存し、数百MBでは数分かかる場合があります。キャッシュ後の初期化は、Tinyで約0.9秒、
Baseで約1.2秒、Smallで約2.5秒でした。ダウンロード量はモデルファイルごとに最後に報告された
`totalBytes` の合計で、進捗を報告しない資産は含みません。

要件と動作は次のとおりです。

- 安全なブラウザコンテキスト（HTTPS または localhost）、マイク権限、Web Audio、
  AudioWorklet、モジュールWorker、WebGPU が必要です。
- API キーは不要です。WebGPU の初期化に失敗しても、リモートプロバイダーや WASM
  推論へ自動的にフォールバックしません。
- 初回利用時に、選択したモデル資産を Hugging Face Hub から、ONNX Runtime
  WebAssemblyファイルを jsDelivr からダウンロードし、ブラウザにキャッシュします。
  初回のダウンロードと推論は、大きいモデルほど時間がかかります。
- マイク音声はブラウザ内で処理され、ブラウザ外へ送信されません。このパッケージは
  音声や文字起こし結果を永続化しません。
- `language` には BCP 47 形式のヒントを任意指定できます。発話終了を判定する
  `silenceDurationMs` の既定値は500msで、最小150msまで下げられます。
- `model` には `tiny`、`base`、`small` を指定でき、既定値は `tiny` です。すべての
  サイズで、モデルのdtypeはfp32 encoderとq4 merged decoderに固定されています。
- ダウンロード進捗には、`file`、`loadedBytes`、`totalBytes` と、0〜1に正規化した
  `progress` が含まれる場合があります。初期化・準備完了フェーズにバイト数は
  必須ではありません。

通常は ESM エントリからの相対URLで `dist/local-whisper.worker.js` を解決します。
パッケージを事前バンドルする環境でこの資産を解決できない場合は、高度な設定である
`workerUrl` に同じモジュールWorker資産または同等のビルドを指定してください。この
ブラウザサンプルでは、そのために Vite の `?worker&url` import を使っています。

### OpenAI 互換サーバー

multipart の音声文字起こしリクエストを受け付け、`{ text: string }` を返すサーバーには
`openai-compatible` を使います。マイクの発話ごとにモノラル 16 kHz PCM16 WAV を
`/v1/audio/transcriptions` へ送り、確定結果のみを発行します。WebGPU と WebSocket
ストリーミングは使いません。

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'openai-compatible',
  baseUrl: 'http://127.0.0.1:8080',
  language: 'ja-JP',
  silenceDurationMs: 500,
  timeoutMs: 30000,
});
```

`baseUrl` には Origin、`/v1` などの API ベース URL、または完全な
`/audio/transcriptions` エンドポイントを指定できます。公開関数
`resolveOpenAICompatibleTranscriptionEndpoint()` で実際の送信先を確認できます。
`model`、`language`、`prompt` は空でない場合だけ送信します。言語ヒントは `ja-JP`
から `ja` に変換されます。ロード済みモデルを既定で使うサーバーではモデルを省略でき、
モデル ID が必須のサーバーでは指定が必要です。

認証が必要な場合は `auth` に `type: 'browser-api-key'`、`getApiKey`、
`acknowledgeBrowserKeyRisk: true` を指定します。コールバックは送信ごとに呼び出されます。
音声とキーは指定したサーバーへ直接送られるため、信頼できる接続先を使ってください。
アプリケーション所有のキーはバックエンドで管理してください。

`stop()` は最後の発話を確定し、待機中の送信が終わるまで待ちます。`dispose()` は進行中の
通信を中断し、待機中の発話を破棄します。送信は発話順に実行します。通信失敗とタイムアウト
は `connection-failed` を通知して次の発話を受け付け、401/403 は
`authentication-failed` を通知して録音を停止します。その他の HTTP エラーは
`provider-error` です。空の結果と Local Whisper の既知の誤認識文は除外します。
タイムアウトは既定で 30 秒、発話終了の無音は既定で 500 ms、最小 150 ms です。

speech.cpp の接続例、CORS、任意の認証、エラーへの対処は
[ローカル STT ガイド](../../docs/local-stt.ja.md)を参照してください。

### OpenAI Realtime

OpenAI Realtime は `gpt-live-transcribe` とブラウザ WebRTC を使用します。この
文字起こしモデルはサーバー側のターン検出を受け付けないため、ブラウザの Web Audio
API で一定時間の無音を検出し、発話ごとに音声を明示的に確定します。推奨する認証方式
では、アプリケーションのバックエンドから短時間だけ有効なクライアントシークレットを
取得します。

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'openai-realtime',
  auth: {
    type: 'client-secret',
    getClientSecret: async () => {
      const response = await fetch('/api/openai/realtime/client-secret', {
        method: 'POST',
      });
      const data = await response.json();
      return data.value;
    },
  },
  languages: ['ja', 'en'],
  keywords: ['AITuber OnAir'],
  prompt: 'An AITuber livestream.',
  delay: 'low',
});
```

フロントエンドのみで動作するセルフホスト型アプリケーションでは、エンドユーザーが
所有する標準 API キーを明示的に使用し、ブラウザ内でクライアントシークレットを
発行することもできます。

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'openai-realtime',
  auth: {
    type: 'browser-api-key',
    getApiKey: async () => readEndUserKeyAtRuntime(),
    acknowledgeBrowserKeyRisk: true,
  },
  languages: ['ja'],
});
```

### Gemini Live

Gemini Live は `gemini-3.5-transcribe-live` を使用し、16bit PCMの生音声をブラウザの
WebSocketからストリーミングします。低遅延の途中結果と、発話ごとの確定結果を発行します。
言語の自動判定、言語ヒント、カスタム語彙、逐語・スマート文字起こしモードに対応します。

推奨するブラウザ認証方式では、アプリケーションのバックエンドから有効期間の短い
Ephemeral Tokenを取得します。

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'gemini-live',
  auth: {
    type: 'ephemeral-token',
    getEphemeralToken: async () => {
      const response = await fetch('/api/gemini/ephemeral-token', {
        method: 'POST',
      });
      const data = await response.json();
      return data.name;
    },
  },
  languages: ['ja-JP', 'en-US'],
  keywords: ['AITuber OnAir'],
  mode: 'smart',
});
```

フロントエンドのみで動作するセルフホスト型アプリケーションでは、エンドユーザーが
所有する API キーを明示的に使って直接接続することもできます。

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'gemini-live',
  auth: {
    type: 'browser-api-key',
    getApiKey: async () => readEndUserKeyAtRuntime(),
    acknowledgeBrowserKeyRisk: true,
  },
  languages: [], // 言語を自動判定
  mode: 'verbatim',
});
```

Gemini Live Transcribe の1接続は現在最大10分です。サーバーから予期せず切断された場合、
このプロバイダーは型付きの接続エラーを発行します。10分を超えて利用するアプリケーション
では、新しいセッションを開始してください。Liveストリーミングでは、話者分離と単語単位の
タイムスタンプを利用できません。現在のプレビュー状況、対応言語、制限、料金へのリンクは
[Gemini Live文字起こしの公式ドキュメント](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe)
を参照してください。

## セキュリティ

OpenAI と Google は、標準 API キーをサーバーに保管し、有効期間の短いブラウザ用
認証情報を発行する方式を推奨しています。ブラウザ BYOK 方式は、信頼できる
フロントエンドのみのアプリケーションやセルフホスト環境向けです。この方式では、
エンドユーザー自身が所有・提供するキーを使用する必要があります。アプリケーション
所有者のキーを、ソースコードやビルド成果物に含めないでください。

リアルタイムプロバイダーは `start()` のたびに、OpenAI 互換サーバーは発話の送信ごとに、
`getApiKey()`、`getClientSecret()`、または `getEphemeralToken()` を通じて認証情報を
要求します。キーの保存、キャッシュ、返却、ログ出力は行いません。ただし、保存方法は利用側のアプリケーションが管理します。ブラウザにキーを
保存すると、XSS、拡張機能、ローカル端末へのアクセス、侵害された依存パッケージなどを
通じて漏洩する可能性があります。認証情報の取得に失敗した場合は型付きエラーを返し、
別の認証方式へ自動的にフォールバックすることはありません。

## プロバイダーの違い

| 機能 | Web Speech | OpenAI Realtime | Gemini Live | Local Whisper | OpenAI 互換サーバー |
| --- | --- | --- | --- | --- | --- |
| 途中経過のスナップショット | 対応 | 対応 | 対応 | 非対応 | 非対応 |
| 複数の想定言語 | 非対応 | 対応 | 対応 | 非対応 | 非対応 |
| キーワード / カスタム語彙 | 非対応 | 対応 | 対応 | 非対応 | 非対応 |
| スマート文字起こし | 非対応 | 非対応 | 対応 | 非対応 | 非対応 |
| 遅延の設定 | 非対応 | 対応 | 非対応 | 対応 | 非対応 |
| 発話境界の判定 | ブラウザ実装 | ブラウザの音量検出 | GeminiのサーバーVAD | ブラウザのPCM/VAD | ブラウザのPCM/VAD |

すべてのプロバイダーに、対応ブラウザとマイクの使用許可が必要です。OpenAI WebRTC、
Gemini Live、Local Whisper、OpenAI 互換サーバーでは Web Audio API と HTTPS または localhost も必要です。
Gemini Live はさらに WebSocket、Local Whisper は WebGPU を必要とします。Web Speech の
利用可否と動作はブラウザによって異なります。OpenAI 互換サーバーには AudioWorklet、
fetch、FormData とサーバーの CORS 許可が必要ですが、ブラウザ側に WebGPU は不要です。リモートプロバイダーでは待機中も利用料金が
発生する可能性があるため、アプリケーションでは状態を明確に表示し、未使用時には
セッションを停止してください。
