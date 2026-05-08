# @aituber-onair/core

## 0.25.9

### Patch Changes

- Synced xAI Grok 4.3 support from `@aituber-onair/chat@0.30.0` into the
  core entry point and React basic example:
  - re-exported `MODEL_GROK_4_3`
  - updated the React basic example xAI model list so Grok 4.3 is selectable
- Refreshed core README docs and the React basic example README to mention
  Grok 4.3 support.
- Added core export test coverage for the new Grok 4.3 model constant.
- Updated dependencies []:
  - @aituber-onair/chat@0.30.0

## 0.25.8

### Patch Changes

- Synced OpenRouter updates from `@aituber-onair/chat@0.29.0` into the core
  entry point and React basic example:
  - re-exported OpenRouter Auto Router, latest-family aliases, GPT-5.5, and
    GPT-5.5 Pro model constants
  - updated the React basic example OpenRouter model list so the new routed
    models are selectable
- Refreshed core README docs and the React basic example README to mention the
  expanded OpenRouter routed model coverage.
- Added core export test coverage for the new OpenRouter model constants.
- Updated dependencies []:
  - @aituber-onair/chat@0.29.0

## 0.25.7

### Patch Changes

- Synced Unreal Speech and ElevenLabs TTS support from
  `@aituber-onair/voice@0.15.0` into the core entry point and React examples:
  - re-exported `UnrealSpeechEngine`, `ElevenLabsEngine`, related option
    types, and endpoint constants
  - added React basic example selection and parameter controls for
    `engineType: 'unrealSpeech'` and `engineType: 'elevenLabs'`
  - added VRM, PNGTuber, and Live2D example selection and settings wiring for
    Unreal Speech and ElevenLabs
  - added ElevenLabs voice-list fetching to the React examples so users can
    select a voice by name instead of typing an opaque voice ID
- Refreshed core README docs and the React basic example README to mention the
  new voice providers.
- Added core export test coverage for the new voice re-exports.
- Updated dependencies []:
  - @aituber-onair/voice@0.15.0

## 0.25.6

### Patch Changes

- Synced OpenAI GPT-5.5 support from `@aituber-onair/chat@0.28.0` into the
  core entry point and examples:
  - re-exported `MODEL_GPT_5_5`
  - updated the React basic example OpenAI model list to add GPT-5.5
  - kept VRM, PNGTuber, and Live2D examples on dynamic model discovery through
    `AITuberOnAirCore.getSupportedModels()`, so GPT-5.5 appears through the
    core provider model list
- Refreshed core README docs and example READMEs to reflect GPT-5.5 support and
  note that GPT-5.5 Pro is intentionally omitted because it is non-streaming.
- Added core export test coverage for the GPT-5.5 model constant and capability
  helper behavior.
- Updated dependencies []:
  - @aituber-onair/chat@0.28.0

## 0.25.5

### Patch Changes

- Synced Kimi updates from `@aituber-onair/chat@0.27.0` into the core entry
  point and React basic example:
  - re-exported `MODEL_KIMI_K2_6`
  - updated the React basic example Kimi model list to add Kimi K2.6 while
    keeping Kimi K2.5 available
- Synced VoicePeak weighted emotion support from `@aituber-onair/voice@0.14.0`
  into the core entry point, docs, and React basic example:
  - re-exported `VoicepeakEmotionInput` and
    `VoicepeakEmotionWeights`
  - updated the React basic example VoicePeak controls to switch between
    legacy single-tag emotion overrides and weighted emotion maps
- Refreshed core README docs (EN/JA) and the React basic example README to
  reflect Kimi K2.6 and VoicePeak weighted emotion support.
- Added core export test coverage for the latest Kimi model constant and
  VoicePeak weighted emotion types.
- Updated dependencies []:
  - @aituber-onair/chat@0.27.0
  - @aituber-onair/voice@0.14.0

## 0.25.4

### Patch Changes

- Synced Claude updates from `@aituber-onair/chat@0.26.0` into the core
  entry point and examples:
  - re-exported `MODEL_CLAUDE_4_7_OPUS`
  - updated the React basic example Claude model list to add Claude Opus 4.7,
    keep Claude Haiku 4.5 as the default, and remove retired Claude 3.5 /
    Claude 3.7 options from the selectable list
- Updated `ClaudeSummarizer` to default to Claude Haiku 4.5, matching the
  current Claude provider default from `@aituber-onair/chat`.
- Refreshed core README docs (EN/JA) and the React basic example README to
  reflect the current Anthropic Claude lineup and recommended Claude examples.
- Added core export test coverage for the latest Claude model constants and
  refreshed Anthropic API model IDs.
- Updated dependencies []:
  - @aituber-onair/chat@0.26.0

## 0.25.3

### Patch Changes

- Synced Gemini TTS 3.1 defaults from `@aituber-onair/voice@0.13.0` into core
  docs and React examples.
- Updated the React basic / VRM / PNGTuber examples to default Gemini TTS to
  `gemini-3.1-flash-tts-preview`, surface the expanded prebuilt voice list, and
  clarify style/audio-tag prompt usage.
- Updated dependencies []:
  - @aituber-onair/voice@0.13.0

## 0.25.2

### Patch Changes

- Picked up the Gemini Nano `responseLength` handling and multilingual
  conversation-history prompt fixes from `@aituber-onair/chat@0.25.1`.
- Updated dependencies []:
  - @aituber-onair/chat@0.25.1

## 0.25.1

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/voice@0.12.1

## 0.25.0

### Minor Changes

- Added Gemini Nano support to `AITuberOnAirCore`, including provider-option
  forwarding and core entry-point re-exports for:
  - `GeminiNanoChatService`
  - `GeminiNanoChatServiceProvider`
  - `GeminiNanoChatServiceOptions`
  - `MODEL_GEMINI_NANO`
  - `GEMINI_NANO_MAX_CONTEXT_MESSAGES`
- Re-exported additional Gemini model constants from the core entry point:
  - `MODEL_GEMMA_4_31B_IT`
  - `MODEL_GEMMA_4_26B_A4B_IT`
- Updated the core React basic example to support:
  - Gemini Nano provider selection with Built-in AI setup guidance
  - Gemma 4 model selection in the Gemini model list
- Re-exported additional voice package items from the core entry point:
  - `GeminiTtsEngine`
  - `GeminiTtsModel`
  - `PiperPlusEngine`
  - `PiperPlusAssets`
  - `GEMINI_TTS_API_URL`
- Updated the React VRM and PNGTuber examples to support Gemini TTS and Piper
  Plus configuration.
- Updated core README docs and example READMEs to reflect Gemini Nano, Gemma 4,
  Gemini TTS, and Piper Plus support.
- Added core export and options test coverage for the new chat and voice
  re-exports.

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/chat@0.25.0
  - @aituber-onair/voice@0.12.0

## 0.24.0

### Minor Changes

- Added xAI provider support to `AITuberOnAirCore`, including xAI chat
  provider option handling and xAI chat exports from the core entry point.
- Re-exported xAI voice engine items from the core entry point:
  - `XaiEngine`
  - `XaiCodec`
  - `XaiSampleRate`
  - `XaiBitRate`
  - `XAI_TTS_API_URL`
- Updated the React VRM example settings UI to support xAI chat and xAI TTS
  configuration, including shared xAI API key handling and xAI audio options.

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/chat@0.23.0
  - @aituber-onair/voice@0.10.0

## 0.23.9

### Patch Changes

- Re-exported `VisionSupportLevel` from the core entry point.
- Updated the React basic example to allow image uploads for
  `openai-compatible` models/endpoints whose vision capability is unknown and
  surface the runtime-failure caveat in the UI.
- Updated core README docs to clarify that `openai-compatible` vision support
  is treated as `unknown` and may fail at runtime on unsupported endpoints or
  models.
- Updated dependencies []:
  - @aituber-onair/chat@0.22.0

## 0.23.8

### Patch Changes

- Updated `ChatProcessor` to pass text `responseLength` through to the chat
  provider so model-aware providers can adjust output token limits without a
  core-side fixed token mapping.
- Added truncation metadata propagation for assistant responses, including
  `truncated`, `finishReason`, `responseStatus`, `incompleteDetails`, and
  `usage`, and added the `assistantResponseTruncated` event to distinguish
  token-budget truncation from normal completion.
- Updated the React basic example and README to clarify that GPT-5 response
  length presets are base values and may be internally expanded by the OpenAI
  provider.
- Updated dependencies []:
  - @aituber-onair/chat@0.21.2

## 0.23.7

### Patch Changes

- Re-exported additional voice package items from the core entry point:
  - `AivisCloudEngine`
  - `OpenAiCompatibleEngine`
  - `AIVIS_CLOUD_API_URL`
  - `OPENAI_COMPATIBLE_TTS_API_URL`
- Updated core README docs (EN/JA) to mention OpenAI-compatible TTS support.
- Added core export test coverage for the new voice re-exports.
- Updated dependencies []:
  - @aituber-onair/voice@0.9.0

## 0.23.6

### Patch Changes

- Re-exported additional chat model constants from the core entry point:
  - `MODEL_GPT_5_4_MINI`
  - `MODEL_GPT_5_4_NANO`
  - `MODEL_GLM_5_TURBO`
- Updated the core React basic example model lists to include GPT-5.4 Mini,
  GPT-5.4 Nano, and GLM-5-Turbo.
- Updated core README docs (EN/JA) and the React basic example README to
  reflect GPT-5.4 Mini/Nano and GLM-5-Turbo support.
- Added core export test coverage for the new OpenAI and Z.ai model constants.
- Updated dependencies []:
  - @aituber-onair/chat@0.21.0

## 0.23.5

### Patch Changes

- Re-exported OpenAI GPT-5.4 additions and capability helpers from the core
  entry point:
  - `MODEL_GPT_5_4`
  - `MODEL_GPT_5_4_PRO`
  - `OpenAIReasoningEffort`
  - `isResponsesOnlyGPT5Model`
  - `allowsReasoningNone`, `allowsReasoningMinimal`, `allowsReasoningLow`,
    `allowsReasoningXHigh`
  - `getDefaultReasoningEffortForGPT5Model`
- Updated the core React basic example OpenAI model list and GPT-5 settings UI:
  - added GPT-5.4 and GPT-5.4 Pro
  - fixed GPT-5.4 Pro endpoint preference to Responses API
  - switched reasoning effort options to model-capability-based controls,
    including `xhigh`
- Updated core README docs (EN/JA) and React basic example README to reflect
  GPT-5.4 and GPT-5.4 Pro support.
- Added core export test coverage for GPT-5.4 model constants and capability
  helpers.
- Updated dependencies []:
  - @aituber-onair/chat@0.19.0

## 0.23.4

### Patch Changes

- Re-exported `MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW` from the core entry point
  so integrations can target Gemini 3.1 Flash-Lite Preview via
  `@aituber-onair/core`.
- Updated the core React basic example Gemini model list to include Gemini 3.1
  Flash-Lite Preview.
- Updated core README docs (EN/JA) and React basic example README to reflect
  Gemini 3.1 Flash-Lite Preview support.
- Updated dependencies []:
  - @aituber-onair/chat@0.18.0

## 0.23.3

### Patch Changes

- Re-exported OpenRouter free-model refresh utility and related types from the
  core entry point:
  - `refreshOpenRouterFreeModels`
  - `RefreshOpenRouterFreeModelsOptions`
  - `RefreshOpenRouterFreeModelsFailure`
  - `RefreshOpenRouterFreeModelsResult`
- Updated core README docs (EN/JA) to mention OpenRouter free-tier discovery
  via `@aituber-onair/core`.
- Added core export test coverage for chat re-exports.
- Updated dependencies []:
  - @aituber-onair/chat@0.17.0

## 0.23.2

### Patch Changes

- Removed `MODEL_GPT_4_5_PREVIEW` re-export from the core entry point to align
  with `@aituber-onair/chat@0.16.0`.
- Updated the core React basic example OpenAI model list/docs to remove GPT-4.5
  Preview.
- Updated dependencies []:
  - @aituber-onair/chat@0.16.0

## 0.23.1

### Patch Changes

- Re-exported Gemini 3 preview model constants
  (`MODEL_GEMINI_3_1_PRO_PREVIEW`, `MODEL_GEMINI_3_PRO_PREVIEW`,
  `MODEL_GEMINI_3_FLASH_PREVIEW`) from the core entry point.
- Updated the core React basic example model list to include Gemini 3 preview
  models and use the exported Claude Sonnet 4.6 constant.
- Updated core README (EN/JA) and React basic example README to reflect the
  latest Gemini model support.
- Updated dependencies []:
  - @aituber-onair/chat@0.15.0

## 0.23.0

### Minor Changes

- Added `openai-compatible` provider options handling in `AITuberOnAirCore` so endpoint/model settings are forwarded correctly.
- Re-exported `OpenAICompatibleChatServiceProvider`, related option types, and `MODEL_CLAUDE_4_6_SONNET` from the core entry point.
- Updated core React examples (`react-basic`, `react-pngtuber-app`) to support `openai-compatible` setup (endpoint + optional API key), and improved local LLM compatibility.
- Added Claude Sonnet 4.6 to the React basic example model list and documentation.

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/chat@0.14.0

## 0.22.2

### Patch Changes

- Re-exported `MODEL_GLM_5` from the core entry point so integrations can target GLM-5 via `@aituber-onair/core`.
- Updated the React basic example Z.ai model list to include GLM-5.
- Updated core and example README files to reflect current Z.ai/OpenRouter/Kimi model coverage.
- Updated dependencies []:
  - @aituber-onair/chat@0.12.0

## 0.22.1

### Patch Changes

- Re-exported `MODEL_CLAUDE_4_6_OPUS` from the core entry point so
  integrations can target Claude Opus 4.6 via `@aituber-onair/core`.
- Updated the React basic example Claude model list to include Claude Opus 4.6.
- Updated dependencies []:
  - @aituber-onair/chat@0.11.1

## 0.22.0

### Minor Changes

- Remove NijiVoice exports from the core entry point and drop related docs and
  React basic example references.

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/voice@0.8.0

## 0.21.0

### Minor Changes

- Re-exported Kimi (Moonshot) provider and model constants from the core entry point.
- Re-exported curated OpenRouter model constants and vision-supported model lists.

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/chat@0.10.0

## 0.20.0

### Minor Changes

- Re-exported Z.ai (GLM) provider and model constants from the core entry point.
- Updated the React basic example to include Z.ai models and disable image uploads for non-vision models.
- Updated README (EN/JA) to list Z.ai as a supported provider.

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/chat@0.9.0

## 0.19.1

### Patch Changes

- Re-exported `MODEL_CLAUDE_4_5_OPUS` so the core React example can reference the new Claude 4.5 Opus model.
- Updated dependencies []:
  - @aituber-onair/chat@0.8.0

## 0.19.0

### Minor Changes

- Removed deprecated Gemini 1.5 Flash/Pro model constants and documentation references to align with the current Gemini 2.x lineup.

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/chat@0.7.0

## 0.18.3

### Patch Changes

- Normalize GPT-5.1 reasoning defaults across the public exports and the React basic example so selecting GPT-5.1 automatically uses `reasoning_effort='none'`, while legacy GPT-5 variants retain the `'minimal' | 'low' | 'medium' | 'high'` options. The example UI now exposes GPT-5.1 as the default OpenAI model to match the latest chat package behavior.
- Updated dependencies []:
  - @aituber-onair/chat@0.6.0

## 0.18.2

### Patch Changes

- Add Claude Sonnet 4.5 / Haiku 4.5 constants to the public exports so React/Vite integrations can target the newest Anthropic releases out of the box, and update the core React example (settings dropdown + README) to include the new models by default.

## 0.18.1

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/voice@0.7.0

## 0.18.0

### Minor Changes

- feat: add configurable `speechChunking` (`enabled`, `minWords`, `locale`, and
  custom `separators`) so long responses can be split by punctuation in multiple
  languages and spoken chunk-by-chunk with reduced perceived latency. Updated
  the English/Japanese README and the React example to document the new option
  and enable `locale: 'all'` by default.

### Patch Changes

- chore: bump @aituber-onair/voice to v0.6.0 to pick up the new asynchronous
  speech queue so chunked playback can start immediately while later audio is
  generated in the background.

## 0.17.3

### Patch Changes

- chore: bump @aituber-onair/voice dependency to v0.5.1 so core ships the latest engine parameter overrides and synced README docs

## 0.17.2

### Patch Changes

- Update @aituber-onair/voice dependency to v0.4.0
  - **New MiniMax TTS Models**: Added support for three new high-quality MiniMax TTS models:
    - speech-2.5-hd-preview (new default model)
    - speech-2.5-turbo-preview
    - speech-02-turbo
  - **Enhanced Type Safety**: Improved TypeScript type definitions across voice engines
  - **Better Test Coverage**: Added comprehensive test suite with 45 total tests
  - **Code Quality**: Translated all Japanese comments to English for better international collaboration
  - **UI Improvements**: Enhanced React example with separated API Key/Group ID fields and model selection dropdown

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
