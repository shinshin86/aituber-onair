# @aituber-onair/chat

## 0.1.0

### Minor Changes

- Initial release of the Chat and LLM API integration library
- Unified interface for multiple AI providers (OpenAI, Claude, Gemini)
- Streaming response support with partial message callbacks
- Tool/function calling support with unified `ToolDefinition` interface
- Vision/image processing capabilities for multimodal interactions
- Model Context Protocol (MCP) integration support
  - Direct MCP integration for OpenAI and Claude providers
  - Function calling integration for Gemini provider
  - Automatic MCP tool schema fetching and registration
  - Graceful fallback mechanisms for MCP failures
- Emotion detection and parsing from AI responses
- Screenplay format conversion utilities
- Configurable response length presets (veryShort, short, medium, long, veryLong)
- Provider-specific optimizations and error handling
- TypeScript support with comprehensive type definitions
- Zero runtime dependencies for maximum portability
- Dual package support (CommonJS and ESModule)
- Examples for both Node.js and React applications