# Gemini Nano Customer Support Bot Example

A browser-only customer-support example built with React, Vite, TypeScript,
Chrome's built-in Prompt API, and `@aituber-onair/chat`.

The page uses Gemini Nano directly in the browser. It has no application
server, API route, provider credential, or admin dashboard.

For a server-backed alternative with cloud providers, private settings, and an
admin dashboard, see [`../customer-support-bot`](../customer-support-bot/).

## Architecture

```text
Static React page
  ├─ EN / JA language selection
  ├─ Gemini Nano availability and download UI
  ├─ public chat-package knowledge bundled with the page
  └─ @aituber-onair/chat
       └─ gemini-nano provider
            └─ Chrome LanguageModel API
```

## Requirements

- Chrome 148 or later on a supported desktop device
- Windows 10/11, macOS 13+, Linux, or a supported Chromebook Plus
- Hardware and free-storage requirements described in the
  [Chrome Prompt API documentation](https://developer.chrome.com/docs/ai/prompt-api)

No Chrome flags are required for normal web pages. Chrome may need to download
the built-in model after the user presses the preparation button. Preparation
creates a temporary session with the complete support prompt, so a context-size
failure is reported before chat input is enabled.

## Run

Build `@aituber-onair/chat` from the repository root first:

```bash
npm ci
npm -w @aituber-onair/chat run build
```

Then install and start the example:

```bash
cd packages/chat/examples/gemini-nano-customer-support-bot
npm install
npm run dev
```

To verify the static production build:

```bash
npm run build
npm run preview
```

## Language selection

The EN / JA switch controls all three language layers:

- visible page and widget copy
- Prompt API `expectedInputs` and `expectedOutputs`
- the support system prompt's required response language

Changing the language resets the current conversation and re-checks model
availability with the selected language configuration. Japanese support may
require Chrome to download additional model resources.

## Chat behavior

- Enter sends the message.
- Shift+Enter inserts a newline.
- Enter used to confirm Japanese IME composition does not send the message.
- The `veryShort` response-length preset and support prompt request one concise
  sentence without a preamble or follow-up suggestion to reduce generation
  time.

## Knowledge and privacy

`src/chat-package-knowledge.md` is a full copy of the curated public knowledge
used by the server-side `customer-support-bot` example. It is bundled with the
frontend and becomes part of the Gemini Nano system prompt.

Because this example is frontend-only, the knowledge and prompt are visible to
the browser user. Use only public information. Private support policies,
account data, CRM operations, and secret-backed tools require a server-side or
hybrid architecture.

After the initial model download, inference runs on-device and chat messages are
not sent to an application server. The current `@aituber-onair/chat` Gemini Nano
provider returns one complete text response and does not support image input.

## Context limit

Built-in language-model context capacity can vary. This example keeps the full
knowledge file to demonstrate the upper-bound case and limits conversation
history through the package's Gemini Nano provider. If the initial prompt is too
large on a supported device, Chrome reports a `QuotaExceededError`.
