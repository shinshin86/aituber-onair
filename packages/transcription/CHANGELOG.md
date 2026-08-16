# @aituber-onair/transcription

## Unreleased

### Added

- Added browser-local Whisper Tiny transcription through a bundled module
  worker, Transformers.js, and WebGPU, with no API key or microphone audio
  upload.
- Added browser PCM capture with AudioWorklet batching, voice activity
  detection, pre-roll, 16 kHz resampling, 30-second turn splitting, and
  configurable end-of-utterance silence.
- Added typed Local Whisper options, browser capability detection, language
  normalization, sequential inference, lifecycle cleanup, and guards for short
  noise and common Whisper hallucinations.
- Added Local Whisper controls and English/Japanese guidance to the browser
  example.

## 0.0.1

### Added

- Added the initial alpha release of a realtime transcription package with a
  provider-neutral session API, typed lifecycle states, transcript snapshots,
  capability metadata, and structured errors.
- Added browser Web Speech support with continuous recognition and normalized
  interim and final transcript events.
- Added OpenAI Realtime transcription over browser WebRTC with browser-side
  silence detection, explicit per-turn commits, short-lived client-secret
  authentication, and explicitly acknowledged browser BYOK authentication.
- Added OpenAI transcription context options for expected languages, keywords,
  prompts, and delay, plus validation for unsupported or unsafe input.
- Added browser support detection, connection cancellation, graceful stop and
  disposal behavior, and focused unit tests for both providers.
- Added a framework-free browser sample for comparing both providers. The
  OpenAI flow reads an end-user API key from the page when starting a session
  and connects to OpenAI directly from the browser. The interface supports
  English and Japanese display with automatic browser-language detection and
  an on-page language selector.
- Added English and Japanese documentation, package artwork, and dual ESM/CJS
  build output with TypeScript declarations.
