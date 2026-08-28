# @aituber-onair/agent

## 0.0.1

This package is an alpha release. Its public API may change before a stable
release.

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
- Adds guarded `onApprovalRequest` handling for `run()` and `runStream()`, with
  actionable timeout guidance for unattended `run()` calls.
- Defines backend feature-flag fields and Chat backend options under
  `backendCapabilities` rather than `capabilities` to distinguish them from
  host-granted capability descriptors.
- Adds phase-specific hook value typing and comprehensive public API JSDoc.
- Adds JSON-safe error details in Agent events, converting or dropping
  unsupported runtime values.
- Adds timeout-safe Codex transport behavior that ignores late responses for
  timed-out requests without terminating an otherwise healthy transport.
- Adds `codex-workspace-server`, `stream-operations-staff`, and
  `channel-strategy-staff` examples covering restricted workspaces, live-stream
  operations, Chat-backed strategy work, validated artifacts, and HTTP/SSE
  dashboard integration.
