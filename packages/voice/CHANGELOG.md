# @aituber-onair/voice

## 0.5.1

### Patch Changes

- docs: add per-engine parameter reference and highlight new 0.5.0 overrides in English/Japanese README

## 0.5.0

### Minor Changes

- feat: expand engine parameter coverage (all engines except NijiVoice) so developers can tune key overrides directly from the React example while leveraging existing `VoiceServiceOptions`

  **Engine highlights:**
  - **OpenAI TTS** — surfaced `openAiSpeed` override; UI defaults remain at 1.0 with real-time adjustment.
  - **VOICEVOX** — exposed full query overrides including speed/pitch/intonation/volume scales, phoneme lengths, pause controls, sampling rate, stereo, katakana-English handling, interrogative upspeak, and core version.
  - **AivisSpeech** — matched VOICEVOX-style controls for speed, pitch, intonation, volume, silence lengths, sampling rate, and channel selection.
  - **Aivis Cloud** — added most frequently requested sliders for speaking rate, emotional intensity, tempo, pitch, volume, leading/trailing/line-break silence plus output format options.
  - **VoicePeak** — enabled emotion selection alongside slider-based speed and pitch overrides to mirror the engine's API ranges.
  - **MiniMax** — reorganized voice/audio settings with sliders for speed, volume, pitch, and dropdowns for sample rate, bitrate, format, and channel while keeping language boost configurable.

- feat: refresh the React example UI to introduce reusable slider components, reset buttons, and collapsible cards that keep each engine's extended parameter set tidy and discoverable.

## 0.4.0

### Minor Changes

- feat: add MiniMax TTS new models and enhanced UI configuration

  **New MiniMax TTS Models:**
  - speech-2.5-hd-preview: Latest high-definition preview model (new default)
  - speech-2.5-turbo-preview: Enhanced turbo model for faster processing
  - speech-02-turbo: Updated turbo model with improved quality
  - Maintained compatibility with existing speech-01, speech-02-hd, speech-02 models

  **Enhanced React UI:**
  - Separated API Key and Group ID configuration fields for better security
  - Added comprehensive Voice ID selection with 18 voice options including new voices:
    * Wise_Woman, Deep_Voice_Man, Cute_Boy, Energetic_Woman_1, Energetic_Woman_2
    * Gentle_Woman, Mature_Woman_1, Mature_Woman_2, Soft_Woman, Sweet_Woman
    * Youthful_Woman_1, Youthful_Woman_2, and more
  - Improved configuration interface for better user experience

  **Comprehensive Test Coverage:**
  - Added MinimaxEngine.test.ts with 7 configuration tests
  - Added VoiceEngineAdapter.test.ts with 15 integration tests
  - CI/CD-friendly testing without API key dependencies
  - Complete coverage for model selection, emotion conversion, and error handling
  - 45 total tests ensuring robust functionality across all engines

  **Code Quality Improvements:**
  - Translated all Japanese comments to English for international development
  - Enhanced TypeScript type safety with MinimaxModel union type
  - Improved error handling and validation throughout the codebase

## 0.3.0

### Minor Changes

- feat: add Aivis Cloud API support with comprehensive examples

  Added complete support for Aivis Cloud API, a high-quality Japanese text-to-speech service:

  **New Features:**
  - Full Aivis Cloud API integration with all parameters support
  - SSML (Speech Synthesis Markup Language) support for rich voice expression
  - Emotional intensity control and speaking rate adjustment
  - Multiple output formats: WAV, FLAC, MP3, AAC, Opus
  - Comprehensive error handling (401, 402, 404, 422, 429, 5xx)
  - Response header parsing for billing and usage information

  **Cross-Platform Examples:**
  - Node.js example with environment variable support and parallel format testing
  - Deno example with TypeScript and security-focused implementation
  - Bun example with performance benchmarking and streaming simulation
  - React example with UI integration and engine comparison guide

  **Technical Implementation:**
  - AivisCloudEngine class with full API parameter support
  - Comprehensive test suite with 100% feature coverage
  - Runtime-specific optimizations for each platform
  - Real-time streaming capability demonstration

  The Aivis Cloud API provides industry-leading synthesis speed (2-second audio in 0.3s) and supports advanced features like custom voice models, speaker UUID selection, and fine-grained voice parameter control.

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
