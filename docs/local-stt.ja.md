# OpenAI 互換サーバーを使うローカル文字起こし

[English](./local-stt.md)

`@aituber-onair/transcription` の `openai-compatible` は、multipart の
`POST /v1/audio/transcriptions` を受け付け、文字列の `text` を含む JSON を返す
サーバーへマイク音声を送信します。Local Whisper と同じ録音・発話判定・16 kHz
への変換処理を使い、発話ごとにモノラル PCM16 WAV を送ります。確定結果のみを
発行し、WebSocket ストリーミングと WebGPU は使いません。認識モデルによっては
ファイルの先頭から話し始めると最初の言葉を落とすため、各 WAV の先頭に 1 秒の
無音を入れて送ります。

サーバーは `file` と `response_format=json` に対応している必要があります。
`model`、`language`、`prompt` は空でない場合だけ送信します。各オプションの対応状況は
サーバーとモデルによって異なります。`ja-JP` などの言語ヒントは `ja` に変換されます。
これら以外の multipart フィールドは送りません。「OpenAI 互換」という表記だけでは、
このエンドポイントとの互換性は判断できません。

## speech.cpp の接続例

[speech.cpp](https://github.com/nyosegawa/speech.cpp) は、このバッチ API を提供しています。
インストールは同プロジェクトの手順に従い、STT モデルを起動してください。

```sh
speech serve qwen3-asr-0.6b --cors-origin http://localhost:5173
```

初回は約 0.84 GB のモデルをダウンロードします。日本語向けの選択肢として、
約 1.24 GB をダウンロードする `reazonspeech-v2` もあります。

```sh
speech serve reazonspeech-v2 --cors-origin http://localhost:5173
```

既定の接続先は `http://127.0.0.1:8080` です。CORS の Origin は、実際にページを
開いた URL のポート番号まで一致させてください。`localhost` と `127.0.0.1` は
異なる Origin です。上のコマンドのポートは例です。ブラウザサンプルには、そのページの
実際の Origin が表示されます。サーバーの詳細は
[speech.cpp のサーバー仕様（v0.8.3）](https://github.com/nyosegawa/speech.cpp/blob/v0.8.3/docs/server.md)
を参照してください。

## ブラウザサンプル

リポジトリの依存関係をインストールしてから起動します。

```sh
npm -w @aituber-onair/transcription run example:dev
```

1. Vite が表示した URL を localhost または HTTPS で開きます。
2. 文字起こし方式に **OpenAI 互換サーバー** を選びます。
3. **サーバー URL** に `http://127.0.0.1:8080` を入力します。画面の **送信先** を
   確認してください。
4. speech.cpp のロード済みモデルを使う場合、**モデル** は空欄にできます。
   指定する場合は `GET /v1/models` の ID を入力します。他のサーバーではモデルが
   必須の場合があります。OpenAI の Whisper 文字起こしでは `whisper-1` を指定します。
5. ローカルの speech.cpp では **API キー** を空欄にします。Bearer 認証が必要な
   接続先でのみキーを入力してください。音声とキーは指定した URL へ送られるため、
   信頼できるサーバーを使ってください。
6. 言語ヒントには `ja-JP` などを指定します。サーバーの自動判定を使う場合は空欄に
   します。**プロンプト** は、サーバーとモデルが対応している場合に指定してください。
7. 文字起こしを開始し、マイクの使用を許可して話します。既定では 500 ms の無音で
   発話を区切ります。最小値は 150 ms です。結果は **確定結果** に表示され、途中結果は
   発行されません。

## アプリケーションから使う

```ts
import {
  createRealtimeTranscriptionSession,
  resolveOpenAICompatibleTranscriptionEndpoint,
} from '@aituber-onair/transcription';

const baseUrl = 'http://127.0.0.1:8080';
console.log(resolveOpenAICompatibleTranscriptionEndpoint(baseUrl));
// http://127.0.0.1:8080/v1/audio/transcriptions

const session = createRealtimeTranscriptionSession({
  provider: 'openai-compatible',
  baseUrl,
  language: 'ja-JP',
  silenceDurationMs: 500,
  timeoutMs: 30000,
});
session.onTranscript(({ text, isFinal }) => {
  if (isFinal) console.log(text);
});
session.onError(({ code, message }) => console.error(code, message));
await session.start();
// Later:
await session.stop();
await session.dispose();
```

`baseUrl` は必須です。Origin だけなら `/v1/audio/transcriptions`、`/v1` を含む
API ベース URL なら `/audio/transcriptions` を補います。完全なエンドポイント URL は
そのまま使います。末尾のスラッシュを取り除き、独自のパス接頭辞は保持します。
認証情報・クエリ・フラグメントを含む URL は受け付けません。

Bearer 認証が必要な場合は、次の `auth` をオプションに追加します。

```ts
auth: {
  type: 'browser-api-key',
  getApiKey: async () => readEndUserKeyAtRuntime(),
  acknowledgeBrowserKeyRisk: true,
}
```

コールバックは発話の送信ごとに呼び出されます。パッケージはキーを永続化しません。
本番環境のアプリケーション所有キーはバックエンドで管理してください。ブラウザ BYOK は、
信頼できるアプリケーションでエンドユーザー自身のキーを使うための方式です。
Cookie は送信せず、リダイレクトも受け付けません。最終的な接続先を直接指定してください。

`stop()` は最後の発話を確定し、待機中の送信が終わるまで待ちます。`dispose()` は録音を
停止し、進行中の通信を中断して待機中の発話を破棄します。既定のタイムアウトは 30 秒で、
キー取得・送信・レスポンス読み込みを含みます。空の結果と、Local Whisper で除外している
既知の誤認識文は発行しません。この簡易フィルターでは、同じ文を実際に話した場合も
結果が除外されることがあります。

## CORS・HTTPS・リモート実行環境

マイク録音には HTTPS または localhost、Web Audio、AudioWorklet、`fetch`、
`FormData` が必要です。それとは別に、API サーバーの CORS 設定でページの Origin を
許可してください。`Authorization` ヘッダーを使う場合は CORS プリフライトにも対応が
必要です。HTTPS ページから HTTP サーバーへの通信は混在コンテンツとしてブロックされる
場合があります。HTTPS の接続先を使うか、ローカル検証ではフロントエンドも localhost
で開いてください。

Google Colab などのリモート環境では、到達可能な HTTPS エンドポイントと CORS 設定を
用意し、外部公開前に認証を設定する必要があります。同じバッチ API の仕様を満たす
一時トンネル URL も **サーバー URL** に指定できます。セッションごとの Bearer キーは
URL やソースコードに含めないでください。このガイドには Colab 向け STT 起動ツールは
含まれず、特定のトンネルでの動作を検証したものでもありません。サーバーを設定・検証して
からサンプルへ接続してください。

## トラブルシューティング

| 症状 | 確認する内容 |
| --- | --- |
| 通信・CORS エラー、タイムアウト | サーバーの起動状態、URL、CORS、混在コンテンツの制限を確認します。speech.cpp の `--cors-origin` には画面に表示された Origin を指定します。推論に時間がかかる場合はアプリ側の `timeoutMs` を増やします。 |
| HTTP 401 | Bearer キーと接続先の認証要件を確認します。 |
| HTTP 403 `origin_not_allowed` | speech.cpp の `--cors-origin` にフロントエンドの正確な Origin を追加します。API キーを使わない場合にも発生します。 |
| HTTP 404、モデルが未ロード | エンドポイントのパスと `GET /v1/models` を確認します。speech.cpp のロード済みモデルを使うならモデル欄を空にします。 |
| HTTP 400 | サーバーのエラー詳細、モデルの言語・プロンプト対応、multipart フィールドを確認します。 |
| HTTP 503 | モデルのロード中なら、サーバーの準備が終わるまで待ちます。 |
| 結果が出ない | 300 ms 以上話してから間を空けます。空のレスポンスと既知の誤認識文は除外されます。 |

401/403 は `authentication-failed` として録音を停止します。ローカルの設定不備は
`invalid-configuration`、通信失敗とタイムアウトは `connection-failed`、その他の
HTTP エラーと不正な JSON は `provider-error` です。一時的なエラーではその発話を
破棄して録音を継続し、古い音声の再送は行いません。認証・設定エラーは原因を直してから
再開してください。
