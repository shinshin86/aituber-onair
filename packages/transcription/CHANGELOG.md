# @aituber-onair/transcription

## Unreleased

### Added

- Added an unreleased, private realtime transcription spike with a
  provider-neutral session API, typed lifecycle states, transcript snapshots,
  capability metadata, and structured errors.
- Added browser Web Speech support with continuous recognition and normalized
  interim and final transcript events.
- Added OpenAI Realtime transcription over browser WebRTC with server VAD,
  short-lived client-secret authentication, and explicitly acknowledged
  browser BYOK authentication.
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
