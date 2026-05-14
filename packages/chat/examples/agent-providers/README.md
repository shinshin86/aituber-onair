# Agent SDK Providers

JavaScript runtime examples for the experimental Agent SDK providers exposed from
`@aituber-onair/chat/agent`.

These examples are intentionally separate from `node-basic` because they do not
call normal API endpoints. They use local SDK authentication and are not
available in browser, GAS, or UMD builds.

## Prerequisites

Build the chat package first from the repository root:

```bash
npm ci
npm -w @aituber-onair/chat run build
```

For a real application, install `@aituber-onair/chat` and the SDK you use in
that application's `dependencies`:

```bash
npm install @aituber-onair/chat @openai/codex-sdk
# or
npm install @aituber-onair/chat @anthropic-ai/claude-agent-sdk
# or
npm install @aituber-onair/chat @github/copilot-sdk
```

When trying this example inside the repository, install only the SDK you want
from the repository root. `--no-save` keeps the SDK out of `package.json`:

```bash
npm install --no-save @openai/codex-sdk
# or
npm install --no-save @anthropic-ai/claude-agent-sdk
# or
npm install --no-save @github/copilot-sdk
```

The agent SDK package is installed into `node_modules` for local testing, but it is
not added as a dependency of this repository. Depending on your npm version,
`package-lock.json` may still change; discard that local lockfile change if you
only installed the SDK temporarily.

Authenticate the SDK provider before running the example:

- Codex SDK: authenticate Codex in your local environment.
- Claude Agent SDK: follow Claude Agent SDK authentication. Eligible Claude
  subscription plans can use Agent SDK monthly credits starting June 15, 2026;
  API-key based Developer Platform usage remains pay-as-you-go.
- Claude Agent SDK runs as a text-chat provider with built-in tools disabled by
  default.
- Copilot SDK: follow GitHub Copilot SDK authentication.
- Copilot SDK requires a permission request handler when creating a session.
  This example denies SDK-managed tool execution by default. For local
  experiments that may execute SDK-managed tools, set
  `COPILOT_SDK_APPROVE_ALL_PERMISSIONS=1` only when you trust the prompt and
  working directory.

## Run

```bash
node packages/chat/examples/agent-providers/agent-provider-example.js codex \
  "Say hello in one sentence."
```

```bash
node packages/chat/examples/agent-providers/agent-provider-example.js claude \
  "Say hello in one sentence."
```

```bash
node packages/chat/examples/agent-providers/agent-provider-example.js copilot \
  "Say hello in one sentence."
```

The `index.js` file is a shortcut to the same shared example:

```bash
node packages/chat/examples/agent-providers/index.js codex \
  "Say hello in one sentence."
```

The example sends a normal chat message array to the selected SDK provider:

- A base `system` prompt for an AI avatar.
- A short `user` / `assistant` conversation history.
- The latest user message from the CLI argument.

Optional model overrides:

```bash
CODEX_SDK_MODEL="gpt-5.1-codex" \
node packages/chat/examples/agent-providers/agent-provider-example.js codex

CLAUDE_AGENT_SDK_MODEL="claude-sonnet-4-6" \
node packages/chat/examples/agent-providers/agent-provider-example.js claude

COPILOT_SDK_MODEL="gpt-4.1" \
node packages/chat/examples/agent-providers/agent-provider-example.js copilot

COPILOT_SDK_APPROVE_ALL_PERMISSIONS=1 \
node packages/chat/examples/agent-providers/agent-provider-example.js copilot
```

## Current Limitations

- Text chat only.
- Vision chat, tools, and MCP servers are intentionally unsupported.
- The agent SDK packages are dynamically loaded and are not dependencies of
  `@aituber-onair/chat`.
