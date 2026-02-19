# Mock OpenAI-Compatible Server

A lightweight local server for CI and development that implements the minimum
subset of the OpenAI-compatible Chat Completions contract required by
`compat-probe`.

## Endpoints

- `GET /health`
- `POST /v1/chat/completions`
  - non-stream response (`stream: false`)
  - SSE stream response (`stream: true`)

## Usage

```bash
node packages/chat/examples/mock-openai-server/server.js --port=18080
```

Then run probe:

```bash
COMPAT_ENDPOINT="http://127.0.0.1:18080/v1/chat/completions" \
COMPAT_API_KEY="test-key" \
COMPAT_MODEL="mock-chat-model" \
COMPAT_ERROR_MODEL="mock-400" \
node packages/chat/examples/compat-probe/index.js
```

## Environment Variables

- `MOCK_OPENAI_HOST` (default: `127.0.0.1`)
- `MOCK_OPENAI_PORT` (default: `18080`)
- `MOCK_OPENAI_API_KEY` (default: `test-key`)
- `MOCK_OPENAI_REQUIRE_AUTH` (default: `true`)
- `MOCK_OPENAI_ERROR_MODEL` (default: `mock-400`)
