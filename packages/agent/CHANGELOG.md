# @aituber-onair/agent

## Unreleased

### Fixed

- Ignores late Codex app-server responses for timed-out requests without
  terminating an otherwise healthy transport.
- Lets `run()` and `runStream()` answer approval requests through a guarded
  host callback, with actionable timeout guidance for unattended `run()` calls.
- Guarantees that error details embedded in Agent events contain only JSON
  values, converting or dropping unsupported runtime values.

### Added

- Adds an embeddable Agent and Session runtime with host-controlled Tools,
  policies, approvals, hooks, events, artifacts, interruption, and bootstrap.
- Adds a ChatService backend that keeps Tool visibility and conversation state
  isolated per Session.
- Adds separate package entry points for the base runtime, Chat integration, and
  Codex app-server integration.
- Adds a Node.js Codex app-server backend for Codex CLI 0.136.0 or later,
  verified against 0.145.0, with streamed Turns, resume support, approvals,
  safe artifacts, and compatibility checks without an exact version pin.
- Adds a live-stream operations staff example backed by a real Codex app-server,
  server-side comment preprocessing, validated generated artifacts, and an
  HTTP/SSE dashboard client.

### Changed

- Renames backend feature-flag fields and Chat backend options from
  `capabilities` to `backendCapabilities` to distinguish them from
  host-granted capability descriptors.
