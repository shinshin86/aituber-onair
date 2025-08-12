# @aituber-onair/core

## 0.17.1

### Patch Changes

- Update @aituber-onair/chat dependency to v0.2.1
  - **GPT-5 Model Support**: Added support for GPT-5 models in OpenAI provider
  - **MCP Compatibility Improvements**: Enhanced Model Context Protocol support with better endpoint selection behavior
  - **Responses API Integration**: Improved compatibility with OpenAI's Responses API for vision and MCP features
  - **Test Coverage**: Updated test expectations to reflect the improved MCP endpoint selection behavior

## 0.17.0

### Minor Changes

- Add @aituber-onair/chat package as dependency for unified LLM API integration
  - Enables support for multiple chat providers (OpenAI, Claude, Gemini) through a single interface
  - Chat functionality is now provided through the dedicated @aituber-onair/chat package
  - Maintains backward compatibility with existing APIs
  - Provides comprehensive MCP (Model Context Protocol) support across all providers
  - Includes emotion detection, screenplay conversion, and configurable response lengths

## 0.16.1

### Patch Changes

- Update @aituber-onair/voice dependency to v0.3.0 to support newly added voice engines

## 0.16.0

### Minor Changes

- Add support for Gemini 2.5 Flash Lite model
  - Add `MODEL_GEMINI_2_5_FLASH_LITE` constant for the new `gemini-2.5-flash-lite` model
  - Include the model in `GEMINI_VISION_SUPPORTED_MODELS` array to enable vision capabilities
  - This provides users with a lightweight alternative to the standard Gemini models while maintaining vision support

## 0.15.0

### Minor Changes

- Introduce Changesets-based version management and voice package separation

  - Add @changesets/cli for automated version management  
  - Configure independent versioning for core and voice packages
  - Split voice functionality into separate @aituber-onair/voice package
  - Update core package to use peer + optional dependencies for voice
  - Add GitHub Actions for automated releases
  - Enable separate release cycles for voice and core packages

  This change improves package management flexibility and allows voice package to be used independently while maintaining backward compatibility.

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/voice@0.1.0
