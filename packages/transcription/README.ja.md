# @aituber-onair/transcription

![@aituber-onair/transcription ロゴ](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/transcription/images/aituber-onair-transcription.png)

[English](./README.md)

AITuber OnAir 向けの、プロバイダーに依存しないリアルタイムマイク文字起こしパッケージです。

> このパッケージはα版です。安定版になるまでに公開 API が変更される可能性が
> あります。

Web Speech、ブラウザ WebRTC を利用する OpenAI Realtime、WebGPU でローカル推論する
Whisper Tiny、Base、Small に対応しています。すべてのプロバイダーが、発話ごとに
同じ形式のスナップショットイベントを発行します。ファイルの文字起こし、サーバー
WebSocket入力、チャットへの自動送信、プロバイダーのフォールバックは、意図的に
対象外です。

## ブラウザサンプル

AITuber OnAir Core に依存せず、3つのプロバイダーを試せるフレームワーク非依存の
ブラウザサンプルが含まれています。

```sh
npm -w @aituber-onair/transcription run example:dev
```

表示された localhost の URL を開き、セッション開始時にマイクの使用を許可して
ください。Web Speech と Local Whisper にキーは不要です。OpenAI を利用する場合は、
エンドユーザー自身が所有する API キーを画面に入力します。サンプルはブラウザから
OpenAI へ直接接続するため、共有端末での利用は避けてください。Local Whisper には
WebGPU が必要で、初回開始時にモデルとランタイムをダウンロードしてブラウザに
キャッシュします。画面は日本語・英語を切り替えられ、初期表示にはブラウザの言語
設定が使われます。詳細は
[サンプルの README](https://github.com/shinshin86/aituber-onair/blob/main/packages/transcription/examples/browser-basic/README.md)
を参照してください。

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
`local-whisper` のみが `onProgress` を発行し、Web Speech と OpenAI Realtime は
発行しません。

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

## セキュリティ

OpenAI は、標準 API キーをサーバーに保管し、有効期間の短いクライアント
シークレットを発行する方式を推奨しています。ブラウザ BYOK 方式は、信頼できる
フロントエンドのみのアプリケーションやセルフホスト環境向けです。この方式では、
エンドユーザー自身が所有・提供するキーを使用する必要があります。アプリケーション
所有者のキーを、ソースコードやビルド成果物に含めないでください。

このパッケージは `start()` のたびに `getApiKey()` を通じてキーを要求し、保存、
キャッシュ、返却、ログ出力は行いません。ただし、保存方法は利用側のアプリケーションが
管理します。ブラウザにキーを保存すると、XSS、拡張機能、ローカル端末へのアクセス、
侵害された依存パッケージなどを通じて漏洩する可能性があります。また、クライアント
シークレットの直接発行は、OpenAI エンドポイントの現在のブラウザ/CORS 動作にも
依存します。失敗した場合は型付きエラーを返し、別の認証方式へ自動的にフォールバック
することはありません。

## プロバイダーの違い

| 機能 | Web Speech | OpenAI Realtime | Local Whisper |
| --- | --- | --- | --- |
| 途中経過のスナップショット | 対応 | 対応 | 非対応 |
| 複数の想定言語 | 非対応 | 対応 | 非対応 |
| キーワードと文脈プロンプト | 非対応 | 対応 | 非対応 |
| 遅延の設定 | 非対応 | 対応 | 対応 |
| 発話境界の判定 | ブラウザ実装 | ブラウザの音量検出 | ブラウザのPCM/VAD |

すべてのプロバイダーに、対応ブラウザとマイクの使用許可が必要です。OpenAI WebRTC と
Local Whisper では Web Audio API と HTTPS または localhost も必要で、Local
Whisper はさらに WebGPU を必要とします。Web Speech の利用可否と動作はブラウザに
よって異なります。無音中でも待機によって OpenAI の利用料金が発生する可能性がある
ため、アプリケーションでは状態を明確に表示し、未使用時にはセッションを停止して
ください。
