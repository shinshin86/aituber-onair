# @aituber-onair/agent

## Unreleased

### Added

- Adds an embeddable Agent and Session runtime with host-controlled Tools,
  policies, approvals, hooks, events, artifacts, interruption, and bootstrap.
- Adds a ChatService backend that keeps Tool visibility and conversation state
  isolated per Session.
- Adds separate package entry points for the base runtime, Chat integration, and
  Codex app-server integration.
- Adds a Node.js Codex app-server backend pinned to Codex CLI 0.145.0 with
  streamed Turns, resume support, approvals, safe artifacts, and compatibility
  checks.
- Adds a live-stream operations staff example backed by the real Agent runtime
  and a deterministic local backend.
