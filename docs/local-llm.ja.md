# ローカル LLM を使う

AITuber OnAir は、OpenAI 互換の Chat Completions API を備えたローカルまたはセルフホストのサーバーに接続できます。React サンプルの LLM 設定で **OpenAI-Compatible** を選び、モデル ID と `/v1/chat/completions` まで含む URL を入力してください。現時点の React サンプルには完全な URL が必要です。Chat パッケージの `resolveOpenAICompatibleEndpoint` と `local-llm-cli` は、`http://localhost:11434/v1` のようなベース URL も受け付けます。

Ollama のローカルサーバーでは、[標準の `/api` API](https://docs.ollama.com/api/introduction) と [OpenAI 互換の `/v1` API](https://docs.ollama.com/api/openai-compatibility) を追加の切り替えなしで利用できます。Ollama の主なチャット用 API は `/api/chat` ですが、AITuber OnAir は OpenAI 互換の `/v1` を使います。

まずサーバーを起動し、チャットに対応したモデルを読み込んでください。モデル ID は `GET /v1/models`、または CLI で確認できます。

```bash
npm -w @aituber-onair/chat run build
node packages/chat/examples/local-llm-cli/index.js \
  --endpoint="http://localhost:11434/v1" --list-models
```

表示された ID を `model` に指定します。モデル一覧の取得では文章を生成しません。

## ローカルサーバー

以下は標準的なローカル URL です。ポートや API のパスを変更した場合は、実際の URL を指定してください。ブラウザから接続する場合は、サーバー側の CORS 設定も確認します。

| サーバー | ベース URL | React サンプルに入力する URL | モデル ID とブラウザ接続 |
| --- | --- | --- | --- |
| [Ollama](https://docs.ollama.com/api/openai-compatibility) | `http://localhost:11434/v1` | `http://localhost:11434/v1/chat/completions` | モデルを取得した後、`/v1/models` で ID を確認します。[公式 FAQ](https://docs.ollama.com/faq#how-can-i-allow-additional-web-origins-to-access-ollama) によると、`127.0.0.1` と `0.0.0.0` からのリクエストは標準で許可されます。React 開発サーバーの `http://localhost:5173` からの接続が拒否される場合は、`OLLAMA_ORIGINS=http://localhost:5173 ollama serve` で Ollama を起動します。 |
| [LM Studio](https://lmstudio.ai/docs/developer/openai-compat) | `http://localhost:1234/v1` | `http://localhost:1234/v1/chat/completions` | ローカルサーバーを起動し、[`/v1/models`](https://lmstudio.ai/docs/developer/openai-compat/models) で ID を確認します。ブラウザから使う場合は [`lms server start --cors`](https://lmstudio.ai/docs/cli/serve/server-start) で起動します。このフラグを付けないと CORS は無効です。 |
| [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) | `http://127.0.0.1:8080/v1` | `http://127.0.0.1:8080/v1/chat/completions` | チャット対応の GGUF を `llama-server` で読み込みます。`/v1/models` にモデル ID が返ります。短い ID にしたい場合は `--alias` を使えます。資料上の `--cors-origins` の初期値は `*`（すべての Origin を許可）です。許可先を絞る場合はこのフラグを指定します。 |
| [vLLM](https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/) | `http://localhost:8000/v1` | `http://localhost:8000/v1/chat/completions` | `vllm serve <model-id>` で起動し、`/v1/models` で提供中の ID を確認します。CORS は [`--allowed-origins`](https://docs.vllm.ai/en/latest/cli/serve/) で設定でき、資料上の初期値は `['*']` です。 |

ブラウザ向けに CORS を設定するときは、必要な Origin だけを許可してください。CLI には CORS 設定は不要です。HTTPS で配信したアプリから HTTP のローカル URL に接続する場合は、ブラウザの混在コンテンツ制限も確認してください。

## Google Colab

リポジトリ内の [connect-colab-local-llm スキル](../skills/connect-colab-local-llm/SKILL.md)に、Colab で vLLM または llama.cpp を起動し、cloudflared Quick Tunnel で一時的な認証付き URL を発行する手順があります。セッションごとに `/v1/models`、Chat Completions、ストリーミング、ブラウザ CORS を確認します。得られた完全なエンドポイント URL、モデル ID、一時 API キーを React サンプルに入力してください。

## 音声出力

React サンプルでは、VOICEVOX、AivisSpeech、OpenAI 互換 TTS も利用できます。LLM と TTS はそれぞれの設定項目で指定してください。ローカル TTS サーバーについては[ローカル TTS ガイド](local-tts.ja.md)を参照してください。

## 困ったときは

- **ブラウザのネットワークエラー:** サーバーが停止しているか、アプリの Origin が CORS で拒否されている可能性があります。`curl` で `/v1/models` に接続し、ブラウザのコンソールとサーバーの CORS 設定を確認してください。ブラウザ上ではどちらも fetch の失敗として表示されることがあります。
- **モデルが見つからない:** `/v1/models` の `data[].id` をそのまま指定してください。表示名と ID が異なる場合があります。
- **404:** パスを確認してください。現時点の React サンプルには `/v1/chat/completions` まで含む URL が必要です。`--list-models` はベース URL から `/v1/models` を呼びます。
- **Ollama の `/api/chat` URL:** これはリクエスト形式が異なる Ollama 標準 API です。React サンプルには `http://localhost:11434/v1/chat/completions`、CLI には `http://localhost:11434/v1` を入力してください。
- **感情タグが反映されない:** 小規模なモデルや学習内容の異なるモデルは、キャラクターや感情についての指示に安定して従わない場合があります。TTS の設定を変える前に、チャット対応モデルの出力を確認してください。
