# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AITuber OnAir is a TypeScript monorepo that provides a comprehensive toolkit for creating AI-powered virtual streamers (AITubers). The project consists of six main packages:

- **`@aituber-onair/core`** - Core library for AI-driven virtual streaming applications with memory management and event-driven architecture
- **`@aituber-onair/chat`** - Chat and LLM API integration library supporting multiple AI providers (OpenAI, Claude, Gemini) with unified interface
- **`@aituber-onair/voice`** - Independent voice synthesis library supporting multiple TTS engines (VOICEVOX, VoicePeak, OpenAI TTS, NijiVoice, MiniMax, etc.)
- **`@aituber-onair/manneri`** - Conversation pattern detection library that identifies repetitive dialogue and provides topic diversification prompts
- **`@aituber-onair/bushitsu-client`** - WebSocket client library for chat functionality with React hooks support, auto-reconnection, rate limiting, and mention support
- **`@aituber-onair/kizuna`** - Sophisticated bond system for managing user-AI character relationships with points, achievements, and emotion-based interactions

Each package can be used independently or together. The chat package handles LLM interactions, voice package provides TTS functionality, manneri handles conversation variety, bushitsu-client enables WebSocket chat communication, kizuna manages user relationships and engagement, and core integrates everything for full AITuber functionality.

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

# Package-specific commands (replace [package] with: core, chat, voice, manneri, bushitsu-client, or kizuna)
cd packages/[package] && npm run build      # Build specific package
cd packages/[package] && npm run typecheck  # Type check only
cd packages/[package] && npm run test       # Run tests
cd packages/[package] && npm run test:watch # Watch mode
```

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
└── kizuna/         # KizunaManager, storage providers, point system
    └── examples/   # Bond system implementation examples
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
   - Creates GitHub releases with changelogs

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

**IMPORTANT**: Never use `npm publish` directly - all publishing is automated via CI/CD

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
- **Browser Compatibility**: Kizuna and Manneri designed for zero external dependencies

---

For detailed API documentation and advanced usage, refer to individual package README files and the examples directory.