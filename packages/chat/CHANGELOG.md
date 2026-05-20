# @aituber-onair/chat

## 0.35.0

### Minor Changes

- Added Gemini 3.5 Flash support through the Gemini provider, including the
  `MODEL_GEMINI_3_5_FLASH` constant, recommended model list entry, vision
  support metadata, React basic selector option, and README documentation.
- Updated Gemini 3.x API routing so stable Gemini 3.5 Flash uses the
  `v1beta` GenerateContent endpoint path.
- Set Gemini 3.5 Flash requests to use `MINIMAL` thinking and omit thought parts
  by default for low-latency chat-style responses.

## 0.34.1

### Patch Changes

- Removed internal message metadata such as `timestamp` from Mistral Chat
  Completions requests so messages produced by `@aituber-onair/core` are
  accepted by Mistral's strict request schema.

## 0.34.0

### Minor Changes

- Added a first-class DeepSeek provider (`provider: 'deepseek'`) using
  OpenAI-compatible Chat Completions with `deepseek-v4-flash` as the default
  model and `deepseek-v4-pro` as a supported current model.
- Exported DeepSeek constants for the API base URL, Chat Completions endpoint,
  current V4 model IDs, and deprecated legacy aliases (`deepseek-chat`,
  `deepseek-reasoner`).
- Documented DeepSeek usage, recommended models, streaming support, and the
  legacy model deprecation notice without adding DeepSeek-specific
  thinking/reasoning request parameters by default.
- Added a first-class Mistral provider (`provider: 'mistral'`) using Mistral
  Chat Completions with `mistral-small-latest` as the default model.
- Added Mistral constants and supported current generalist model IDs:
  `mistral-small-latest`, `mistral-medium-3-5`, `mistral-large-latest`,
  `mistral-large-2512`, `mistral-small-2603`, and `mistral-medium-2508`.
- Added Mistral streaming/non-streaming tests, vision request normalization,
  and adjustable `reasoning_effort` support for `mistral-small-latest` and
  `mistral-medium-3-5` only.

## 0.33.0

### Minor Changes

- Added the stable Gemini 3.1 Flash-Lite model constant
  (`MODEL_GEMINI_3_1_FLASH_LITE`, `gemini-3.1-flash-lite`) and made it the
  Gemini provider default.
- Updated Gemini recommended supported models so stable/current models are
  listed first and lifecycle-deprecated models are no longer advertised by
  `getSupportedModels()`.
- Kept deprecated Gemini model constants exported for backward compatibility,
  including Gemini 3.1 Flash-Lite Preview, Gemini 3 Pro Preview, Gemini 2.0
  Flash, and Gemini 2.0 Flash-Lite.
- Updated the React basic selector and README docs to label deprecated Gemini
  lifecycle models and recommend migrating production usage to stable/current
  models before shutdown.

## 0.32.0

### Minor Changes

- Added an experimental Claude Agent SDK provider (`claude-agent-sdk`) for the
  optional `@aituber-onair/chat/agent` entry.
- Kept `@anthropic-ai/claude-agent-sdk` optional and dynamically loaded so the
  default chat package install remains unchanged for normal API providers.
- Runs Claude Agent SDK as text chat by default with built-in tools disabled and
  without loading Claude Code project/user settings.
- Updated Agent SDK provider examples and English/Japanese README
  documentation to cover Codex, Claude, and Copilot in that order.

## 0.31.0

### Minor Changes

- Added the optional `@aituber-onair/chat/agent` sub-entry for Agent SDK
  providers without adding agent SDK packages to the default install.
- Added experimental text-chat providers for Codex SDK (`codex-sdk`) and
  Copilot SDK (`copilot-sdk`) with local SDK authentication, dynamic SDK
  loading, and no API-key requirement.
- Marked vision chat, tools, and MCP servers as unsupported for Agent SDK
  providers for now, and documented Copilot SDK permission handling with a
  safe default that denies SDK-managed tool execution unless callers provide
  `onPermissionRequest`.
- Added Agent SDK provider examples and English/Japanese README documentation
  showing AI-avatar style base prompts and conversation history.

## 0.30.0

### Minor Changes

- Added xAI Grok 4.3 (`grok-4.3`) to the xAI constants, provider supported
  models, vision-supported model list, tests, and the React basic selector.
- Updated English/Japanese docs and the React basic example docs to document
  Grok 4.3 support.

## 0.29.0

### Minor Changes

- Added OpenRouter Auto Router (`openrouter/auto`) and latest-family aliases for
  OpenAI, Claude, Gemini, and Kimi to the OpenRouter curated model list.
- Added OpenRouter GPT-5.5 (`openai/gpt-5.5`) and GPT-5.5 Pro
  (`openai/gpt-5.5-pro`) model constants, provider support, tests, and the
  React basic selector.
- Updated OpenRouter vision capability metadata and English/Japanese docs for
  the newly added routed models.

## 0.28.0

### Minor Changes

- Added OpenAI GPT-5.5 (`gpt-5.5`) to the shared constants, provider
  supported-model list, and the React basic example selector.
- Treated GPT-5.5 as a vision-capable GPT-5 family model so existing GPT-5
  option normalization applies consistently.
- Matched GPT-5.5 reasoning handling to the package's low-latency chat policy:
  default to `reasoning_effort: 'none'`, allow `xhigh`, and remap unsupported
  `minimal` requests back to `none`.
- Updated the English/Japanese README files and the React basic example docs to
  document GPT-5.5 API support.
- Documented that GPT-5.5 Pro is intentionally not added because OpenAI marks
  it as non-streaming while the package's standard chat flow expects streaming.

## 0.27.0

### Minor Changes

- Added Kimi K2.6 (`kimi-k2.6`) to the Kimi constants, provider supported
  models, and React basic example selector while keeping Kimi K2.5 available.
- Changed the Kimi provider default text/vision model from Kimi K2.5 to
  Kimi K2.6.
- Updated the English/Japanese README files and the React basic example docs
  to document Kimi K2.6 support.

## 0.26.0

### Minor Changes

- Added Claude Opus 4.7 (`claude-opus-4-7`) to the Claude constants,
  provider supported models, tests, and the React basic example selector.
- Updated Claude 4 Sonnet/Opus to the current Anthropic API model IDs
  (`claude-sonnet-4-20250514` and `claude-opus-4-20250514`).
- Removed retired Claude 3.5 Haiku/Sonnet and Claude 3.7 Sonnet from the
  provider's advertised supported-model list and the React basic example.
- Changed the Claude provider default model from Claude 3 Haiku to
  Claude Haiku 4.5 and refreshed the English/Japanese docs to reflect the
  currently valid Anthropic model lineup as of April 17, 2026.

## 0.25.1

### Patch Changes

- Fixed Gemini Nano `responseLength` handling by injecting an English
  token-budget instruction into the system prompt, since the Chrome
  on-device LanguageModel API does not expose a max output length parameter
  and the option was previously ignored. The instruction is language-neutral
  so it works across any `expectedOutputLanguages`.
- Also replaced the hardcoded Japanese conversation-history header in the
  Gemini Nano system prompt with an English equivalent, for the same
  multilingual reason.

## 0.25.0

### Minor Changes

- Added Gemma 4 support through the Gemini provider, including `gemma-4-31b-it` and `gemma-4-26b-a4b-it`.
- Added Gemma 4 models to the Gemini vision-supported model list and the React basic example model selector.
- Updated Chat README files (EN/JA) and the React basic example docs to include Gemma 4 support while keeping Gemini models prioritized in examples and selectors.
- Updated Gemini transport routing and tests so Gemma 4 models use the Gemini API `v1beta` endpoint.
- Reduced user-visible Gemma 4 thinking leakage by filtering `thought: true` parts from displayed text and by sending Gemma-specific thinking config (`includeThoughts: false`, `thinkingLevel: 'minimal'`).

## 0.24.1

### Patch Changes

- Added Gemini Nano provider documentation to both English and Japanese READMEs (usage example, Chrome 138+ requirements, flag setup, limitations).

## 0.24.0

### Minor Changes

- Added Gemini Nano (`gemini-nano`) support as a Chrome built-in AI chat provider for browser environments.
- Exported Gemini Nano constants, service, and provider types through the public package entry points.
- Added Gemini Nano test coverage and updated the React basic example with setup guidance and model preparation UI.

## 0.23.0

### Minor Changes

- Added xAI provider support with OpenAI-compatible chat completions, including Grok 4.20 and Grok 4-1 Fast model constants.
- Added xAI provider/service test coverage and updated the React basic example model selector with the new Grok models.
- Updated README files (EN/JA) and package exports to document and expose xAI support.

## 0.22.0

### Minor Changes

- Changed vision capability handling from a boolean check to a three-state
  model: `supported`, `unsupported`, or `unknown`.
- Updated `openai-compatible` so vision capability is treated as `unknown`
  instead of being hard-disabled, allowing image requests against compatible
  local/self-hosted models while still surfacing runtime errors for
  unsupported endpoints or model IDs.
- Added `ChatServiceFactory.getVisionSupportLevel()` and
  `ChatServiceFactory.getVisionSupportLevelForModel()` for pre-validation
  aware UI or application logic.
- Updated the `react-basic` example so the image button stays available for
  `openai-compatible` after the service is initialized, while still warning
  that vision support may fail at runtime.
- Updated README docs (EN/JA) and the compatibility probe README to document
  the new `unknown` vision behavior.

## 0.21.2

### Patch Changes

- Reduced premature truncation risk for the OpenAI GPT-5 family by treating
  `responseLength` presets as base targets and raising the actual
  `max_completion_tokens` / `max_output_tokens` when needed based on the model
  and `reasoning_effort`.
- Preserved truncation metadata from OpenAI responses, including
  `finish_reason: 'length'`, Responses API `incomplete` status,
  `incomplete_details`, and `usage`, so callers can distinguish shortened
  outputs from normal completions.
- Added OpenAI transport/parser test coverage for GPT-5 token budgeting and
  truncation metadata propagation.
- Updated README docs (EN/JA) to clarify that GPT-5 family models may use a
  higher effective output-token limit than the base preset values.

## 0.21.1

### Patch Changes

- Fixed OpenAI GPT-5.4 Mini (`gpt-5.4-mini`) and GPT-5.4 Nano
  (`gpt-5.4-nano`) capability normalization so `reasoning_effort: 'none'`
  remains available instead of being forced back to the model default.
- Updated README docs (EN/JA) to reflect that GPT-5.4 Mini/Nano support
  `'none' | 'low' | 'medium' | 'high' | 'xhigh'`.
- Added provider test coverage for GPT-5.4 Mini/Nano with
  `reasoning_effort: 'none'`.

## 0.21.0

### Minor Changes

- Added OpenAI GPT-5.4 Mini (`gpt-5.4-mini`) and GPT-5.4 Nano (`gpt-5.4-nano`) to shared constants and provider supported-model lists.
- Added GPT-5.4 Mini/Nano to `VISION_SUPPORTED_MODELS` so vision model resolution recognizes them.
- Extended GPT-5 capability handling so GPT-5.4 Mini/Nano are treated as GPT-5 models and allow `xhigh` reasoning effort.
- Updated OpenAI provider tests, React basic example model selector, and README docs (EN/JA) to include GPT-5.4 Mini/Nano.

## 0.20.0

### Minor Changes

- Added Z.ai GLM-5-Turbo (`glm-5-turbo`) to chat constants and provider supported models.
- Kept GLM-5-Turbo as text-only while preserving the existing GLM-4.6V family as the vision model set.
- Added Z.ai service/provider test coverage and updated the React basic example model selector for GLM-5-Turbo.
- Updated README files (EN/JA) and example documentation to reflect GLM-5-Turbo support.

## 0.19.0

### Minor Changes

- Added OpenAI GPT-5.4 (`gpt-5.4`) to shared constants and provider supported-model lists.
- Added OpenAI GPT-5.4 Pro (`gpt-5.4-pro`) to shared constants and provider supported-model lists.
- Included GPT-5.4 in vision-supported and GPT-5-family detection lists so provider behavior and option normalization stay consistent.
- Updated GPT-5 model capability handling:
  - force `gpt-5.4-pro` to use Responses API
  - add `xhigh` reasoning support for GPT-5.4/5.4 Pro
  - normalize unsupported reasoning levels by model family defaults
- Updated OpenAI provider tests, React basic model selector, and README docs (EN/JA) to include GPT-5.4/GPT-5.4 Pro.

## 0.18.0

### Minor Changes

- Added Gemini 3.1 Flash-Lite Preview (`gemini-3.1-flash-lite-preview`) to Gemini constants and provider supported models.
- Added Gemini 3.1 Flash-Lite Preview to `GEMINI_VISION_SUPPORTED_MODELS` so vision model resolution recognizes it.
- Added Gemini API transport test coverage to verify Gemini 3.1 Flash-Lite Preview routes via `v1beta`.
- Updated Gemini provider tests, React basic model selector, and README docs (EN/JA) to include Gemini 3.1 Flash-Lite Preview.

## 0.17.0

### Minor Changes

- Added `refreshOpenRouterFreeModels` utility to fetch and probe currently available OpenRouter `:free` models, with configurable timeout/concurrency/candidate limits and structured `working/failed/fetchedAt` results.
- Unified OpenRouter free-tier detection to model ID suffix matching (`:free`) so dynamically discovered free models consistently use free-tier rate limiting.
- Updated `react-basic` example to support dynamic OpenRouter free model fetching from UI, including runtime merge into model list, deduplication, and localStorage restore.
- Tuned refresh defaults for safer usage (`maxCandidates` default is now `1`) and added user-configurable max-candidates input in the example UI.
- Updated Chat README and example README docs to clarify probing behavior (`maxCandidates` means maximum candidates to probe, not a target number of working models).

## 0.16.0

### Minor Changes

- Removed the deprecated OpenAI model constant `MODEL_GPT_4_5_PREVIEW` (`gpt-4.5-preview`) from public exports.
- Removed `gpt-4.5-preview` from OpenAI provider supported-model and vision-supported lists.
- Updated OpenAI provider tests and the React basic model selector to remove GPT-4.5 Preview references.

## 0.15.0

### Minor Changes

- Added Gemini 3.1 Pro Preview (`gemini-3.1-pro-preview`), Gemini 3 Pro Preview (`gemini-3-pro-preview`), and Gemini 3 Flash Preview (`gemini-3-flash-preview`) to Gemini constants and provider supported models.
- Added Gemini 3.1/3 Pro/3 Flash Preview to `GEMINI_VISION_SUPPORTED_MODELS` so vision model resolution recognizes all Gemini 3 variants.
- Updated Gemini provider tests, React basic model selector, and README docs (EN/JA) to include Gemini 3.1 and Gemini 3 preview models.

## 0.14.0

### Minor Changes

- Added a dedicated `openai-compatible` provider for local/self-hosted OpenAI-compatible Chat Completions endpoints with explicit endpoint/model validation.
- Added OpenAI-compatible compatibility tooling: probe script, mock server, local LLM CLI example, and CI workflow for reproducible compatibility checks.
- Updated request behavior for `openai-compatible` to allow optional `apiKey` (Authorization header is omitted when no key is provided).
- Expanded the React basic example and README docs to configure OpenAI-compatible endpoint/model directly and document local LLM usage.

## 0.13.0

### Minor Changes

- Added Claude Sonnet 4.6 (`claude-sonnet-4-6`) to Claude constants and provider supported models.
- Added Claude Sonnet 4.6 to `CLAUDE_VISION_SUPPORTED_MODELS` so vision model resolution recognizes it.
- Updated Chat README (EN/JA), Claude provider tests, and the React basic example to include Claude Sonnet 4.6.

## 0.12.0

### Minor Changes

- Added Z.ai GLM-5 (`glm-5`) to chat constants and provider supported models.
- Treated GLM-5 as text-only while keeping GLM-4.6V family as the vision model set.
- Updated Z.ai provider tests and the React basic example model selector to include GLM-5.
- Updated README files (EN/JA) and example documentation to reflect GLM-5 support and current provider/model coverage.

## 0.11.1

### Patch Changes

- Added `require_approval` to `MCPServerConfig` for OpenAI remote MCP settings.
- Propagated `require_approval` to OpenAI Responses API MCP tool definitions.

## 0.11.0

### Minor Changes

- Added Claude Opus 4.6 (`claude-opus-4-6`) to Claude constants and provider supported models.
- Added Claude Opus 4.6 to `CLAUDE_VISION_SUPPORTED_MODELS` so vision model resolution recognizes it.
- Updated Chat README (EN/JA), Claude provider tests, and the React basic example to include Claude Opus 4.6.

## 0.10.0

### Minor Changes

- Added Kimi K2.5 provider support with OpenAI-compatible chat completions, including vision support and configurable base URL for self-hosted endpoints.
- Added curated OpenRouter model support (OpenAI/Claude/Gemini/Z.ai/Kimi) and documented the supported list.
- Added OpenRouter vision model mapping and updated the React example to expose the new OpenRouter model options.

## 0.9.0

### Minor Changes

- Added Z.ai (GLM) provider support with OpenAI-compatible chat completions, including streaming and tool/function calling.
- Added GLM model constants (GLM-4.7, GLM-4.7 Flash/FlashX, GLM-4.6, GLM-4.6V, GLM-4.6V Flash/FlashX) and vision model detection for Z.ai.
- Added `responseFormat` and `thinking` options to ChatServiceOptions for provider-specific JSON output and reasoning controls.
- Updated README (EN/JA) and React basic example to include Z.ai models and to disable image upload for non-vision models.

## 0.8.0

### Minor Changes

- Added Claude 4.5 Opus (`claude-opus-4-5-20251101`) to the Claude model constants, supported model list, and vision whitelist.
- Updated the Chat README (EN/JA) and the React basic example to list/select the new Claude 4.5 Opus model.

## 0.7.0

### Minor Changes

- Removed deprecated Gemini 1.5 Flash/Pro model constants and vision whitelist entries, aligning SDK exports, documentation, and React example UI with the currently supported Gemini 2.x lineup.

## 0.6.0

### Minor Changes

- **OpenAI GPT-5.1 Support**: Added the newly announced `gpt-5.1` model identifier across the OpenAI chat service, provider factory, UI examples, and documentation so apps can immediately target the latest tier. GPT-5 family metadata (vision support, presets, tests) now understands both 5.0 and 5.1 variants. Removed legacy GPT-5 chat_latest aliases to align with current OpenAI API offerings.
- **Efficient Reasoning Enhancements**: The `reasoning_effort` option accepts the new `'none'` value (matching GPT-5.1's default). Both the SDK and React example expose the toggle, and OpenRouter mappings gracefully skip sending an unsupported effort when `'none'` is selected.
- **Reasoning Guardrails**: Automatically remap unsupported combinations (e.g., `'minimal'` on GPT-5.1 or `'none'` on GPT-5) to valid values so API calls no longer fail when presets or UI selections drift from the model-specific contract. React/core examples hide invalid choices accordingly.
- **Docs & Examples**: Updated README files and the React example UI to highlight GPT-5.1 models and explain when to use `'none'` vs. higher reasoning levels.
- **Cleanup**: Removed `gpt-5-chat-latest` related constants, tests, and documentation references so the package now exposes only the stable IDs (`gpt-5.1`, `gpt-5`, `gpt-5-mini`, `gpt-5-nano`) that OpenAI currently documents. React/core examples and supported-model lists were updated accordingly.

## 0.5.0

### Minor Changes

- **Claude 4.5 Model Support**: Added the new Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) and Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) identifiers to the shared constants, provider factory, and test suite so applications can immediately target the latest Anthropic releases, including full vision support validation.
- **Documentation Updates**: Refreshed the Chat package README (English/Japanese) and the React example README to highlight Claude 4.5 defaults and clarify the supported model matrix.
- **React Example Improvements**: Updated the `react-basic` example's provider selector UI so end-users can pick the newly added Claude 4.5 models directly from the dropdown.

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
