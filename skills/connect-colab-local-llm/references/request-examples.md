# Colab Local LLM Request Examples

Use these examples when asking an AI agent to prepare a Google Colab local LLM
for AITuber OnAir Core. Start with the verified configuration unless you
already know which model or file you want to use.

## Before You Start

1. Open a Google Colab notebook.
2. Select a GPU runtime suitable for the model. Use L4 for the verified
   Gemma 4 example below.
3. Connect the runtime.
4. Connect Colab MCP Go so that the agent can operate the notebook.

Do not assume that every model fits on L4. GPU requirements depend on the
model, file format, quantization, context length, and backend. The verified
vLLM smoke test used an A100, although vLLM does not always require one. The
agent must inspect the current GPU before downloading the model.

The agent prepares the required software, downloads the model, creates a
protected temporary connection, and checks it from Core. The user handles
Google login, GPU selection, gated-model license acceptance, and `HF_TOKEN`
setup when a model requires authentication.

## Recommended First Request

This is the shortest request for the configuration verified on 2026-07-29:

```text
$connect-colab-local-llm を使って、接続済みの Google Colab L4 ランタイムで
検証済みの Gemma 4 12B Q4_0 構成を起動してください。

AITuber OnAir Core の PNGTuber サンプルへ接続し、日本語の応答がブラウザに
少しずつ表示されるところまで確認してください。最後に、Core へ入力する
3つの設定値を提示してください。私も試したいので、確認後は停止せずに
残してください。
```

The agent infers the verified settings:

- model repository: `google/gemma-4-12B-it-qat-q4_0-gguf`
- model file: `gemma-4-12b-it-qat-q4_0.gguf`
- backend: llama.cpp
- context size: 4,096
- Core sample: `react-pngtuber-app`

The model was anonymously downloadable during live validation. The agent must
still verify current access before starting the download.

## Let the Agent Choose for Another Model

Use this when you know the Hugging Face model but do not know its file format
or the appropriate serving software:

```text
Use $connect-colab-local-llm to run <hugging-face-model-id> on the connected
Google Colab runtime and connect it to the AITuber OnAir Core PNGTuber sample.

Choose the appropriate setup for the model and current GPU. Verify normal and
streaming responses in Core, show me the three connection values, and keep the
session running until I finish testing. If the current GPU is insufficient,
stop before downloading the model and tell me which runtime or settings are
needed.
```

The agent selects vLLM for a native Hugging Face generation checkpoint or
llama.cpp for a GGUF file and explains the selection.

## Specify a GGUF File

Use this only when you already know the exact Hugging Face repository and GGUF
filename:

```text
Use $connect-colab-local-llm to launch this GGUF model on the connected Google
Colab runtime and connect it to the AITuber OnAir Core PNGTuber sample.

- model_id: <hugging-face-model-id>
- gguf_filename: <exact-gguf-filename>
- served_model_name: <model-name-used-by-core>

Use llama.cpp, create a protected temporary connection, run the repository
compatibility checks, and verify that text appears incrementally in the Core
browser sample. Show me the Endpoint, Model, and API Key. Keep the session
running until I finish testing.
```

## Specify a vLLM Model

Use this for a native Hugging Face generation checkpoint:

```text
Use $connect-colab-local-llm to launch this model with vLLM on the connected
Google Colab runtime and connect it to the AITuber OnAir Core PNGTuber sample.

- model_id: <hugging-face-model-id>
- served_model_name: <model-name-used-by-core>

Inspect the current GPU before choosing memory and context settings. Create a
protected temporary connection, run the repository compatibility checks, and
verify that text appears incrementally in the Core browser sample. Show me the
Endpoint, Model, and API Key. Keep the session running until I finish testing.
```

For a small, previously verified vLLM smoke test, use:

- GPU: A100
- `model_id`: `Qwen/Qwen2.5-0.5B-Instruct`
- `served_model_name`: `aituber-colab-smoke`
- `max_model_len`: `4096`
- `gpu_memory_utilization`: `0.50`

## Connect Core

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

The URL and API key expire when the temporary connection or Colab runtime
stops. Do not save either value in repository files.

## Cleanup Request

After browser testing, send:

```text
動作確認が終わりました。今回起動した Colab の LLM、外部接続、Core サンプル、
スリープ防止処理を停止し、停止結果を確認してください。
```

After cleanup succeeds, the Colab runtime can be disconnected and deleted.
