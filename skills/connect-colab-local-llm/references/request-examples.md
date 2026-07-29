# Colab Local LLM Request Examples

Copy one of these prompts when asking an AI agent to prepare a Google Colab
local LLM for AITuber OnAir Core.

## Before You Start

1. Open a Google Colab notebook.
2. Select a GPU runtime. Use L4 for the verified Gemma 4 GGUF example below.
3. Connect the runtime.
4. Make sure Colab MCP Go can access the notebook.

The agent handles backend installation, model download, temporary API-key
generation, cloudflared startup, API checks, and Core validation. The user
handles Google login, GPU selection, gated-model license acceptance, and
`HF_TOKEN` setup when a model requires authentication.

## Verified Gemma 4 on L4

This is the recommended copy-paste request for the exact combination verified
on 2026-07-29.

```text
$connect-colab-local-llm を使って、Google Colab の L4 上で次のローカル LLM
を起動し、AITuber OnAir Core の PNGTuber サンプルから利用できる状態まで
セットアップしてください。

- backend: llama.cpp
- model_id: google/gemma-4-12B-it-qat-q4_0-gguf
- gguf_filename: gemma-4-12b-it-qat-q4_0.gguf
- served_model_name: gemma-4-12b-it-qat-q4_0
- context_size: 4096
- core_example: react-pngtuber-app
- exposure: public

要件:
- Colab MCP Go でランタイムを操作する
- API キーはセッションごとに自動生成する
- cloudflared Quick Tunnel を使い、ngrok は使わない
- 公開 URL で認証、通常応答、SSE、CORS を確認する
- @aituber-onair/chat の互換性プローブ T1〜T6 を実行する
- Core サンプルで日本語の応答が逐次表示されることを確認する
- 接続用の Endpoint、Model、API Key を最後に提示する
- 私がブラウザで試すため、確認完了後もサーバー、トンネル、
  Core サンプルを停止せずに残す
```

This model is anonymously downloadable. A future repository or hosting-policy
change can still require authentication, so the agent must verify access in
the current session.

## Generic GGUF Model

Replace the placeholders with the exact Hugging Face repository and GGUF
filename.

```text
Use $connect-colab-local-llm to launch this GGUF model on Google Colab and
connect it to the AITuber OnAir Core PNGTuber sample.

- backend: llama.cpp
- model_id: <hugging-face-model-id>
- gguf_filename: <exact-gguf-filename>
- served_model_name: <model-name-used-by-core>
- context_size: 4096
- core_example: react-pngtuber-app
- exposure: public

Use Colab MCP Go, generate a temporary API key automatically, expose only
through a cloudflared Quick Tunnel, run the public SSE and T1-T6 compatibility
checks, and verify incremental text in the Core browser sample. Report the
Endpoint, Model, and API Key. Keep the session running until I finish testing.
```

## Generic vLLM Model

Use this for a native Hugging Face generation checkpoint rather than a GGUF
artifact.

```text
Use $connect-colab-local-llm to launch this Hugging Face model with vLLM on
Google Colab and connect it to the AITuber OnAir Core PNGTuber sample.

- backend: vllm
- model_id: <hugging-face-model-id>
- served_model_name: <model-name-used-by-core>
- core_example: react-pngtuber-app
- exposure: public

Inspect the current Colab GPU and CUDA environment before choosing the vLLM
wheel and runtime settings. Use Colab MCP Go, generate a temporary API key
automatically, expose only through a cloudflared Quick Tunnel, run the public
SSE and T1-T6 compatibility checks, and verify incremental text in the Core
browser sample. Report the Endpoint, Model, and API Key. Keep the session
running until I finish testing.
```

For a small, previously verified vLLM smoke test, use:

- GPU: A100
- `model_id`: `Qwen/Qwen2.5-0.5B-Instruct`
- `served_model_name`: `aituber-colab-smoke`
- `max_model_len`: `4096`
- `gpu_memory_utilization`: `0.50`

## Let the Agent Choose the Backend

Use this when the model is known but its artifact format is not.

```text
Use $connect-colab-local-llm to run <hugging-face-model-id> on Google Colab
and connect it to the AITuber OnAir Core PNGTuber sample.

Inspect the model artifacts and choose vLLM for a native Hugging Face
generation checkpoint or llama.cpp for GGUF. Explain the selected backend,
check that the model fits the current GPU, generate a temporary API key, use a
cloudflared Quick Tunnel, and complete the public API, compatibility-probe,
and Core browser checks. Keep the session running until I finish testing.
```

## Core Connection

After setup, the agent returns three session-specific values:

- `Endpoint`: the full `/v1/chat/completions` URL
- `Model`: the exact served model name
- `API Key`: a randomly generated temporary key

Enter them in the Core sample:

- Provider: `OpenAI-Compatible`
- Endpoint URL: the returned `Endpoint`
- Model: the returned `Model`
- API Key: the returned `API Key`
- TTS Engine: start with `None` when testing text generation

The URL and API key expire when the cloudflared process or Colab runtime
stops. Do not save either value in repository files.

## Cleanup Request

After browser testing, send:

```text
動作確認が終わりました。Colab の LLM サーバーと cloudflared、ローカルの
Core サンプル、caffeinate を停止し、停止結果を確認してください。
```

After cleanup succeeds, the Colab runtime can be disconnected and deleted.
