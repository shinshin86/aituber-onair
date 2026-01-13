# @aituber-onair/bushitsu-client

## 0.2.1

### Patch Changes

- Expand React peer dependency range to include React 19
- Update React testing dependencies for React 19

## 0.2.0

### Minor Changes

- Add transport abstraction and environment-specific bindings (Node.js helper, Google Apps Script sender, React barrel) for cross-runtime support
- Expose transport utilities and custom injection options in the public API
- Document new usage patterns and ship runnable examples for Node.js, Google Apps Script, and React

### Patch Changes

- Improve WebSocket adapter robustness (binary message handling, cleanup) and align package exports with new structure
- Add targeted tests for Node.js and Apps Script bindings

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
