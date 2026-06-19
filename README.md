# AITuber OnAir

[![CI](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml/badge.svg)](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/shinshin86/aituber-onair)

![AITuber OnAir Toolkit - logo](./images/aituber-onair-toolkit.png)

[日本語版はこちら](./README_ja.md)

> **Build stream-ready AI VTubers with TypeScript**
>
> AITuber OnAir is an open source toolkit for building AI VTubers
> that can chat, speak, react to viewers, use memory, and run with
> PNG, VRM, or Live2D avatars. Start from the hosted web app, scaffold
> a starter app, self-host a working example, or assemble your own stack
> from modular TypeScript packages.

<p align="center">
  <a href="https://aituberonair.com">Try the hosted web app</a> ・
  <a href="./docs/quickstart.md">Quickstart</a> ・
  <a href="./docs/examples.md">Examples</a> ・
  <a href="#packages">Packages</a>
</p>

![AITuber OnAir Demo](./images/aituber-onair-demo.png)

## What you can build

- AI VTubers that chat and speak with live viewers
- Streaming assistants that react to YouTube / Twitch comments
- AI character apps with text, voice, vision, and long-term memory
- Viewer relationship systems with points, levels, and achievements
- Browser- and Node.js-based integrations, composed from independent packages

## Start in 10 minutes

If you want the shortest path to a local AI VTuber:

```bash
npm create aituber-onair@latest my-aituber
cd my-aituber
npm run dev
```

Then open the app, choose a template, and configure your LLM / TTS provider
from **Settings**. See the [Quickstart](./docs/quickstart.md) for the full
walkthrough.

## Choose your path

### 1. Try the hosted web app

[AITuber OnAir](https://aituberonair.com) is a full, standalone AITuber streaming web app built on top of `@aituber-onair/core`. It's both the quickest way to experience the toolkit end-to-end and a working reference for what you can ship with it. No setup required.

### 2. Create a starter app

Use `create-aituber-onair` to scaffold your own app from an official PNGTuber,
VRM, or Live2D starter template.

```bash
npm create aituber-onair@latest
```

The CLI asks for a project name, template, and whether to install
dependencies. You can also pass the project name up front:

```bash
npm create aituber-onair@latest my-aituber
cd my-aituber
npm run dev
```

For step-by-step setup and template selection, see
[Quickstart](./docs/quickstart.md).

### 3. Run an example app locally

Four full, ready-to-run React apps built on `@aituber-onair/core`. Pick the
avatar style that fits your project. All four share the same broad LLM / TTS
provider coverage and in-app **Settings** UI.

#### PNGTuber Chat — 2D PNG avatar

![PNGTuber example app](./packages/core/examples/react-pngtuber-app/images/react-pngtuber-app.png)

Swap in 4 PNG states (mouth/eyes open/close) and get real-time lip-sync driven from actual audio output. See [`packages/core/examples/react-pngtuber-app`](./packages/core/examples/react-pngtuber-app).

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-pngtuber-app
npm install
npm run dev
```

#### Pet Chat — animated Codex Pet-style sprite

![Pet example app](./packages/core/examples/react-pet-app/images/react-pet-app.jpg)

Render a Codex Pet-compatible spritesheet, move it around the stage, and switch
animations from chat state, reply mood, and real-time audio volume. See
[`packages/core/examples/react-pet-app`](./packages/core/examples/react-pet-app).

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-pet-app
npm install
npm run dev
```

#### VRM Chat — 3D VRM avatar

![VRM example app](./packages/core/examples/react-vrm-app/images/react-vrm-app.png)

Render a 3D VRM avatar (`miko.vrm`) with optional idle VRMA animation, real-time mouth lip-sync driven from audio output, and camera controls (drag to rotate / wheel to zoom). See [`packages/core/examples/react-vrm-app`](./packages/core/examples/react-vrm-app).

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-vrm-app
npm install
npm run dev
```

#### Live2D Chat — local Live2D folder loader

![Live2D example app with Hiyori Momose](./packages/core/examples/react-live2d-app/images/react-live2d-app-hiyori.png)

<p align="center">
  <small>
    Live2D sample model: Hiyori Momose. Illustration: Kani Biimu;
    Modeling: Live2D Inc. This content uses sample data owned and copyrighted
    by Live2D Inc. See
    <a href="https://www.live2d.com/en/learn/sample/">Live2D Sample Data</a>.
  </small>
</p>

Load a local Live2D model folder that contains `.model3.json`, render it in
the browser, and drive mouth movement from actual audio output volume. This
example intentionally does not bundle any Live2D assets. See
[`packages/core/examples/react-live2d-app`](./packages/core/examples/react-live2d-app).

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-live2d-app
npm install
npm run dev
```

Open `http://localhost:5173` in any case, then set API keys and provider options in **Settings**.

See [Examples](./docs/examples.md) for the full example map and recommended
starting points.

### 4. Build your own with the packages

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

## Documentation

- [Quickstart](./docs/quickstart.md): create a starter app, pick a template,
  configure providers, and run locally.
- [Examples](./docs/examples.md): choose from full AI VTuber apps, package
  examples, bot examples, and local runtime examples.

## Packages

### [create-aituber-onair](./packages/create-aituber-onair/README.md)

<p align="center">
  <img src="./packages/create-aituber-onair/images/create-aituber-onair.png" alt="create-aituber-onair logo" width="360" />
</p>

CLI for creating an AITuber OnAir app from an official starter template.
Currently includes PNGTuber and VRM templates with bundled starter assets.
```bash
npm create aituber-onair@latest
```

### [@aituber-onair/core](./packages/core/README.md)

<p align="center">
  <img src="./packages/core/images/aituber-onair-core.png" alt="AITuber OnAir Core logo" width="360" />
</p>

Core runtime tying chat, voice, memory, and conversation context together for full AITuber experiences.
```bash
npm install @aituber-onair/core
```

### [@aituber-onair/chat](./packages/chat/README.md)

<p align="center">
  <img src="./packages/chat/images/aituber-onair-chat.png" alt="AITuber OnAir Chat logo" width="360" />
</p>

Unified LLM layer across OpenAI, Claude, Gemini, Z.ai, Kimi, DeepSeek, Mistral, and OpenRouter — streaming, tool/function calling, vision, and MCP support included.
```bash
npm install @aituber-onair/chat
```

### [@aituber-onair/voice](./packages/voice/README.md)

<p align="center">
  <img src="./packages/voice/images/aituber-onair-voice.png" alt="AITuber OnAir Voice logo" width="360" />
</p>

Standalone TTS library with VOICEVOX, VoicePeak, OpenAI TTS, MiniMax, AIVIS Speech, and more, plus emotion-aware synthesis.
```bash
npm install @aituber-onair/voice
```

### [@aituber-onair/manneri](./packages/manneri/README.md)

<p align="center">
  <img src="./packages/manneri/images/aituber-onair-manneri.png" alt="AITuber OnAir Manneri logo" width="360" />
</p>

Detects repetitive conversation patterns and injects topic-diversification prompts to keep dialogue fresh.
```bash
npm install @aituber-onair/manneri
```

### [@aituber-onair/noise](./packages/noise/README.md)

<p align="center">
  <img src="./packages/noise/images/aituber-onair-noise.png" alt="AITuber OnAir Noise logo" width="360" />
</p>

Post-generation rewrite engine that keeps AI character replies from landing too safely: detects predictable phrasing, builds structured friction, asks an LLM for rewrite candidates, and selects the safest non-generic response.
```bash
npm install @aituber-onair/noise
```

### [@aituber-onair/comment-intelligence](./packages/comment-intelligence/README.md)

<p align="center">
  <img src="./packages/comment-intelligence/images/aituber-onair-comment-intelligence.png" alt="AITuber OnAir Comment Intelligence logo" width="360" />
</p>

Filters live comments before they reach an AI character: selects one comment to answer, blocks unsafe input, summarizes ignored comments, and builds compact LLM context. Rules-first with optional LLM-assisted analysis.
```bash
npm install @aituber-onair/comment-intelligence
```

### [@aituber-onair/bushitsu-client](./packages/bushitsu-client/README.md)

<p align="center">
  <img src="./packages/bushitsu-client/images/aituber-onair-bushitsu-client.png" alt="AITuber OnAir Bushitsu Client logo" width="360" />
</p>

WebSocket chat client with React hooks, auto-reconnect, rate limiting, mentions, and voice integration. Browser and Node.js.
```bash
npm install @aituber-onair/bushitsu-client
```

### [@aituber-onair/kizuna](./packages/kizuna/README.md)

<p align="center">
  <img src="./packages/kizuna/images/aituber-onair-kizuna.png" alt="AITuber OnAir Kizuna logo" width="360" />
</p>

Relationship / bond system (絆) for AI characters and viewers: points, achievements, emotion-based bonuses, level progression, persistent storage.
```bash
npm install @aituber-onair/kizuna
```

## Why AITuber OnAir

- Proven in production — powers [AITuber OnAir](https://aituberonair.com), a live AITuber streaming web app, so you're building on the same code path a real product ships on
- Pick any entry point: hosted web app, starter CLI, self-hosted example, or modular npm packages
- First-class coverage of the providers AITuber builders actually use — OpenAI / Claude / Gemini for chat, VOICEVOX / OpenAI TTS / AIVIS Speech and more for voice
- Chat, voice, streaming (YouTube / Twitch / WebSocket), and viewer relationships in a single, consistent stack
- MIT-licensed TypeScript — you keep control of hosting, data, and integrations

## Project structure

```txt
aituber-onair/
└── packages/
    ├── create-aituber-onair/ # npm create CLI with starter templates
    ├── core/             # AITuberOnAirCore, memory, orchestration
    ├── chat/             # LLM providers, streaming, tools, MCP
    ├── voice/            # TTS engines, emotion, playback
    ├── manneri/          # Conversation pattern detection
    ├── noise/            # Post-generation response rewriting
    ├── comment-intelligence/ # Live comment filtering and context building
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
