# Examples

[日本語版はこちら](./examples.ja.md)

AITuber OnAir includes full app examples and smaller package examples. If you
are new to the project, start with one full AI VTuber app first, then move down
to the package examples when you need lower-level integration.

## Recommended Path

- Start with
  [`packages/core/examples/react-pngtuber-app`](../packages/core/examples/react-pngtuber-app)
  if this is your first AITuber OnAir project.
- Use
  [`packages/core/examples/react-vrm-app`](../packages/core/examples/react-vrm-app)
  if you want a 3D avatar with VRM assets.
- Use
  [`packages/core/examples/react-live2d-app`](../packages/core/examples/react-live2d-app)
  if you already have Live2D model assets.
- Use package examples when you want to embed chat, voice, memory, or streaming
  behavior into an existing application.

## Full AI VTuber Apps

### PNGTuber App

Path:
[`packages/core/examples/react-pngtuber-app`](../packages/core/examples/react-pngtuber-app)

Best for a first local setup. It uses 2D PNG avatar states and drives lip sync
from actual audio output volume.

```bash
cd packages/core/examples/react-pngtuber-app
npm install
npm run dev
```

### VRM App

Path:
[`packages/core/examples/react-vrm-app`](../packages/core/examples/react-vrm-app)

Best for 3D avatar projects. It renders a VRM model, supports optional idle
VRMA animation, and includes camera controls.

```bash
cd packages/core/examples/react-vrm-app
npm install
npm run dev
```

### Live2D App

Path:
[`packages/core/examples/react-live2d-app`](../packages/core/examples/react-live2d-app)

Best when you already have Live2D assets. The example loads a local Live2D model
folder and drives mouth movement from audio output volume. Live2D model assets
are not bundled.

```bash
cd packages/core/examples/react-live2d-app
npm install
npm run dev
```

## Core Examples

- [`packages/core/examples/react-basic`](../packages/core/examples/react-basic):
  minimal React integration with `@aituber-onair/core`.
- [`packages/core/examples/coding-agent`](../packages/core/examples/coding-agent):
  example of using AITuber OnAir Core with a coding-agent style workflow.

## Chat Examples

- [`packages/chat/examples/node-basic`](../packages/chat/examples/node-basic):
  basic Node.js chat usage.
- [`packages/chat/examples/react-basic`](../packages/chat/examples/react-basic):
  browser-based React chat usage.
- [`packages/chat/examples/local-llm-cli`](../packages/chat/examples/local-llm-cli):
  local LLM command-line usage.
- [`packages/chat/examples/agent-providers`](../packages/chat/examples/agent-providers):
  agent provider examples.
- [`packages/chat/examples/compat-probe`](../packages/chat/examples/compat-probe):
  provider compatibility probing.
- [`packages/chat/examples/mock-openai-server`](../packages/chat/examples/mock-openai-server):
  mock OpenAI-compatible server for local testing.
- [`packages/chat/examples/discord-bot`](../packages/chat/examples/discord-bot):
  Discord bot example.
- [`packages/chat/examples/slack-bot`](../packages/chat/examples/slack-bot):
  Slack bot example.
- [`packages/chat/examples/gas-basic`](../packages/chat/examples/gas-basic):
  Google Apps Script chat example.
- [`packages/chat/examples/gas-forms-autodraft-openai`](../packages/chat/examples/gas-forms-autodraft-openai):
  Google Forms auto-draft example with OpenAI.

## Voice Examples

- [`packages/voice/examples/node-basic`](../packages/voice/examples/node-basic):
  basic Node.js TTS usage.
- [`packages/voice/examples/react-basic`](../packages/voice/examples/react-basic):
  browser-based React TTS usage.
- [`packages/voice/examples/bun-basic`](../packages/voice/examples/bun-basic):
  Bun runtime example.
- [`packages/voice/examples/deno-basic`](../packages/voice/examples/deno-basic):
  Deno runtime example.

## Bushitsu Client Examples

- [`packages/bushitsu-client/examples/react-basic`](../packages/bushitsu-client/examples/react-basic):
  React WebSocket chat client usage.
- [`packages/bushitsu-client/examples/node-basic`](../packages/bushitsu-client/examples/node-basic):
  Node.js WebSocket chat client usage.
- [`packages/bushitsu-client/examples/gas-send-only`](../packages/bushitsu-client/examples/gas-send-only):
  Google Apps Script send-only example.

## Starter Templates

Use `create-aituber-onair` when you want a clean project outside this monorepo:

```bash
npm create aituber-onair@latest my-aituber
```

The CLI currently includes PNGTuber, VRM, and Live2D templates. See
[Quickstart](./quickstart.md) for the recommended first run.
