# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AITuber OnAir is a TypeScript monorepo that provides a comprehensive toolkit for creating AI-powered virtual streamers (AITubers). The project consists of seven main packages:

- **`@aituber-onair/core`** - Core library for AI-driven virtual streaming applications with memory management and event-driven architecture
- **`@aituber-onair/chat`** - Chat and LLM API integration library supporting multiple AI providers (OpenAI, Claude, Gemini) with unified interface
- **`@aituber-onair/voice`** - Independent voice synthesis library supporting multiple TTS engines (VOICEVOX, VoicePeak, OpenAI TTS, MiniMax, etc.)
- **`@aituber-onair/manneri`** - Conversation pattern detection library that identifies repetitive dialogue and provides topic diversification prompts
- **`@aituber-onair/bushitsu-client`** - WebSocket client library for chat functionality with React hooks support, auto-reconnection, rate limiting, and mention support
- **`@aituber-onair/kizuna`** - Sophisticated bond system for managing user-AI character relationships with points, achievements, and emotion-based interactions
- **`@aituber-onair/noise`** - Context-aware response noise engine (deviation orchestration) that rewrites overly predictable LLM replies after generation, with rhythm/relationship/sincerity gates and a reaction-learning loop

Each package can be used independently or together. The chat package handles LLM interactions, voice package provides TTS functionality, manneri handles conversation variety, bushitsu-client enables WebSocket chat communication, kizuna manages user relationships and engagement, noise disturbs overly predictable response landings after generation, and core integrates everything for full AITuber functionality.

## Common Development Commands

```bash
# Build all workspace packages
npm run build

# Run all tests
npm run test

# Format code with Biome
npm run fmt

# Run linting
npm run lint

# Package-specific commands (replace [package] with: core, chat, voice, manneri, bushitsu-client, kizuna, or noise)
cd packages/[package] && npm run build      # Build specific package
cd packages/[package] && npm run typecheck  # Type check only
cd packages/[package] && npm run test       # Run tests
cd packages/[package] && npm run test:watch # Watch mode
```

### Mandatory Validation After Changes

After any code fix/change, always run `fmt`, then `build`, then `test` for the
affected scope before finishing the task.

### Definition of Done (DoD)

Before push/PR, always run the following repository-wide commands in this order and ensure all pass:

```bash
npm run fmt
npm run lint
npm run test
npm run build
```

## Agent Skills

This repository uses open-format Agent Skills and keeps Codex and Claude Code
skill definitions aligned.

- Skill guide: `docs/agent-skills.md`
- Model/provider update guide:
  `docs/agent-model-provider-guidelines.md`
- For any LLM/TTS model or provider addition/update, first read
  `docs/agent-model-provider-guidelines.md`. Do not add a model/provider to
  supported lists unless the exact endpoint family, request shape, response
  shape, capabilities, and user configuration path are documented or
  live-verified.
- Skills:
  - `add-chat-model`
  - `add-tts-provider`
  - `sync-core-after-chat-upgrade`
  - `wrap-tts-as-openai-compatible`
  - `connect-colab-local-tts`
- Canonical sources:
  - `skills/add-chat-model/SKILL.md`
  - `skills/add-tts-provider/SKILL.md`
  - `skills/sync-core-after-chat-upgrade/SKILL.md`
  - `skills/wrap-tts-as-openai-compatible/SKILL.md`
  - `skills/connect-colab-local-tts/SKILL.md`
- Claude Code runtime paths:
  - `.claude/skills/add-chat-model/SKILL.md`
  - `.claude/skills/add-tts-provider/SKILL.md`
  - `.claude/skills/sync-core-after-chat-upgrade/SKILL.md`
  - `.claude/skills/wrap-tts-as-openai-compatible/SKILL.md`
  - `.claude/skills/connect-colab-local-tts/SKILL.md`

Usage:

- Invoke explicitly with `$add-chat-model`, or use prompts like
  "add a new model", "support model <model_id>", or
  "update supported models". Apply the hard gates in
  `docs/agent-model-provider-guidelines.md` before editing supported lists.
- Invoke explicitly with `$add-tts-provider`, or use prompts like
  "add a TTS provider", "support <provider> TTS", or
  "update supported voice providers". Apply the hard gates in
  `docs/agent-model-provider-guidelines.md` before adding first-class support.
- Invoke `$sync-core-after-chat-upgrade` after chat upgrades when the same
  changes must be propagated into core and core examples.
- When propagating `@aituber-onair/voice` upgrades into `@aituber-onair/core`,
  update all core React examples that expose TTS settings, not only
  `react-basic`: `packages/core/examples/react-basic`,
  `packages/core/examples/react-pngtuber-app`,
  `packages/core/examples/react-pet-app`,
  `packages/core/examples/react-vrm-app`,
  `packages/core/examples/react-live2d-app`, and
  `packages/core/examples/react-purupuru-app`. For every new TTS provider, check
  the engine selector, persisted settings type/defaults, settings UI,
  `VoiceServiceOptions` wiring, README mention, lockfile metadata, and example
  build. If the provider has a voice-list API, surface it as a selectable list
  so users do not have to type opaque voice IDs.
- Invoke explicitly with `$wrap-tts-as-openai-compatible`, or use prompts like
  "wrap a TTS engine as OpenAI-compatible", "build an OpenAI-compatible speech
  server", or "set up a Colab TTS compatibility server".
- For `$wrap-tts-as-openai-compatible`, classify the upstream TTS as direct
  Python API, CLI/file-output, or internal runtime plus save helper before
  choosing the adapter shape, and validate from `@aituber-onair/voice` when
  relevant.
- Prefer this skill for practical local TTS engines with clean one-shot WAV
  generation. Do not force research-first or streaming-first systems into this
  workflow.
- Invoke explicitly with `$connect-colab-local-tts`, or use prompts like
  "connect Colab local TTS", "launch local-tts-on-google-colab with Colab MCP
  Go", or "try a Colab OpenAI-compatible TTS URL from @aituber-onair/voice".
- Invoke explicitly with `$create-pngtuber-avatar-states`, or use prompts like
  "create PNGTuber avatar state images", "generate mouth and eye open-close
  variants", "split a 2x2 avatar sheet", "remove avatar background", or
  "align avatar state images". Claude Code cannot run the image-generation
  phase of this skill. In Claude Code, use it only for existing image files:
  splitting sheets, removing suitable plain backgrounds, aligning states, and
  validating outputs.
- If input is missing, collect:
  `provider`, `model_id`, `model_const_name`, `display_name`,
  `supports_vision`, and optional `bump_version` (default `false`; set `true`
  only when release/version work is explicitly requested).
- For `$add-tts-provider`, collect:
  `engine_type`, `engine_class_name`, `display_name`, `provider_kind`,
  `default_speaker`, `requires_api_key`, `supports_emotion`,
  `option_fields`, and optional `default_api_url`, `examples_scope`,
  `bump_version` (default `false`; set `true` only when release/version work is
  explicitly requested).
- Follow the skill procedure end-to-end, including tests/docs/versioning
  updates and final verification commands.
- After `add-chat-model` completes, ask whether to run
  `$sync-core-after-chat-upgrade` unless end-to-end chat+core propagation was
  already requested.

Maintenance:

- Edit `skills/add-chat-model/SKILL.md` first.
- Sync the same content to `.claude/skills/add-chat-model/SKILL.md`.
- Keep `skills/add-chat-model/agents/openai.yaml` aligned for Codex UI.
- For TTS provider workflow updates, edit
  `skills/add-tts-provider/SKILL.md`, sync to
  `.claude/skills/add-tts-provider/SKILL.md`, and keep
  `skills/add-tts-provider/agents/openai.yaml` aligned.
- For core-propagation workflow updates, edit
  `skills/sync-core-after-chat-upgrade/SKILL.md` and sync to
  `.claude/skills/sync-core-after-chat-upgrade/SKILL.md`.
- For TTS compatibility-wrapper workflow updates, edit
  `skills/wrap-tts-as-openai-compatible/SKILL.md` and sync to
  `.claude/skills/wrap-tts-as-openai-compatible/SKILL.md`.
- For Colab local TTS connection workflow updates, edit
  `skills/connect-colab-local-tts/SKILL.md` and sync to
  `.claude/skills/connect-colab-local-tts/SKILL.md`.
- For PNGTuber avatar state image workflow updates, edit
  `skills/create-pngtuber-avatar-states/SKILL.md` and sync to
  `.claude/skills/create-pngtuber-avatar-states/SKILL.md`.

## System Architecture

### Core Components

1. **AITuberOnAirCore** (`packages/core/src/core/AITuberOnAirCore.ts`) - Main orchestrator extending EventEmitter
2. **ChatProcessor** (`packages/core/src/core/ChatProcessor.ts`) - AI conversation flow and streaming responses
3. **MemoryManager** (`packages/core/src/core/MemoryManager.ts`) - Short/mid/long-term memory system with auto-summarization

### Service Architecture

- **Chat Services** (`@aituber-onair/chat`) - Provider abstraction for OpenAI, Claude, Gemini with unified interface
- **Voice Services** (`@aituber-onair/voice`) - Multi-engine TTS support with emotion-aware synthesis
- Event-driven architecture enables loose coupling and reactive external applications

### Code Organization

```
packages/
├── core/           # AITuberOnAirCore, ChatProcessor, MemoryManager, YouTube services
│   └── examples/   # Usage examples for core functionality
├── chat/           # ChatService interface, provider implementations, MCP support
│   └── examples/   # Chat service usage examples
├── voice/          # VoiceService, TTS engines, emotion parsing, audio playback
│   └── examples/   # Voice synthesis examples
├── manneri/        # ManneriDetector, analyzers, prompt generation
│   └── examples/   # Conversation pattern detection examples
├── bushitsu-client/# WebSocket client, React hooks
│   └── examples/   # WebSocket client usage examples
├── kizuna/         # KizunaManager, storage providers, point system
│   └── examples/   # Bond system implementation examples
└── noise/          # Contaminator pipeline, gates, gag ledger, reaction loop
    └── examples/   # Browser labs for noise rewrites and session simulation
```

Each package contains an `examples/` directory with code samples demonstrating typical usage patterns and integration scenarios.

## Architecture & Guidelines

### Key Development Rules
- All code and comments must be in English
- Maintain strong TypeScript typing
- Minimize external dependencies
- Use barrel exports (index.ts) to control public API
- Document public APIs with JSDoc comments
- Prefer async/await for potentially long operations
- Use Vitest for all tests following AAA pattern
- In docs, do not single out a specific model/provider as an unexplained
  exception. State the general rule first (which group it belongs to and why),
  then name the current instances — e.g., "providers whose APIs cannot be
  called directly from the browser are shown disabled — currently only
  Sakana AI" instead of "Sakana AI is disabled here"

### Important Considerations

1. **Memory Management**: MemoryManager prevents token limit issues by summarizing old conversations
2. **Provider Differences**: Library abstracts streaming/function calling differences between AI providers
3. **Package Independence**: All packages can be used standalone without dependencies on each other
4. **Cross-Platform Support**: Voice package supports Browser, Node.js, Bun, Deno with automatic detection
5. **MCP Support**: All chat providers support Model Context Protocol with provider-specific implementations
6. **Conversation Pattern Detection**: Manneri uses simple intervention prompts for topic diversification
7. **Browser Compatibility**: Kizuna uses dependency injection for Node.js file system operations

## Cross-Platform Runtime Support

| Runtime | Module Format | Audio Playback | Package Support |
|---------|---------------|----------------|-----------------|
| **Browser** | ESModule | HTMLAudioElement | All packages |
| **Node.js** | CommonJS | speaker/play-sound | All packages |
| **Bun** | CommonJS | speaker/play-sound | All packages |
| **Deno** | CommonJS | File output only | Limited audio |

Voice package uses dual build (CommonJS + ESModule) with automatic runtime detection. Audio libraries (`speaker`, `play-sound`) must be installed separately for Node.js/Bun environments.

## MCP (Model Context Protocol) Integration

### Provider Implementations
- **OpenAI/Claude**: Direct server-to-server MCP integration via native support
- **Gemini**: Function calling integration requiring browser proxy for CORS

### Tool Naming Convention
Format: `mcp_{serverName}_{toolName}` (e.g., `mcp_deepwiki_search`)

### Key Files
- `GeminiChatService.ts` - MCP schema initialization with timeout handling
- `MCPSchemaFetcher.ts` - Dynamic schema fetching and fallback tools
- `ToolExecutor.ts` - MCP request routing and error handling

## MCP Tools for Code Intelligence

When lsmcp MCP server is connected, prefer these TypeScript-aware tools:
- **lsmcp_rename_symbol** - Rename across entire codebase
- **lsmcp_move_file/directory** - Move with automatic import updates
- **lsmcp_delete_symbol** - Safe deletion with reference removal
- **lsmcp_search_symbols** - Fast project-wide symbol search
- **lsmcp_get_type_at_symbol** - Detailed type information
- **lsmcp_find_import_candidates** - Import path suggestions

## Package Usage

### Installation
```bash
# Individual packages
npm install @aituber-onair/chat      # LLM integration only
npm install @aituber-onair/voice     # TTS only
npm install @aituber-onair/manneri   # Conversation patterns only
npm install @aituber-onair/bushitsu-client  # WebSocket chat only
npm install @aituber-onair/kizuna    # User relationships only

# Full AITuber functionality (includes chat and voice)
npm install @aituber-onair/core

# Optional audio for Node.js/Bun (choose one)
npm install speaker      # Real-time PCM streaming
npm install play-sound   # System audio player
```

### Quick Examples

```typescript
// Chat Package
import { ChatServiceFactory } from '@aituber-onair/chat';
const chatService = ChatServiceFactory.createChatService('openai', { apiKey: 'key' });

// Voice Package
import { VoiceEngineAdapter } from '@aituber-onair/voice';
const voiceService = new VoiceEngineAdapter({ engineType: 'openai', apiKey: 'key' });

// Core Package (full integration)
import { AITuberOnAirCore } from '@aituber-onair/core';
const core = new AITuberOnAirCore({ apiKey: 'key', chatOptions: {}, voiceOptions: {} });
await core.initialize();
```

For detailed examples, see `examples/` directory for each package.

## CI/CD & Release Management

### CI/CD Pipeline Overview

The project uses GitHub Actions for automated testing, validation, and publishing:

1. **PR Checks** (`.github/workflows/ci.yml`)
   - Runs on every pull request
   - Executes tests (`npm run test`) for all packages
   - Performs linting (`npm run lint`) and formatting checks
   - TypeScript type checking for all packages
   - Build validation to ensure packages compile correctly

2. **Release Workflow** (`.github/workflows/release.yml`)
   - Triggered on merges to main branch
   - Detects version changes in package.json files
   - Automatically publishes updated packages to npm registry
   - Creates GitHub releases for packages published in that run (via `changesets/action@v1` with `createGithubReleases: true`)

### Release Management

This project manages releases through manual version updates and CHANGELOG maintenance:

1. **Release Process**
   - Manually update version numbers in each affected `package.json`
   - Add release notes to each package's `CHANGELOG.md` (e.g., `packages/chat/CHANGELOG.md`)
   - Create PR with version updates and changelog entries
   - After PR merge, GitHub Actions automatically publishes to npm

2. **CHANGELOG Format**
   - Each package maintains its own CHANGELOG.md
   - Document changes under appropriate version headers
   - Categorize changes (Major Changes, Minor Changes, Patch Changes)
   - Include detailed descriptions of new features and breaking changes

3. **Version Bump Guidelines**
   - **Patch**: Bug fixes, dependency updates
   - **Minor**: New features, backward-compatible changes
   - **Major**: Breaking changes to public API

4. **Cross-Package Dependency Alignment (Single-Package Release)**
   - If package `A` is released as a new **minor** version and package `B` depends on `A`, update `B`'s dependency range to include the new `A` version (for example, `^0.11.1` -> `^0.12.0`).
   - This dependency-range update in `B` is a release-consistency change and does **not** require publishing `B` by itself.
   - Only packages whose own `version` field is bumped are published by `release.yml`.
   - Always regenerate `package-lock.json` after version/range updates and validate with:
     - `npm install --package-lock-only`
     - `npm ci`
   - Before opening PR, ensure the target package tests still pass (for example: `npm -w @aituber-onair/chat run test`).

   **CRITICAL — `npm ci` will fail without these steps:**
   In this monorepo, all packages use `0.x` versioning. Under semver, `^0.x.y`
   ranges do **not** span minor bumps (e.g. `^0.22.0` matches `>=0.22.0 <0.23.0`,
   so `0.23.0` is **excluded**). If you bump package `A` to a new minor version
   but forget to update the dependent range in package `B`, `npm ci` in CI will
   fail because the lockfile becomes inconsistent with the workspace.

   **Required steps for every version bump commit:**
   1. Bump the target package version in its `package.json`.
   2. Update **all** workspace consumers' dependency ranges (e.g. core's
      `@aituber-onair/chat` range).
   3. Run `npm install --package-lock-only` to regenerate `package-lock.json`.
   4. Run `npm ci` locally to verify.
   5. Include `package-lock.json` **and** consumer `package.json` range updates
      in the **same commit** (or at least the same PR) as the version bump.

**IMPORTANT**: Never use `npm publish` directly - all publishing is automated via CI/CD

### Failure Recovery Notes
- If release CI fails mid-run, some packages may be published and tagged while others are not.
- Re-running the release workflow only publishes remaining packages; it does **not** create GitHub Releases for packages already published in a previous run.
- If a GitHub Release is missing, create it manually using the existing tag and the package CHANGELOG section.

### Publishing Requirements
Essential `package.json` fields:
```json
{
  "files": ["dist", "README.md"],
  "scripts": {
    "prepublishOnly": "npm run build"
  },
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts"
}
```

## Package Dependency Strategy

- **Core**: Includes chat and voice as dependencies for full functionality
- **Chat, Voice, Manneri, Bushitsu-client, Kizuna**: Completely independent, zero inter-package dependencies
- **Noise**: Depends only on chat (lazily loaded) for the optional built-in LLM rewrite backend; custom `model` adapters need no dependency
- **Browser Compatibility**: Kizuna and Manneri designed for zero external dependencies

---

For detailed API documentation and advanced usage, refer to individual package README files and the examples directory.
