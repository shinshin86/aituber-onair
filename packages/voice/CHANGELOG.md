# @aituber-onair/voice

## 0.2.1

### Patch Changes

- Add subpath exports for direct build access

  Added ./dist/cjs/* and ./dist/esm/* subpath exports to package.json to enable direct access to build artifacts. This provides a workaround for Deno ESM compatibility issues by allowing imports like:

  `import { VoiceEngineAdapter } from "npm:@aituber-onair/voice/dist/cjs/index.js"`

  Maintains backward compatibility while enabling flexible access patterns for various runtime environments.

## 0.2.0

### Minor Changes

- feat: implement comprehensive cross-platform runtime support and dual package compatibility

  This update brings significant improvements to the voice package, making it compatible with multiple JavaScript runtimes and module systems:

  **Cross-Platform Runtime Support:**
  - Full Node.js support with dynamic audio format detection
  - Bun runtime compatibility with fast execution
  - Deno runtime support (file output with external playback)
  - Browser environment with HTMLAudioElement support

  **Dual Package Architecture:**
  - CommonJS build for Node.js-like environments
  - ESModule build for modern browsers and bundlers
  - Automatic format selection based on import method
  - Maintains full backward compatibility

  **Audio Engine Improvements:**
  - Dynamic WAV header parsing for sample rate detection
  - Support for 24000Hz, 44100Hz, and 48000Hz audio formats
  - Fixed audio playback issues across different TTS engines
  - Unified audio player interface with runtime-specific implementations

  **Developer Experience:**
  - Comprehensive examples for each runtime environment
  - Optional audio dependency installation (no breaking installs)
  - Updated Node.js import protocols for lint compliance
  - Improved documentation with runtime-specific guidance

  **Technical Details:**
  - Removed optionalDependencies to prevent CI failures
  - Audio libraries (speaker, play-sound) now require manual installation
  - Fixed Transfer-Encoding header issues with Node.js fetch
  - Enhanced error handling and format validation

## 0.1.1

### Patch Changes

- [#48](https://github.com/shinshin86/aituber-onair/pull/48) [`4ae87df`](https://github.com/shinshin86/aituber-onair/commit/4ae87df53eb0569fe9365b15e27fc16c5b71e2c2) Thanks [@shinshin86](https://github.com/shinshin86)! - Fix README image display issue

  Updated README.md to properly display the package logo image. Fixed image path references to ensure the logo is visible on npm package page and GitHub repository.

## 0.1.0

### Minor Changes

- Initial release of independent voice synthesis package

  - Complete voice synthesis library with support for multiple TTS engines
  - Support for VOICEVOX, VoicePeak, OpenAI TTS, NijiVoice, MiniMax, AIVIS Speech engines
  - Emotion-aware speech synthesis with automatic emotion detection
  - Browser-compatible audio playback with HTMLAudioElement support
  - Independent usage without requiring core AITuber functionality
  - TypeScript support with comprehensive type definitions
  - Configurable voice engines with runtime switching capability

  This package can be used standalone for voice synthesis needs or together with @aituber-onair/core for full AITuber functionality.
