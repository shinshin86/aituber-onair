# @aituber-onair/voice

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
