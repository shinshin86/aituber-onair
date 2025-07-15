# @aituber-onair/bushitsu-client

## 0.1.1

### Patch Changes

- Add `prepublishOnly` script to ensure build files are included in npm package
- Fix npm package publishing issue where only README.md and package.json were included

## 0.1.0

### Minor Changes

- Initial release of WebSocket client library for chat functionality

  - WebSocket client with auto-reconnection and connection management
  - React hooks support with `useBushitsuClient` and `useBushitsuInitiative`
  - Rate limiting and message queuing for reliable communication
  - Mention detection and user interaction features
  - Event-driven architecture for real-time chat handling
  - TypeScript support with comprehensive type definitions
  - Dual package support (CommonJS and ESModule)
  - Configurable connection options and error handling
  - Integration-ready for AI chat applications
  - Lightweight with minimal dependencies (peer dependency on React only)

  This package can be used standalone for WebSocket chat functionality or integrated with other AITuber packages for comprehensive chat management.