# @aituber-onair/manneri

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