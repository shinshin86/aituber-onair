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
node packages/chat/examples/agent-providers/index.js codex \
  "Say hello in one sentence."
```

```bash
node packages/chat/examples/agent-providers/index.js claude \
  "Say hello in one sentence."
```

```bash
node packages/chat/examples/agent-providers/index.js copilot \
  "Say hello in one sentence."
```

The example sends a normal chat message array to the selected SDK provider:

- A base `system` prompt for an AI avatar.
- A short `user` / `assistant` conversation history.
- The latest user message from the CLI argument.

Optional model overrides:

```bash
CODEX_SDK_MODEL="gpt-5.1-codex" \
node packages/chat/examples/agent-providers/index.js codex

CLAUDE_AGENT_SDK_MODEL="claude-sonnet-4-6" \
node packages/chat/examples/agent-providers/index.js claude

COPILOT_SDK_MODEL="gpt-4.1" \
node packages/chat/examples/agent-providers/index.js copilot

COPILOT_SDK_APPROVE_ALL_PERMISSIONS=1 \
node packages/chat/examples/agent-providers/index.js copilot
```

## Character Chat (Codex SDK)

`character-chat.js` is a lightweight experimental CLI that uses the `codex-sdk`
provider as an AI character chat engine. It is meant as a small proof of
concept for using an agent SDK as the conversation brain of an AI character:
text-only, with a short conversation history kept in the terminal, and no
voice, avatar rendering, or streaming chat platform connections.

Install and authenticate the Codex SDK as described above, then run:

```bash
# Interactive chat
node packages/chat/examples/agent-providers/character-chat.js

# One-shot prompt
node packages/chat/examples/agent-providers/character-chat.js \
  --once="AITuber OnAirについて短く紹介して"

# Prompt as a positional argument
node packages/chat/examples/agent-providers/character-chat.js \
  "今日の配信の最初の挨拶を考えて"
```

Customize the character:

```bash
CODEX_CHARACTER_NAME="ミコ" \
CODEX_CHARACTER_SYSTEM_PROMPT="あなたは明るいAI配信者です。日本語で短く返答してください。" \
node packages/chat/examples/agent-providers/character-chat.js
```

Optional settings:

```bash
CODEX_SDK_MODEL="<codex model id>" \
CODEX_WORKING_DIRECTORY="$PWD" \
CODEX_SKIP_GIT_REPO_CHECK="true" \
CODEX_RESPONSE_LENGTH="short" \
node packages/chat/examples/agent-providers/character-chat.js
```

If `CODEX_SDK_MODEL` / `--model` is not set, the Codex SDK uses the default
model selected by your local Codex CLI/account. In that case the example shows
`Codex CLI default` instead of a concrete model name, because the resolved
model is not reported back to the client.

CLI flags are also supported:

```bash
node packages/chat/examples/agent-providers/character-chat.js \
  --name="ミコ" \
  --responseLength="short" \
  --workingDirectory="$PWD" \
  --skipGitRepoCheck=true
```

Interactive commands:

- `/exit` or `/quit`: quit the CLI
- `/reset`: clear conversation history and keep the character prompt

## Current Limitations

- Text chat only.
- Vision chat, tools, and MCP servers are intentionally unsupported.
- The agent SDK packages are dynamically loaded and are not dependencies of
  `@aituber-onair/chat`.
- The Codex SDK provider returns the final response through the chat callback
  after the SDK run completes; it is not token-by-token streaming.
