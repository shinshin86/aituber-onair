# AITuber OnAir
[![CI](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml/badge.svg)](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/shinshin86/aituber-onair)

![AITuber OnAir Toolkit - logo](./images/aituber-onair-toolkit.png)

[日本語版はこちら](./README_ja.md)

Welcome to the **AITuber OnAir** monorepo!  
This repository open-sources the AITuber streaming processes used in [AITuber OnAir](https://aituberonair.com), a web application for AITuber/AIVTuber streaming.

It contains various packages and tools for AI-powered chat, TTS, virtual streaming, and related features. You can also run a [simple chat app](https://github.com/shinshin86/aituber-onair/tree/main/packages/core/examples/react-basic) using these systems on your local PC or self-host it.

![AITuber OnAir Demo](./images/aituber-onair-demo.png)
(This is the AITuber OnAir interface)

Currently, the primary packages available are:

- [**@aituber-onair/core**](./packages/core/README.md)
  A TypeScript library for generating text and audio responses in AI Tuber streaming scenarios. It provides seamless integration with various AI and speech APIs, as well as memory and conversation context management.
  ```
  npm install @aituber-onair/core
  ```

- [**@aituber-onair/voice**](./packages/voice/README.md)
  An independent voice synthesis library supporting multiple TTS engines (VOICEVOX, VoicePeak, OpenAI TTS, NijiVoice, MiniMax, AIVIS Speech, etc.). Can be used standalone or integrated with the core package for full AITuber functionality.
  ```
  npm install @aituber-onair/voice
  ```

- [**@aituber-onair/manneri**](./packages/manneri/README.md)
  A conversation pattern detection library that identifies repetitive dialogue patterns and provides topic diversification prompts. Features simple configuration with customizable intervention messages for maintaining engaging conversations.
  ```
  npm install @aituber-onair/manneri
  ```

- [**@aituber-onair/bushitsu-client**](./packages/bushitsu-client/README.md)
  WebSocket client library for chat functionality with React hooks support. Provides WebSocket client and React hooks for real-time chat communication with auto-reconnection, rate limiting, mention support, and voice synthesis integration. Works in both browser and Node.js environments.
  ```
  npm install @aituber-onair/bushitsu-client
  ```

- [**@aituber-onair/kizuna**](./packages/kizuna/README.md)
  Sophisticated bond system (絆 - "Kizuna") for managing user-AI character relationships. Features points-based engagement system with customizable rules, achievements, emotion-based bonuses, level progression, and persistent storage. Supports YouTube, Twitch, and WebSocket platforms.
  ```
  npm install @aituber-onair/kizuna
  ```

- [**@aituber-onair/chat**](./packages/chat/README.md)
  Chat and LLM API integration library for AITuber OnAir. Provides a unified interface for interacting with various AI chat providers including OpenAI, Claude (Anthropic), Google Gemini, Z.ai, Kimi, and OpenRouter. Features streaming responses, tool/function calling, vision support, and emotion detection.
  ```
  npm install @aituber-onair/chat
  ```

## Getting Started

1. **Clone the repository**  
   ```bash
   git clone https://github.com/shinshin86/aituber-onair.git
   cd aituber-onair
   ```

2. **Install dependencies**  
   This monorepo uses **npm workspaces**. Simply run:
   ```bash
   npm install
   ```

3. **Build all packages**  
   ```bash
   npm run build
   ```
   - This runs the build script for each package in the `packages/` directory.

4. **Test all packages**  
   ```bash
   npm run test
   ```
   - Runs the test suite for each package.

5. **Format all packages**
   ```bash
   npm run fmt
   ```
   - Runs the format for each package.

## Project Structure

```
aituber-onair/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   ├── voice/
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   ├── chat/
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   ├── manneri/
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   ├── bushitsu-client/
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   └── kizuna/
│       ├── src/
│       ├── tests/
│       └── package.json
├── package.json
├── README.md
└── ...
```

- **packages/core**: The main library (`@aituber-onair/core`) providing AITuber core functionality.
- **packages/voice**: The voice synthesis library (`@aituber-onair/voice`) supporting multiple TTS engines.
- **packages/chat**: The chat and LLM API integration library (`@aituber-onair/chat`) for AI provider interactions.
- **packages/manneri**: The conversation pattern detection library (`@aituber-onair/manneri`) for identifying repetitive dialogue patterns.
- **packages/bushitsu-client**: The WebSocket client library (`@aituber-onair/bushitsu-client`) for chat functionality with React hooks support.
- **packages/kizuna**: The user-AI relationship management library (`@aituber-onair/kizuna`) for engagement tracking.

## Release Process

Releases are managed via **manual version updates and CHANGELOG maintenance**.

1. **Bump versions**: Update `version` in each affected `packages/[package]/package.json`
2. **Update CHANGELOGs**: Add release notes in `packages/[package]/CHANGELOG.md`
3. **Open a PR**: Include version and CHANGELOG updates in the PR
4. **CI publishes**: After merging to main, GitHub Actions publishes to npm

Version bump guidelines:
- **Patch**: Bug fixes, dependency updates, backward-compatible changes
- **Minor**: New features, backward-compatible changes
- **Major**: Breaking changes to public API

CHANGELOG format:
- Maintain a `CHANGELOG.md` per package
- Organize entries under `Major Changes / Minor Changes / Patch Changes`

Note: Do not run `npm publish` directly.

## License

This project is open-sourced under the [MIT License](./LICENSE).

## Special Thanks

This project is based on [the work referenced below](https://x.com/shinshin86/status/1862806042603847905). Without the contributions of these pioneers, I would not have been able to create it.
