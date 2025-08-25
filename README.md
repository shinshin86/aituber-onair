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
  Chat and LLM API integration library for AITuber OnAir. Provides a unified interface for interacting with various AI chat providers including OpenAI, Claude (Anthropic), and Google Gemini. Features streaming responses, tool/function calling, vision support, and emotion detection.
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

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated releases.

### Creating a Release

#### Automated Release (Recommended)

1. **Create a changeset for your changes**
   ```bash
   npm run changeset
   ```
   - Select the packages that were modified
   - Choose the appropriate version bump (patch/minor/major)
   - Write a clear description of the changes

2. **Commit the changeset file**
   ```bash
   git add .changeset/
   git commit -m "Add changeset for [your feature]"
   ```

3. **Push to GitHub and create a PR**
   - After merging to main, the GitHub Action will automatically create a "Version Packages" PR
   - This PR will include all pending changesets

4. **Merge the Version PR**
   - Review and merge the "Version Packages" PR
   - This will automatically:
     - Update package versions
     - Update CHANGELOG.md files
     - Create git tags
     - Publish packages to npm

#### Manual Release (if needed)

For a complete manual release workflow:

**Option 1: Using Changesets**
1. **Create changeset for your changes**
   ```bash
   npm run changeset
   ```

2. **Update package versions**
   ```bash
   npm run changeset:version
   ```

3. **Release (build, test, and publish)**
   ```bash
   npm run release
   ```

**Option 2: Manual Version Management**
If changeset interactive mode fails:

1. **Update CHANGELOG.md**: Add entry to `packages/[package]/CHANGELOG.md`
   ```markdown
   ## 0.x.x
   
   ### Patch Changes
   
   - Your change description here
   ```

2. **Update package.json**: Increment version in `packages/[package]/package.json`

3. **Commit changes**: Commit both CHANGELOG.md and package.json updates

4. **Build and test**: `npm run build && npm run test`

5. **Publish**: `npm run changeset:publish` or `cd packages/[package] && npm publish`

Alternative individual operations:
```bash
# Check what would be published
npm run changeset:publish -- --dry-run

# Manually publish packages (after changeset:version)
npm run changeset:publish
```

**Note**: `npm run release` executes `build → test → publish` in sequence. If any step fails, the process stops and packages won't be published.

## License

This project is open-sourced under the [MIT License](./LICENSE).

## Special Thanks

This project is based on [the work referenced below](https://x.com/shinshin86/status/1862806042603847905). Without the contributions of these pioneers, I would not have been able to create it.