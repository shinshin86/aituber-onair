# @aituber-onair/chat

## 0.2.1

### Patch Changes

- **MCP Endpoint Selection**: Fixed MCP endpoint selection behavior for improved compatibility with Model Context Protocol servers
- **Test Updates**: Updated test expectations to reflect the corrected MCP endpoint selection behavior

## 0.2.0

### Minor Changes

- **GPT-5 Model Support**: Added support for GPT-5 models in OpenAI provider
  - Support for GPT-5 Nano, Mini, and Chat Latest variants
  - New GPT-5 specific configuration options (endpoint preference, reasoning effort, verbosity)
  - Added GPT-5 preset configurations (casual, balanced, expert)
- **Response Length Enhancement**: Added new "deep" response length option (5000 tokens) for extended conversations
- **Default Token Limit**: Increased DEFAULT_MAX_TOKENS from 1000 to 5000 tokens
- **Code Quality**: Removed debug logging statements and cleaned up unused code

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