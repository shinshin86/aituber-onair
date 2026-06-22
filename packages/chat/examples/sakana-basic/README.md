# Sakana AI Fugu Node.js Example

Minimal Node.js example for calling Sakana AI Fugu through
`@aituber-onair/chat`.

This example uses Chat Completions because the `sakana` provider in this package
follows the OpenAI-compatible Chat Completions path. It uses the smallest
working response length presets for a minimal chat smoke test: `veryShort` for
`fugu`, and `medium` for Fugu Ultra models because smaller presets can leave no
visible output after orchestration/reasoning.

## Prerequisites

Build the chat package from the package root:

```bash
cd ../../
npm run build
```

Set your Sakana API key:

```bash
export FUGU_API_KEY="xxx..."
```

Optional environment variables:

```bash
# Defaults to fugu. Supported: fugu, fugu-ultra, fugu-ultra-20260615
export FUGU_MODEL="fugu"

# Optional custom base URL. Defaults to https://api.sakana.ai/v1
export FUGU_BASE_URL="https://api.sakana.ai/v1"
```

## Run

From this directory:

```bash
node index.js
```

Try another model:

```bash
FUGU_MODEL="fugu-ultra" node index.js
```

Run all supported models with a tiny prompt:

```bash
node index.js --all
```

If an Ultra model prints no text, increase the response length preset in
`index.js`. Sakana documents that the token limit applies only to the final
Fugu Ultra response, while orchestration work uses its own maximum token limit.

## Browser Note

The React browser example shows Sakana AI as disabled because direct browser
requests can fail with CORS unless Sakana enables the required CORS headers for
your origin. Use a backend, serverless function, or Node.js process for browser
apps.
