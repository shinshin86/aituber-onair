# @aituber-onair/chat

## 0.4.0

### Minor Changes

- **UMD Build Support**: Added comprehensive UMD/IIFE bundle generation for browser and Google Apps Script environments
  - Normal version: `dist/umd/aituber-onair-chat.js` (~105KB) for development with readable code
  - Minified version: `dist/umd/aituber-onair-chat.min.js` (~39KB) for production with optimized size
  - Global name: `AITuberOnAirChat` available in browser environments
  - Automatic inclusion in standard build process (`npm run build`)
- **Google Apps Script Integration**: Complete GAS support with specialized adapters and utilities
  - `installGASFetch()` function to replace fetch with UrlFetchApp for GAS compatibility
  - `runOnceText()` helper for non-streaming environments like GAS
  - Comprehensive GAS example with step-by-step setup documentation
  - V8 runtime configuration guidance and manifest file setup
- **CDN Distribution Optimization**: Enhanced CDN delivery via unpkg and jsDelivr
  - Configured unpkg/jsDelivr to serve minified version for optimal performance
  - Direct browser loading support via `<script>` tags
  - Alternative CDN-based setup option for GAS projects
- **Enhanced Documentation**: Comprehensive setup guides and examples
  - Detailed browser UMD usage examples with HTML templates
  - Complete GAS integration tutorial with UI screenshots and step-by-step instructions
  - Multiple setup options (local build vs CDN) for different use cases
  - Improved README with clear environment-specific guidance
- **Testing Infrastructure**: Added comprehensive test coverage for new features
  - UMD bundle structure and API verification tests
  - GAS adapter integration tests with UrlFetchApp mocking
  - Non-streaming helper function tests
  - Cross-platform compatibility validation

## 0.3.0

### Minor Changes

- **OpenRouter Provider Support**: Added comprehensive support for OpenRouter as a new chat service provider
  - New `OpenRouterChatService` and `OpenRouterChatServiceProvider` implementations with unified interface
  - Support for `openai/gpt-oss-20b:free` model with free tier access
  - Automatic rate limiting for free tier (20 requests per minute)
  - Application analytics support with optional `appName` and `appUrl` parameters
  - Token limits automatically disabled for free model due to technical limitations
  - Complete streaming response support with partial message callbacks
  - Tool/function calling capabilities
- **Documentation and Examples**: Added comprehensive documentation and usage examples
  - Node.js example with OpenRouter integration
  - React example with provider selection support
  - Updated README with OpenRouter configuration and usage guidelines
- **Test Coverage**: Added complete test suite for OpenRouter provider functionality

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