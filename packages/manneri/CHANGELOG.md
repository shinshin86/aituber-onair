# @aituber-onair/manneri

## Unreleased

### Patch Changes

- Documented the current intervention triggers, contextual prompt metadata, and
  analyzer statistics behavior.
- Added a global 90% coverage threshold for the manneri package test suite.

## 0.3.1

### Patch Changes

- **Export missing prompt types from public API**
  - Added `PromptTemplates`, `LocalizedPrompts`, `LocalizedPromptOverrides` to main entry point exports
  - These types were available in `types/index.ts` but not re-exported from `index.ts`, requiring consumers to use fragile deep imports

## 0.3.0

### Minor Changes

- **Extract magic numbers into centralized constants**
  - Created `config/constants.ts` with all hardcoded values grouped by module
  - All analyzers, detectors, and utilities now import from constants
  - Constants are exported for optional consumer use

- **Localize intervention reason strings**
  - Added `interventionReasons` to `PromptTemplates` type (optional, backward-compatible)
  - `ConversationAnalyzer` now respects language configuration for reason strings
  - Built-in Japanese and English reason templates with per-key fallback chain

- **Implement cache statistics in SimilarityAnalyzer**
  - `getCacheStats()` now returns actual `hitRate`, `hits`, and `misses`
  - Fixed cache key generation to use `JSON.stringify()` to prevent collisions

### Breaking Changes

- **Removed unused AI prompt generation config fields** from `ManneriConfig`:
  - `enableAiPromptGeneration`
  - `aiPromptGenerationProvider`
  - `aiPromptGenerationModel`
  - Migration: Remove these fields from your config objects if present
- **Removed `AiProviderConfig` type export**
- **Removed `generateAiDiversificationPrompt()` method** from `ManneriDetector`
  - Migration: Use `generateDiversificationPrompt()` instead (synchronous)

### Removals

- Removed unused `createWorkerFunction()` from browser utilities
- Removed unused `createTfIdfVector()` from text utilities

### Deprecations

- `repetitionLimit` config field is deprecated and will be removed in a future major version (it was never used in detection logic)

## 0.2.0

### Major Changes

- **BREAKING**: Removed unused `category` field from `TopicInfo` interface
  - The `category` field was not being used in intervention logic
  - Intervention decisions are based solely on `confidence` scores
  - This simplifies the API and reduces unnecessary code complexity
  - Migration: Remove any references to `topic.category` from your code

### Improvements

- Cleaner and more maintainable codebase
- Reduced bundle size by removing unused categorization logic

## 0.1.0

### Minor Changes

- Initial release of conversation pattern detection library

  - Lightweight pattern detection for preventing repetitive AI responses
  - Real-time conversation analysis with similarity scoring
  - Configurable repetition limits and intervention cooldowns
  - Topic diversification prompt generation
  - Multi-language support (English, Japanese)
  - Browser-compatible with LocalStorage persistence support
  - Event-driven architecture for pattern detection notifications
  - Customizable prompts and intervention messages
  - Zero external dependencies
  - TypeScript support with comprehensive type definitions

  This package can be used standalone for conversation pattern detection or integrated with other chat applications to maintain engaging conversations.
