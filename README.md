# AITuber OnAir

[![CI](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml/badge.svg)](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/shinshin86/aituber-onair)

![AITuber OnAir Toolkit - logo](./images/aituber-onair-toolkit.png)

[日本語版はこちら](./README_ja.md)

> **Open source toolkit for building AI VTubers**
>
> For developers and creators who want to build AI VTubers like [Neuro-sama](https://www.twitch.tv/vedal987), or open-source AI characters in the spirit of [Project AIRI](https://github.com/moeru-ai/airi).
> Start from the hosted web app, self-host a working example, or assemble your own stack from modular TypeScript packages for chat, voice, streaming, and viewer relationships.

<p align="center">
  <a href="https://aituberonair.com">Try the hosted web app</a> ・
  <a href="./packages/core/examples/react-basic">Run the React example</a> ・
  <a href="#packages">Browse packages</a>
</p>

![AITuber OnAir Demo](./images/aituber-onair-demo.png)

## What you can build

- AI VTubers that chat and speak with live viewers
- Streaming assistants that react to YouTube / Twitch comments
- AI character apps with text, voice, vision, and long-term memory
- Viewer relationship systems with points, levels, and achievements
- Browser- and Node.js-based integrations, composed from independent packages

## Choose your path

### 1. Try the hosted web app

[AITuber OnAir](https://aituberonair.com) is a full, standalone AITuber streaming web app built on top of `@aituber-onair/core`. It's both the quickest way to experience the toolkit end-to-end and a working reference for what you can ship with it. No setup required.

### 2. Run the example locally

A React app that wires chat + voice together, ready to tweak.

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-basic
npm install
npm run dev
```

Open `http://localhost:5173`.

### 3. Build your own with the packages

Install only what you need and drop it into your own app:

```bash
npm install @aituber-onair/chat
```

```ts
import { ChatServiceFactory } from '@aituber-onair/chat';

const chat = ChatServiceFactory.createChatService('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

await chat.processChat(
  [{ role: 'user', content: 'Hello!' }],
  (partial) => process.stdout.write(partial),
  async (full) => console.log('\nDone:', full),
);
```

See each package README for provider setup and fuller usage.

## Packages

### [@aituber-onair/core](./packages/core/README.md)
Core runtime tying chat, voice, memory, and conversation context together for full AITuber experiences.
```bash
npm install @aituber-onair/core
```

### [@aituber-onair/chat](./packages/chat/README.md)
Unified LLM layer across OpenAI, Claude, Gemini, Z.ai, Kimi, and OpenRouter — streaming, tool/function calling, vision, and MCP support included.
```bash
npm install @aituber-onair/chat
```

### [@aituber-onair/voice](./packages/voice/README.md)
Standalone TTS library with VOICEVOX, VoicePeak, OpenAI TTS, MiniMax, AIVIS Speech, and more, plus emotion-aware synthesis.
```bash
npm install @aituber-onair/voice
```

### [@aituber-onair/manneri](./packages/manneri/README.md)
Detects repetitive conversation patterns and injects topic-diversification prompts to keep dialogue fresh.
```bash
npm install @aituber-onair/manneri
```

### [@aituber-onair/bushitsu-client](./packages/bushitsu-client/README.md)
WebSocket chat client with React hooks, auto-reconnect, rate limiting, mentions, and voice integration. Browser and Node.js.
```bash
npm install @aituber-onair/bushitsu-client
```

### [@aituber-onair/kizuna](./packages/kizuna/README.md)
Relationship / bond system (絆) for AI characters and viewers: points, achievements, emotion-based bonuses, level progression, persistent storage.
```bash
npm install @aituber-onair/kizuna
```

## Why AITuber OnAir

- Proven in production — powers [AITuber OnAir](https://aituberonair.com), a live AITuber streaming web app, so you're building on the same code path a real product ships on
- Pick any entry point: hosted web app, self-hosted example, or modular npm packages
- First-class coverage of the providers AITuber builders actually use — OpenAI / Claude / Gemini for chat, VOICEVOX / OpenAI TTS / AIVIS Speech and more for voice
- Chat, voice, streaming (YouTube / Twitch / WebSocket), and viewer relationships in a single, consistent stack
- MIT-licensed TypeScript — you keep control of hosting, data, and integrations

## Project structure

```txt
aituber-onair/
└── packages/
    ├── core/             # AITuberOnAirCore, memory, orchestration
    ├── chat/             # LLM providers, streaming, tools, MCP
    ├── voice/            # TTS engines, emotion, playback
    ├── manneri/          # Conversation pattern detection
    ├── bushitsu-client/  # WebSocket chat client + React hooks
    └── kizuna/           # Viewer relationship / bond system
```

## License

MIT — see [LICENSE](./LICENSE).

## Special Thanks

This project is based on [the work referenced here](https://x.com/shinshin86/status/1862806042603847905). Without the contributions of these pioneers, it would not exist.

---

## For contributors

Working on the monorepo itself:

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair
npm install
npm run build
npm run test
npm run fmt
```

### Agent Skills

Shared Agent Skills so Codex and Claude Code use the same workflow definitions.
See [`docs/agent-skills.md`](./docs/agent-skills.md) for the full guide. Canonical sources live in `skills/`, with Claude Code runtime copies under `.claude/skills/`.

### Releases

Releases are driven by manual version bumps + per-package `CHANGELOG.md`, published automatically by GitHub Actions on merge to `main`. Do **not** run `npm publish` directly.

- **Patch**: bug fixes, dependency updates
- **Minor**: new features, backward-compatible changes
- **Major**: breaking changes to public API

`release.yml` uses Changesets to publish packages, create tags (`@aituber-onair/<pkg>@x.y.z`), and create GitHub Releases for packages published in that run. If CI fails mid-run, re-running publishes the remainder but does **not** backfill Releases for already-published packages — create those manually from the package CHANGELOG (tag will already exist). `prerelease-next.yml` only updates the `next` prerelease tag.
