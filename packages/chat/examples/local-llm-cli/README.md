# Local LLM CLI (OpenAI-compatible)

A minimal interactive CLI for **local/self-hosted LLMs**.

This example is for local LLM servers such as:
- Ollama
- LM Studio (OpenAI-compatible mode)
- vLLM (OpenAI-compatible server mode)

It uses the OpenAI-compatible Chat Completions format as the transport
protocol, but the primary use case is local LLM experimentation.

## Prerequisites

Build the chat package first:

```bash
npm ci
npm -w @aituber-onair/chat run build
```

## Run

### Using environment variables

```bash
LOCAL_LLM_ENDPOINT="http://127.0.0.1:11434/v1/chat/completions" \
LOCAL_LLM_MODEL="your-model" \
node packages/chat/examples/local-llm-cli/index.js
```

### Using CLI flags

```bash
node packages/chat/examples/local-llm-cli/index.js \
  --endpoint="http://127.0.0.1:11434/v1/chat/completions" \
  --model="your-model"
```

Optional:
- `--systemPrompt="You are a concise assistant."` (default: no system prompt)
- `--apiKey="your-key"` (only if your endpoint requires auth)
- `--stream=false` (disable streaming for compatibility checks)

Environment variable compatibility:
- Recommended: `LOCAL_LLM_ENDPOINT`, `LOCAL_LLM_MODEL`, `LOCAL_LLM_API_KEY`
- Legacy alias: `OPENAI_COMPAT_ENDPOINT`, `OPENAI_COMPAT_MODEL`, `OPENAI_COMPAT_API_KEY`

## Which Endpoint Should I Set?

Set `LOCAL_LLM_ENDPOINT` to your local LLM server's chat completions endpoint.

Examples:
- Ollama: `http://127.0.0.1:11434/v1/chat/completions`
- LM Studio: `http://127.0.0.1:1234/v1/chat/completions` (default setup)
- vLLM: `http://127.0.0.1:8000/v1/chat/completions` (typical setup)

## Practical Example (Ollama)

This is a concrete local LLM flow using Ollama's OpenAI-compatible endpoint.

1. Install Ollama  
   - macOS / Windows: install from https://ollama.com/download  
   - Linux: see https://docs.ollama.com/linux

2. Start Ollama server

```bash
ollama serve
```

Keep this terminal running while you use the CLI.

3. In another terminal, confirm server is reachable

```bash
curl -s http://127.0.0.1:11434/api/tags
```

4. Pull a model (example: `qwen3:8b`)

```bash
ollama pull qwen3:8b
```

5. (Optional) Quick OpenAI-compatible endpoint check

```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3:8b",
    "messages": [{"role":"user","content":"Say hello in one sentence."}],
    "stream": false
  }'
```

6. Run this CLI against Ollama

```bash
LOCAL_LLM_ENDPOINT="http://127.0.0.1:11434/v1/chat/completions" \
LOCAL_LLM_MODEL="qwen3:8b" \
node packages/chat/examples/local-llm-cli/index.js
```

7. Chat

```text
Connected
endpoint: http://127.0.0.1:11434/v1/chat/completions
model: qwen3:8b
Type /exit to quit.

> Explain what OpenAI-compatible API means in one sentence.
assistant> It means a server accepts the same request/response shape as OpenAI APIs, so compatible clients can be reused.
> /exit
bye
```

Notes:
- Output text differs by model/version and prompt.
- For local Ollama at `localhost`, API keys are typically ignored.
- If you get `HTTP 400`, try `--stream=false` and/or set an explicit
  `--systemPrompt` that matches your model's chat template expectations.

## Commands

- `/exit` : quit CLI
