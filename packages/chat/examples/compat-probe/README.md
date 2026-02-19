# OpenAI Compatible Probe

`compat-probe` verifies whether `@aituber-onair/chat` can connect to an
OpenAI-compatible Chat Completions API endpoint without relying on a
specific local LLM implementation.

The probe uses `ChatServiceFactory.createChatService('openai-compatible', ...)`.

## Coverage

Required checks:
- T1: Non-stream short response
- T2: Streaming completion (SSE)
- T3: Conversation history reference
- T4: Long input response
- T5: Intentional 4xx error handling
- T6: Timeout handling (simulated)

Best effort (out of required scope):
- tools/function calling
- vision
- strict JSON mode compatibility

## Usage

Build the chat package first:

```bash
npm ci
npm -w @aituber-onair/chat run build
```

Run with environment variables:

```bash
COMPAT_ENDPOINT="http://127.0.0.1:18080/v1/chat/completions" \
COMPAT_API_KEY="test-key" \
COMPAT_MODEL="mock-chat-model" \
COMPAT_STREAM="true" \
COMPAT_ERROR_MODEL="mock-400" \
node packages/chat/examples/compat-probe/index.js
```

Run with CLI flags:

```bash
node packages/chat/examples/compat-probe/index.js \
  --endpoint="http://127.0.0.1:18080/v1/chat/completions" \
  --apiKey="test-key" \
  --model="mock-chat-model" \
  --stream="true" \
  --errorModel="mock-400"
```

Exit code:
- `0`: all required checks passed (`SKIP` only for disabled streaming)
- `1`: one or more checks failed

## GitHub Actions (`workflow_dispatch`)

For remote endpoint checks in CI, set `OPENAI_COMPAT_API_KEY` in repository
Secrets and run `.github/workflows/chat-openai-compat.yml`.
