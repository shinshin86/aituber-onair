# Examples

[日本語版はこちら](./examples.ja.md)

<p align="center">
  <img src="./images/examples-cover-miko.png" alt="AITuber OnAir Examples" width="840" />
</p>

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

<p align="center">
  <img src="../packages/core/examples/react-pngtuber-app/images/react-pngtuber-app.png" alt="PNGTuber example app" width="720" />
</p>

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

<p align="center">
  <img src="../packages/core/examples/react-vrm-app/images/react-vrm-app.png" alt="VRM example app" width="720" />
</p>

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

<p align="center">
  <img src="../packages/core/examples/react-live2d-app/images/react-live2d-app-hiyori.png" alt="Live2D example app with Hiyori Momose" width="720" />
</p>

<p align="center">
  <small>
    Live2D sample model: Hiyori Momose. Illustration: Kani Biimu;
    Modeling: Live2D Inc. See
    <a href="https://www.live2d.com/en/learn/sample/">Live2D Sample Data</a>.
  </small>
</p>

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
  full React chat integration with multi-provider LLMs, TTS engines, tool
  calling, MCP, and image chat.
- [`packages/core/examples/coding-agent`](../packages/core/examples/coding-agent):
  example of using AITuber OnAir Core with a coding-agent style workflow.

## Chat Examples

- [`packages/chat/examples/node-basic`](../packages/chat/examples/node-basic):
  Node.js examples for basic chat, provider-specific calls, vision, tool
  calling, and streaming.
- [`packages/chat/examples/react-basic`](../packages/chat/examples/react-basic):
  browser-based React chat usage.
- [`packages/chat/examples/local-llm-cli`](../packages/chat/examples/local-llm-cli):
  interactive CLI for local or self-hosted OpenAI-compatible LLM servers.
- [`packages/chat/examples/agent-providers`](../packages/chat/examples/agent-providers):
  examples for Agent SDK backed providers such as Codex, Claude, and Copilot.
- [`packages/chat/examples/character-agent`](../packages/chat/examples/character-agent):
  secretary-style character agent with tools, JSON storage, and tests.
- [`packages/chat/examples/codex-character-chat`](../packages/chat/examples/codex-character-chat):
  experimental character chat CLI using the Codex agent provider.
- [`packages/chat/examples/compat-probe`](../packages/chat/examples/compat-probe):
  compatibility probe for OpenAI-compatible chat endpoints.
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
  Node.js TTS examples for OpenAI-compatible speech, VOICEVOX, Aivis Speech,
  Aivis Cloud, VoicePeak, and audio playback checks.
- [`packages/voice/examples/react-basic`](../packages/voice/examples/react-basic):
  browser-based React TTS app with engine switching and provider-specific
  settings.
- [`packages/voice/examples/bun-basic`](../packages/voice/examples/bun-basic):
  Bun runtime TTS examples.
- [`packages/voice/examples/deno-basic`](../packages/voice/examples/deno-basic):
  Deno runtime TTS examples.

## Bushitsu Client Examples

- [`packages/bushitsu-client/examples/react-basic`](../packages/bushitsu-client/examples/react-basic):
  React WebSocket chat client usage.
- [`packages/bushitsu-client/examples/node-basic`](../packages/bushitsu-client/examples/node-basic):
  Node.js WebSocket chat client usage.
- [`packages/bushitsu-client/examples/gas-send-only`](../packages/bushitsu-client/examples/gas-send-only):
  Google Apps Script send-only example.

## Manneri Examples

- [`packages/manneri/examples/browser-basic`](../packages/manneri/examples/browser-basic):
  browser example for trying conversation pattern detection without connecting
  to an LLM.

## Comment Intelligence Examples

- [`packages/comment-intelligence/examples/live-comment-filter-sample`](../packages/comment-intelligence/examples/live-comment-filter-sample):
  browser example for filtering live comments before sending selected comments
  to an LLM.

## Starter Templates

<p align="center">
  <img src="../packages/create-aituber-onair/images/create-aituber-onair.png" alt="create-aituber-onair" width="520" />
</p>

Use `create-aituber-onair` when you want a clean project outside this monorepo:

```bash
npm create aituber-onair@latest my-aituber
```

The CLI currently includes PNGTuber, VRM, and Live2D templates. See
[Quickstart](./quickstart.md) for the recommended first run.
