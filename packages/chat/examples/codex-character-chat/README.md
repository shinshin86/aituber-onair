# Codex Character Chat

A lightweight experimental CLI that uses the `codex-sdk` provider from
`@aituber-onair/chat/agent` as an AI character chat engine.

This is meant as a small proof of concept for using an agent SDK as the
conversation brain of an AI character. It is intentionally text-only and does
not connect to voice, avatar rendering, or streaming chat platforms.

## Prerequisites

Build the chat package first from the repository root:

```bash
npm ci
npm -w @aituber-onair/chat run build
```

Install the Codex SDK for local testing:

```bash
npm install --no-save @openai/codex-sdk
```

Authenticate Codex in your local environment before running the example.
The SDK uses local Codex authentication rather than an API key passed through
`@aituber-onair/chat`.

## Run

Interactive chat:

```bash
node packages/chat/examples/codex-character-chat/index.js
```

One-shot prompt:

```bash
node packages/chat/examples/codex-character-chat/index.js \
  --once="AITuber OnAirについて短く紹介して"
```

You can also pass the prompt as a positional argument:

```bash
node packages/chat/examples/codex-character-chat/index.js \
  "今日の配信の最初の挨拶を考えて"
```

## Customize the Character

```bash
CODEX_CHARACTER_NAME="ミコ" \
CODEX_CHARACTER_SYSTEM_PROMPT="あなたは明るいAI配信者です。日本語で短く返答してください。" \
node packages/chat/examples/codex-character-chat/index.js
```

Optional settings:

```bash
CODEX_SDK_MODEL="<codex model id>" \
CODEX_WORKING_DIRECTORY="$PWD" \
CODEX_SKIP_GIT_REPO_CHECK="true" \
CODEX_RESPONSE_LENGTH="short" \
node packages/chat/examples/codex-character-chat/index.js
```

If `CODEX_SDK_MODEL` / `--model` is not set, the Codex SDK uses the default
model selected by your local Codex CLI/account. In that case the example shows
`Codex CLI default` instead of a concrete model name, because the resolved
model is not reported back to the client.

CLI flags are also supported:

```bash
node packages/chat/examples/codex-character-chat/index.js \
  --name="ミコ" \
  --responseLength="short" \
  --workingDirectory="$PWD" \
  --skipGitRepoCheck=true
```

## Commands

- `/exit` or `/quit`: quit the CLI
- `/reset`: clear conversation history and keep the character prompt

## Current Limitations

- Experimental JavaScript runtime example only.
- Text chat only.
- Vision chat, tools, and MCP servers are not exposed through this provider.
- The Codex SDK package is dynamically loaded and is not a dependency of
  `@aituber-onair/chat`.
- The current Codex SDK provider returns the final response through the chat
  callback after the SDK run completes; it is not token-by-token streaming.
