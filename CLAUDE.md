# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AITuber OnAir is a TypeScript monorepo that provides a comprehensive toolkit for creating AI-powered virtual streamers (AITubers). The project consists of five main packages:

- **`@aituber-onair/core`** - Core library for AI-driven virtual streaming applications with chat processing, conversation management, and memory capabilities
- **`@aituber-onair/voice`** - Independent voice synthesis library supporting multiple TTS engines (VOICEVOX, VoicePeak, OpenAI TTS, NijiVoice, MiniMax, etc.)
- **`@aituber-onair/manneri`** - Conversation pattern detection library that identifies repetitive dialogue and provides topic diversification prompts
- **`@aituber-onair/bushitsu-client`** - WebSocket client library for chat functionality with React hooks support, auto-reconnection, rate limiting, and mention support
- **`@aituber-onair/kizuna`** - Sophisticated bond system for managing user-AI character relationships with points, achievements, and emotion-based interactions

Each package can be used independently or together. The voice package provides TTS functionality, manneri handles conversation variety, bushitsu-client enables WebSocket chat communication, kizuna manages user relationships and engagement, and core integrates everything for full AITuber functionality.

## Common Development Commands

### Build Commands
```bash
# Build all workspace packages
npm run build

# Build only the core package
cd packages/core && npm run build

# Build only the voice package (dual format: CommonJS + ESModule)
cd packages/voice && npm run build

# Build only the manneri package
cd packages/manneri && npm run build

# Build only the bushitsu-client package
cd packages/bushitsu-client && npm run build

# Build only the kizuna package
cd packages/kizuna && npm run build

# Build specific format for voice package
cd packages/voice && npm run build:cjs  # CommonJS only
cd packages/voice && npm run build:esm  # ESModule only

# Type checking without building
cd packages/core && npm run typecheck
cd packages/voice && npm run typecheck
cd packages/manneri && npm run typecheck
cd packages/bushitsu-client && npm run typecheck
cd packages/kizuna && npm run typecheck
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run tests in watch mode (for active development)
cd packages/core && npm run test:watch
cd packages/voice && npm run test:watch
cd packages/manneri && npm run test:watch
cd packages/bushitsu-client && npm run test:watch
cd packages/kizuna && npm run test:watch

# Run tests with coverage report
cd packages/core && npm run test:coverage
cd packages/voice && npm run test:coverage
cd packages/manneri && npm run test:coverage
cd packages/bushitsu-client && npm run test:coverage
cd packages/kizuna && npm run test:coverage

# Run a specific test file
cd packages/core && npx vitest run path/to/test.test.ts
cd packages/voice && npx vitest run path/to/test.test.ts
cd packages/manneri && npx vitest run path/to/test.test.ts
cd packages/bushitsu-client && npx vitest run path/to/test.test.ts
cd packages/kizuna && npx vitest run path/to/test.test.ts
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
  - **Dual Package Support**: CommonJS and ESModule builds for maximum compatibility
  - **Cross-Platform Runtime Support**: Node.js, Deno, Bun, and browsers
  - Multiple TTS engine support (VOICEVOX, VoicePeak, OpenAI TTS, NijiVoice, MiniMax, AIVIS Speech, etc.)
  - Unified interface through VoiceEngineAdapter
  - Emotion-aware speech synthesis with automatic emotion detection
  - Browser-compatible audio playback with HTMLAudioElement support
  - Dynamic audio format detection (24000Hz, 44100Hz, 48000Hz)

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

#### Manneri Package (`@aituber-onair/manneri`)
- `/core` - Core components (ManneriDetector, ConversationAnalyzer)
- `/analyzers` - Analysis tools (SimilarityAnalyzer, KeywordExtractor, PatternDetector)
- `/generators` - Prompt generation (PromptGenerator)
- `/config` - Default prompts and configurations
- `/types` - TypeScript type definitions for conversation analysis
- `/utils` - Utility functions (text processing, browser compatibility)
- `/persistence` - Data persistence providers (LocalStorage, custom)

#### Bushitsu Client Package (`@aituber-onair/bushitsu-client`)
- `/client` - Core WebSocket client (BushitsuClient)
- `/hooks` - React hooks (useBushitsuClient, useBushitsuInitiative)
- `/types` - TypeScript type definitions for WebSocket communication
- `/index.ts` - Main exports for the package

#### Kizuna Package (`@aituber-onair/kizuna`)
- `/storage` - Storage providers (LocalStorageProvider, ExternalStorageProvider)
- `/utils` - Utility functions (environment detection, storage factory, user ID generation)
- `/types` - TypeScript type definitions for bond system
- `/index.ts` - Main exports for the package
- **Key Classes**: KizunaManager, UserManager, PointCalculator

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

8. **Cross-Platform Compatibility**: The voice package supports multiple runtime environments with automatic detection and appropriate audio handling for each platform.

9. **Subpath Exports**: The voice package includes subpath exports (`./dist/cjs/*`, `./dist/esm/*`) to enable direct access to build artifacts, providing workarounds for runtime-specific import issues (especially useful for Deno).

10. **Manneri Simplicity**: The `@aituber-onair/manneri` package follows a simple design principle: detect conversation patterns and provide topic diversification prompts. It uses a single `intervention` prompt type instead of complex categorizations, making it easy to customize and maintain.

11. **Conversation Pattern Detection**: Manneri detects repetitive patterns through similarity analysis, frequency detection, and topic tracking. When patterns are detected and cooldown periods have passed, it generates intervention prompts to encourage topic changes.

12. **Kizuna Browser Compatibility**: The `@aituber-onair/kizuna` package uses dependency injection for file system operations, avoiding Node.js dependencies in browser builds. Users must provide ExternalStorageAdapter implementations for Node.js environments while browsers use LocalStorageProvider automatically.

## Cross-Platform Runtime Support

The `@aituber-onair/voice` package provides comprehensive support for multiple JavaScript runtimes with automatic environment detection and appropriate handling for each platform.

### Supported Runtimes

| Runtime | Module Format | Audio Playback | Status |
|---------|---------------|----------------|--------|
| **Browser** | ESModule | HTMLAudioElement | ✅ Full Support |
| **Node.js** | CommonJS | speaker/play-sound | ✅ Full Support |
| **Bun** | CommonJS | speaker/play-sound | ✅ Full Support |
| **Deno** | CommonJS | File output only | ⚠️ Limited |

### Runtime Detection

The package automatically detects the runtime environment and selects appropriate audio handling:

```typescript
// Automatic runtime detection
const runtimeInfo = AudioPlayerFactory.getRuntimeInfo();
console.log(runtimeInfo.runtime); // "browser", "node", "bun", or "deno"
```

### Dual Package Architecture

The voice package uses a dual package structure to support both CommonJS and ESModule environments:

```
dist/
├── cjs/          # CommonJS build (Node.js, Deno, Bun)
│   └── index.js  # require() compatible
└── esm/          # ESModule build (browsers, modern bundlers)
    └── index.js  # import/export compatible
```

**Package.json Configuration:**
```json
{
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./dist/cjs/*": "./dist/cjs/*",
    "./dist/esm/*": "./dist/esm/*"
  }
}
```

### Runtime-Specific Behavior

#### Browser Environment
- **Audio**: Uses `HTMLAudioElement` for seamless playback
- **Module**: Automatically uses ESModule build
- **Dependencies**: No additional packages required

#### Node.js Environment
- **Audio**: Requires manual installation of `speaker` or `play-sound` for audio playback
- **Module**: Uses CommonJS build
- **Installation**: `npm install speaker` or `npm install play-sound` (only if audio playback needed)

#### Bun Environment
- **Audio**: Full Node.js compatibility with `speaker`/`play-sound`
- **Module**: Uses CommonJS build
- **Performance**: Faster execution than Node.js
- **Installation**: `bun install speaker`

#### Deno Environment
- **Audio**: Limited - files generated but no direct playback
- **Module**: Uses CommonJS build with `--unstable-detect-cjs`
- **Import**: Supports subpath exports for direct build access
- **Workaround**: Use system audio players (`afplay`, `aplay`, etc.)
- **Limitation**: Native binary compatibility issues

### Audio Library Support

The package supports multiple audio playback libraries that must be manually installed when needed:

```typescript
// Automatic selection based on availability
const audioPlayer = AudioPlayerFactory.create();

// Supports:
// - speaker (real-time PCM audio streaming) - install with: npm install speaker
// - play-sound (system audio player integration) - install with: npm install play-sound  
// - HTMLAudioElement (browser environments) - built-in, no installation needed
```

### Development Examples

Examples are provided for each runtime environment:

- `examples/react-basic/` - Browser/React with Vite
- `examples/node-basic/` - Node.js CommonJS examples  
- `examples/deno-basic/` - Deno with TypeScript
- `examples/bun-basic/` - Bun with fast execution

### Runtime Limitations

**Deno Limitations:**
- **Audio**: Native binary compatibility issues with Node.js audio modules
- **ESM Compatibility**: May have issues with standard import paths
- **Workarounds**: 
  - Use subpath exports: `"npm:@aituber-onair/voice/dist/cjs/index.js"`
  - Generated audio files can be played with external players
- **Allow Flags**: Even with `--allow-all`, native bindings are not supported

**Browser Security:**
- **CORS**: Some TTS APIs may require proper CORS configuration
- **File Access**: Direct file system access is limited by browser security

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

### Using Manneri Package Independently

```typescript
import { ManneriDetector } from '@aituber-onair/manneri';

const manneriDetector = new ManneriDetector({
  language: 'en',
  interventionCooldown: 60000,  // 1 minute cooldown
  customPrompts: {
    en: {
      intervention: [
        'Let\'s change the topic and discuss something new.',
        'How about we explore a different subject?',
        'Time for a fresh conversation topic!'
      ]
    }
  }
});

const messages = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hello! How can I help?' },
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hello! What can I do for you?' }
];

if (manneriDetector.shouldIntervene(messages)) {
  const prompt = manneriDetector.generateDiversificationPrompt(messages);
  console.log('Topic change suggestion:', prompt.content);
}
```

### Using Bushitsu Client Package Independently

```typescript
import { useBushitsuClient, useBushitsuInitiative } from '@aituber-onair/bushitsu-client';

function ChatComponent() {
  const { isConnected, sendMessage, getLastMentionUser } = useBushitsuClient({
    serverUrl: 'ws://localhost:8080',
    room: 'lobby',
    userName: 'User',
    isEnabled: true,
    onComment: (text, userName, isMention) => {
      console.log(`${userName}: ${text}${isMention ? ' (mentioned)' : ''}`);
    },
  });

  const { sendInitiativeMessage } = useBushitsuInitiative({
    enabled: true,
    serverUrl: 'ws://localhost:8080',
    room: 'lobby',
    userName: 'AI',
    sendMessage,
    onProcessMessage: async (message) => {
      // Optional: integrate with voice synthesis
      console.log('Processing message for voice:', message);
    }
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={() => sendMessage('Hello, world!')}>
        Send Message
      </button>
      <button onClick={() => sendInitiativeMessage('Welcome everyone!')}>
        Send Initiative
      </button>
    </div>
  );
}
```

### Using Kizuna Package Independently

```typescript
import { KizunaManager, LocalStorageProvider, type ExternalStorageAdapter, ExternalStorageProvider } from '@aituber-onair/kizuna';

// Browser environment
const browserStorage = new LocalStorageProvider({
  enableCompression: false,
  enableEncryption: false,
  maxStorageSize: 5 * 1024 * 1024
});

const kizuna = new KizunaManager({
  enabled: true,
  owner: {
    initialPoints: 100,
    pointMultiplier: 2,
    dailyBonus: 10
  },
  platforms: {
    youtube: {
      basePoints: { comment: 1, superChat: 20 }
    }
  },
  customRules: [
    {
      id: 'emotion_happy',
      name: 'Happy emotion bonus',
      condition: (context) => context.emotion === 'happy',
      points: 1,
      description: 'Bonus for happy AI responses'
    }
  ]
}, browserStorage, 'users');

await kizuna.initialize();

// Process interaction
const result = await kizuna.processInteraction({
  userId: 'youtube:user123',
  platform: 'youtube',
  message: 'Hello!',
  emotion: 'happy',
  isOwner: false,
  timestamp: Date.now()
});

console.log(`User earned ${result.pointsAdded} points!`);

// Node.js environment with dependency injection
import { promises as fs } from 'fs';
import path from 'path';

const nodeAdapter: ExternalStorageAdapter = {
  async readFile(filePath: string) { return await fs.readFile(filePath, 'utf-8'); },
  async writeFile(filePath: string, data: string) { await fs.writeFile(filePath, data, 'utf-8'); },
  async deleteFile(filePath: string) { await fs.unlink(filePath); },
  async listFiles(dirPath: string) { 
    const files = await fs.readdir(dirPath);
    return files.filter(file => file.endsWith('.json'));
  },
  async ensureDir(dirPath: string) { await fs.mkdir(dirPath, { recursive: true }); },
  async exists(path: string) { 
    try { await fs.access(path); return true; } catch { return false; }
  },
  joinPath: (...components: string[]) => path.join(...components)
};

const nodeStorage = new ExternalStorageProvider({
  dataDir: './kizuna-data',
  prettyJson: true,
  autoCreateDir: true
}, nodeAdapter);
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

# For conversation pattern detection only
npm install @aituber-onair/manneri

# For WebSocket chat functionality only
npm install @aituber-onair/bushitsu-client

# For user relationship management only
npm install @aituber-onair/kizuna

# For full AITuber functionality (voice included automatically)
npm install @aituber-onair/core

# Additional audio dependencies (ONLY if you need audio playback in Node.js-like environments)
npm install speaker          # For real-time audio streaming
# OR
npm install play-sound       # For system audio player integration
```

**Important**: Audio libraries are NOT automatically installed. Install them only when you need audio playback in Node.js/Bun environments. Browser environments don't require additional packages.

### Runtime-Specific Usage

#### Browser/React Applications
```typescript
// Automatic ESModule import - no additional setup required
import { VoiceEngineAdapter } from '@aituber-onair/voice';

const voiceService = new VoiceEngineAdapter({
  engineType: 'openai',
  apiKey: 'your-api-key',
  speaker: 'alloy'
});
```

#### Node.js Applications
```javascript
// Automatic CommonJS require
const { VoiceEngineAdapter } = require('@aituber-onair/voice');

// For speaker audio playback (install separately):
// npm install speaker
// OR
// npm install play-sound
```

#### Bun Applications
```javascript
// CommonJS compatible with fast execution
const { VoiceEngineAdapter } = require('@aituber-onair/voice');

// For speaker audio playback (install separately):
// bun install speaker
// OR
// bun install play-sound
```

#### Deno Applications
```typescript
// Use CommonJS detection flag
// deno run --allow-net --allow-write --unstable-detect-cjs script.ts

// Standard import (may have ESM compatibility issues)
const { VoiceEngineAdapter } = await import('../../dist/cjs/index.js');

// Alternative: Direct subpath import (recommended for Deno)
import { VoiceEngineAdapter } from "npm:@aituber-onair/voice/dist/cjs/index.js";

// Audio files generated but require external playback:
// afplay filename.wav (macOS)
// aplay filename.wav (Linux)
```

## Version Management and Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for automated version management and release processes.

### Package Versioning Strategy

- **Independent Versioning**: Each package (`@aituber-onair/core`, `@aituber-onair/voice`, `@aituber-onair/manneri`, `@aituber-onair/bushitsu-client`, and `@aituber-onair/kizuna`) maintains its own version following SemVer
- **Dependency Relationship**: Core package includes voice as a direct dependency for ease of use
- **Release Automation**: GitHub Actions automatically handle version bumping and publishing

### Development Workflow

**IMPORTANT: Release Process Rules**
- **NEVER run `npm publish` or `npm publish --dry-run` directly** - All publishing is handled automatically by GitHub Actions
- **ALWAYS follow the automated release workflow** - Manual publishing bypasses version management and can cause conflicts
- **Trust the CI/CD pipeline** - GitHub Actions will handle all npm publishing after PR merge

#### Automated Workflow (Recommended)
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

#### Initial Package Release
For first-time package releases (e.g., @aituber-onair/manneri v0.1.0):

1. **Prepare Package**: Ensure package.json has the correct initial version
2. **Create CHANGELOG.md**: Add initial release notes
   ```markdown
   # @aituber-onair/[package-name]
   
   ## 0.1.0
   
   ### Minor Changes
   
   - Initial release of [package description]
   ```
3. **Verify Build & Tests**: Run `npm run build && npm run test` in the package directory
4. **Create PR**: Submit PR with the new package and CHANGELOG.md
5. **Auto-publish**: GitHub Actions will publish to npm after PR merge

#### Manual Workflow (Alternative)
If changeset interactive mode fails or for quick patches:

1. **Make Changes**: Implement your feature or fix
2. **Update CHANGELOG.md**: Manually add entry to the package's CHANGELOG.md
   ```markdown
   ## 0.x.x
   
   ### Patch Changes
   
   - Your change description here
   ```
3. **Update package.json**: Manually increment the version number
4. **Commit Changes**: Commit both CHANGELOG.md and package.json updates
5. **Build and Test**: Run `npm run build` and `npm run test` to ensure everything works
6. **Create PR and Merge**: Submit PR with changes - GitHub Actions will handle publishing

### Manual Release Commands

**WARNING: These commands are for reference only. DO NOT use these for actual releases.**

```bash
# Version management only (safe to use)
npm run changeset:version

# The following commands should NEVER be used directly:
# ❌ npm run changeset:publish
# ❌ npm run changeset:publish -- --dry-run
# ❌ npm run release
# ❌ npm publish
# ❌ npm publish --dry-run

# All publishing is handled automatically by GitHub Actions after PR merge
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
- **Manneri Package**: Completely independent
  - Can be used standalone for conversation pattern detection
  - No dependencies on other packages
  - Zero external dependencies for maximum portability
- **Bushitsu Client Package**: Completely independent
  - Can be used standalone for WebSocket chat functionality
  - No dependencies on other packages
  - Only depends on React as a peer dependency
- **Kizuna Package**: Completely independent
  - Can be used standalone for user relationship management
  - No dependencies on other packages
  - Zero external dependencies for maximum portability
  - Browser-compatible with dependency injection for Node.js

## Package Publishing Requirements

### Essential package.json Configuration

When creating new packages for npm publishing, ensure these configurations are present:

1. **files field**: Specifies which files/directories to include in the published package
   ```json
   "files": ["dist", "README.md"]
   ```

2. **prepublishOnly script**: Automatically builds the package before publishing
   ```json
   "scripts": {
     "prepublishOnly": "npm run build"
   }
   ```

3. **Proper entry points**: Define main, module, types, and exports
   ```json
   "main": "./dist/cjs/index.js",
   "module": "./dist/esm/index.js", 
   "types": "./dist/types/index.d.ts",
   "exports": {
     ".": {
       "require": "./dist/cjs/index.js",
       "import": "./dist/esm/index.js",
       "types": "./dist/types/index.d.ts"
     }
   }
   ```

### Common Publishing Issues

**Problem**: Published package only contains README.md and package.json, missing dist files

**Root Cause**: The project's `.gitignore` excludes `dist/` directories, and npm respects `.gitignore` by default

**Solution**: Add `"prepublishOnly": "npm run build"` script to package.json
- This ensures dist files are built before publishing
- No need to create `.npmignore` files (avoid committing build artifacts to git)
- Build process runs automatically during `npm publish`

**Example Fix**:
```json
{
  "scripts": {
    "build": "npm run build:clean && npm run build:cjs && npm run build:esm && npm run build:types",
    "prepublishOnly": "npm run build"
  }
}
```

### Package Publishing Checklist

Before publishing any new package, verify:
- [ ] `files` field includes `"dist"` directory
- [ ] `prepublishOnly` script runs the build process
- [ ] `main`, `module`, `types`, and `exports` point to correct dist files
- [ ] Build process generates all required output formats (CJS, ESM, types)
- [ ] Package builds successfully: `npm run build`
- [ ] Tests pass: `npm run test`