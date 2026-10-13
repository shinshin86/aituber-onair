# @aituber-onair/transcription

## 0.0.4

### Added

- Added the `openai-compatible` provider, which sends each detected utterance
  as 16 kHz mono PCM16 WAV to a server implementing OpenAI's
  `POST /v1/audio/transcriptions`, such as a local speech.cpp server. It reuses
  the Local Whisper capture and voice activity detection, emits final
  transcripts only, sends only `file`, `response_format`, and non-empty
  `model`, `language`, and `prompt`, and supports optional browser API key
  authentication.
- Exported `resolveOpenAICompatibleTranscriptionEndpoint()`, which accepts an
  origin, an API base URL, or a full `/audio/transcriptions` URL.
- Added the provider to the browser example with a preset menu for servers
  verified with the sample (currently speech.cpp), the resolved request URL,
  and the page origin to allow through CORS.
- Added a local STT guide (`docs/local-stt.md`) with the speech.cpp setup,
  CORS notes, and troubleshooting.

### Fixed

- Prepended 1 second of silence to each OpenAI-compatible upload, because some
  recognizers, including ReazonSpeech v2 on speech.cpp, drop the first word
  when speech starts near the beginning of the file.

## 0.0.3

### Added

- Added Gemini 3.5 Transcribe Live support over browser WebSocket with
  ephemeral-token and explicitly acknowledged browser BYOK authentication.
- Added 16 kHz PCM16 microphone streaming, interim and final transcript
  snapshots, language hints, custom vocabulary, and verbatim or smart modes.
- Added Gemini controls, English/Japanese guidance, capability detection, and
  connection-limit guidance to the browser example and package documentation.

### Fixed

- Preserved Gemini WebSocket close codes and reasons so authentication,
  provider-policy, and transport failures can be diagnosed separately.
- Accepted Gemini WebSocket responses delivered as text, `Blob`, or
  `ArrayBuffer`, and distinguished socket-open from setup-response timeouts.

## 0.0.2

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
- Added provider-neutral initialization progress events, normalized Local
  Whisper download/initialization phases, and aggregated loading progress in
  the browser example.
- Added selectable Tiny, Base, and Small Local Whisper models with size-specific
  worker caching, browser example guidance, and measured download and inference
  comparisons.

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
