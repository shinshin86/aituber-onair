# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AITuber OnAir is a TypeScript monorepo that provides a comprehensive toolkit for creating AI-powered virtual streamers (AITubers). The project consists of two main packages:

- **`@aituber-onair/core`** - Core library for AI-driven virtual streaming applications with chat processing, conversation management, and memory capabilities
- **`@aituber-onair/voice`** - Independent voice synthesis library supporting multiple TTS engines (VOICEVOX, VoicePeak, OpenAI TTS, NijiVoice, MiniMax, etc.)

The voice package can be used independently for voice synthesis needs, or together with the core package for full AITuber functionality.

## Common Development Commands

### Build Commands
```bash
# Build all workspace packages
npm run build

# Build only the core package
cd packages/core && npm run build

# Build only the voice package
cd packages/voice && npm run build

# Type checking without building
cd packages/core && npm run typecheck
cd packages/voice && npm run typecheck
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run tests in watch mode (for active development)
cd packages/core && npm run test:watch
cd packages/voice && npm run test:watch

# Run tests with coverage report
cd packages/core && npm run test:coverage
cd packages/voice && npm run test:coverage

# Run a specific test file
cd packages/core && npx vitest run path/to/test.test.ts
cd packages/voice && npx vitest run path/to/test.test.ts
```

### Code Quality Commands
```bash
# Format code with Biome
npm run fmt

# Check formatting without making changes
npm run fmt:check

# Run linting
npm run lint
```

## High-Level Architecture

### Core Components

1. **AITuberOnAirCore** (`packages/core/src/core/AITuberOnAirCore.ts`)
   - Main integration class that orchestrates all other components
   - Extends EventEmitter for event-driven architecture
   - Manages initialization and coordination of ChatProcessor, MemoryManager, and optional VoiceService
   - Voice functionality is now provided via the separate `@aituber-onair/voice` package

2. **ChatProcessor** (`packages/core/src/core/ChatProcessor.ts`)
   - Handles AI conversation flow and streaming responses
   - Manages tool/function calling iterations
   - Extracts emotions from responses for avatar expressions
   - Supports multiple AI providers (OpenAI, Claude, Gemini)

3. **MemoryManager** (`packages/core/src/core/MemoryManager.ts`)
   - Implements short-term, mid-term, and long-term memory system
   - Automatically summarizes older conversations to prevent token limits
   - Provides pluggable persistence through MemoryStorage interface

### Service Architecture

The services are organized by provider type:

- **Chat Services** (`packages/core/src/services/chat/`)
  - Provider abstraction through `ChatServiceProvider` interface
  - Factory pattern for creating provider-specific services
  - Each provider (OpenAI, Claude, Gemini) has its own implementation

- **Voice Services** (`@aituber-onair/voice` package)
  - **Independent package** that can be used standalone or with core
  - Multiple TTS engine support (VOICEVOX, VoicePeak, OpenAI TTS, NijiVoice, MiniMax, AIVIS Speech, etc.)
  - Unified interface through VoiceEngineAdapter
  - Emotion-aware speech synthesis with automatic emotion detection
  - Browser-compatible audio playback with HTMLAudioElement support

### Event-Driven Design

The system uses an event-driven architecture where AITuberOnAirCore emits events at key processing stages:
- Processing lifecycle events (start/end)
- Streaming response events
- Tool usage events
- Memory management events
- Error events

This design allows external applications to react to internal state changes without tight coupling.

### Tool/Function Calling System

The library abstracts differences between AI providers' function calling implementations:
- Unified `ToolDefinition` interface
- Provider-specific conversions handled internally
- Support for tool iteration with configurable limits (`maxHops`)
- Event emission for tool usage and results

## Development Guidelines

### Testing Approach
- Use Vitest for all tests
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies cleanly using `vi.fn()`
- Reset mocks between tests with `vi.resetAllMocks()`
- Focus on testing public APIs and behavior, not implementation details

### Code Organization

#### Core Package (`@aituber-onair/core`)
- `/core` - Core components (AITuberOnAirCore, ChatProcessor, MemoryManager)
- `/services/chat` - Chat provider integrations (OpenAI, Claude, Gemini)
- `/services/youtube` - YouTube integration services
- `/types` - TypeScript type definitions (chat, memory, tools)
- `/utils` - Utility functions (screenshots, storage, emotion parsing)
- `/constants` - Constants and default prompts

#### Voice Package (`@aituber-onair/voice`)
- `/services` - VoiceService and VoiceEngineAdapter
- `/engines` - TTS engine implementations (VOICEVOX, VoicePeak, OpenAI, etc.)
- `/types` - Voice-related type definitions
- `/utils` - Voice utilities (screenplay conversion, emotion parsing)
- `/constants` - Voice engine constants and speaker configurations

### Key Development Rules
- All code and comments must be in English
- Maintain strong TypeScript typing
- Minimize external dependencies
- Use barrel exports (index.ts) to control public API
- Document public APIs with JSDoc comments
- Prefer async/await for potentially long operations

## Important Considerations

1. **Memory Management**: The MemoryManager prevents token limit issues by summarizing old conversations. This is crucial for long-running AITuber sessions.

2. **Provider Differences**: Each AI provider (OpenAI, Claude, Gemini) has different streaming and function calling implementations. The library abstracts these differences.

3. **Event Handling**: Applications should handle events defensively, checking for data presence before accessing properties.

4. **Voice Package Independence**: The `@aituber-onair/voice` package is completely independent and can be used without the core package. Voice engines can be switched dynamically at runtime, and custom API endpoints can be specified for self-hosted engines.

5. **Response Length Control**: The library provides both direct token limits and preset response lengths, with separate controls for text chat and vision processing.

6. **MiniMax Audio Engine**: MiniMax requires both API key and GroupId for authentication, unlike other TTS engines. It supports dual-region endpoints (global/china) and provides emotion-aware voice synthesis with advanced language recognition.

7. **Package Integration**: When using both packages together, the core package imports voice functionality from `@aituber-onair/voice`. Voice features are optional in the core package - if voice options are not provided, the system works without voice synthesis.

## MCP Tools Integration

When the lsmcp MCP server is connected (providing LSP-based code intelligence tools), leverage these capabilities for more efficient codebase exploration and refactoring:

### Available MCP Tools
- **lsmcp_move_file** - Move files and update all import statements automatically
- **lsmcp_move_directory** - Move directories and update all imports across the codebase
- **lsmcp_delete_symbol** - Delete symbols and all their references safely
- **lsmcp_rename_symbol** - Rename symbols across the entire codebase
- **lsmcp_get_type_at_symbol** - Get detailed type information for any symbol
- **lsmcp_get_module_symbols** - List all exports from a module
- **lsmcp_search_symbols** - Fast project-wide symbol search
- **lsmcp_find_import_candidates** - Find and suggest imports for symbols

### When to Use MCP Tools
If these MCP tools are available in your environment, prefer them over manual operations for:
- **Refactoring**: Use `lsmcp_rename_symbol` instead of manual find/replace for renaming functions, classes, or variables
- **File reorganization**: Use `lsmcp_move_file` or `lsmcp_move_directory` to ensure all imports are updated correctly
- **Code exploration**: Use `lsmcp_search_symbols` and `lsmcp_get_type_at_symbol` for faster codebase navigation
- **Import management**: Use `lsmcp_find_import_candidates` to quickly find the correct import paths
- **Safe deletions**: Use `lsmcp_delete_symbol` to remove code and all its references without breaking the build

These tools provide TypeScript-aware refactoring that maintains code integrity and prevents common errors from manual edits.

## Package Usage Examples

### Using Voice Package Independently

```typescript
import { VoiceEngineAdapter, VoiceServiceOptions } from '@aituber-onair/voice';

const voiceOptions: VoiceServiceOptions = {
  speaker: 'aivis',
  engineType: 'aivisSpeech',
  apiKey: 'your-api-key',
  onPlay: async (audioBuffer) => {
    // Handle audio playback
  }
};

const voiceService = new VoiceEngineAdapter(voiceOptions);
await voiceService.speak({ text: 'Hello, world!' });
```

### Using Both Packages Together

```typescript
import { AITuberOnAirCore, AITuberOnAirCoreOptions } from '@aituber-onair/core';
import { VoiceServiceOptions } from '@aituber-onair/voice';

const coreOptions: AITuberOnAirCoreOptions = {
  apiKey: 'your-openai-key',
  chatOptions: {
    systemPrompt: 'You are a helpful AI assistant.',
    useMemory: true
  },
  voiceOptions: {
    speaker: 'aivis',
    engineType: 'aivisSpeech',
    apiKey: 'your-voice-api-key'
  }
};

const core = new AITuberOnAirCore(coreOptions);
await core.initialize();
await core.processChat('Hello!', 'chatForm');
```

### Installing Packages

```bash
# For voice functionality only
npm install @aituber-onair/voice

# For full AITuber functionality (voice included automatically)
npm install @aituber-onair/core
```

## Version Management and Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for automated version management and release processes.

### Package Versioning Strategy

- **Independent Versioning**: Each package (`@aituber-onair/core` and `@aituber-onair/voice`) maintains its own version following SemVer
- **Dependency Relationship**: Core package includes voice as a direct dependency for ease of use
- **Release Automation**: GitHub Actions automatically handle version bumping and publishing

### Development Workflow

1. **Make Changes**: Implement your feature or fix
2. **Add Changeset**: Run `npm run changeset` to document your changes
   ```bash
   npm run changeset
   ```
   - Select which packages are affected
   - Choose the appropriate semver bump (patch/minor/major)
   - Write a clear description of the changes

3. **Commit & Push**: Include the changeset file in your commit
4. **Create PR**: The changeset will be included in the pull request
5. **Merge**: After merge to main, GitHub Actions will:
   - Create a "Version Packages" PR with updated versions
   - Auto-merge and publish when the version PR is merged

### Manual Release Commands

```bash
# Check what would be published (dry run)
npm run changeset:publish -- --dry-run

# Manually version packages
npm run changeset:version

# Manually publish packages  
npm run changeset:publish

# Full release process (build, test, publish)
npm run release
```

### SemVer Guidelines

| Change Type | Version Bump | Examples |
|-------------|--------------|----------|
| **Major** | Breaking changes | Removing public APIs, changing function signatures |
| **Minor** | New features | Adding new engines, new configuration options |
| **Patch** | Bug fixes | Fixing existing functionality, documentation updates |

### Package Dependency Strategy

- **Core Package**: Uses voice as a direct dependency
  - Voice functionality is automatically included when installing core
  - Simplified installation process with single package
- **Voice Package**: Completely independent
  - Can be used standalone for TTS-only applications
  - No dependencies on core package