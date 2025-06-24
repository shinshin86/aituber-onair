# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AITuber OnAir is a TypeScript monorepo that provides a comprehensive toolkit for creating AI-powered virtual streamers (AITubers). The project consists of a core library (`@aituber-onair/core`) that enables developers to build AI-driven virtual streaming applications with text-to-speech, conversation management, and memory capabilities.

## Common Development Commands

### Build Commands
```bash
# Build all workspace packages
npm run build

# Build only the core package
cd packages/core && npm run build

# Type checking without building
cd packages/core && npm run typecheck
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run tests in watch mode (for active development)
cd packages/core && npm run test:watch

# Run tests with coverage report
cd packages/core && npm run test:coverage

# Run a specific test file
cd packages/core && npx vitest run path/to/test.test.ts
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
   - Manages initialization and coordination of ChatProcessor, MemoryManager, and VoiceService

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

- **Voice Services** (`packages/core/src/services/voice/`)
  - Multiple TTS engine support (VOICEVOX, VoicePeak, NijiVoice, MiniMax, etc.)
  - Unified interface through VoiceEngineAdapter
  - Emotion-aware speech synthesis

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
- `/core` - Core components (AITuberOnAirCore, ChatProcessor, MemoryManager)
- `/services` - External integrations (chat providers, voice engines)
- `/types` - TypeScript type definitions
- `/utils` - Utility functions
- `/constants` - Constants and default prompts

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

4. **Voice Engine Flexibility**: Voice engines can be switched dynamically at runtime, and custom API endpoints can be specified for self-hosted engines.

5. **Response Length Control**: The library provides both direct token limits and preset response lengths, with separate controls for text chat and vision processing.

6. **MiniMax Audio Engine**: MiniMax requires both API key and GroupId for authentication, unlike other TTS engines. It supports dual-region endpoints (global/china) and provides emotion-aware voice synthesis with advanced language recognition.