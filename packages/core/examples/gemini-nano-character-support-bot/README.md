# Gemini Nano Character Support Bot Example

A browser-only character-support example built with React, Vite, TypeScript,
Chrome's built-in Prompt API, the Web Speech API, a PuruPuru avatar, and
`@aituber-onair/core`.

The page runs chat, speech, avatar reactions, and lip sync in the browser. It
has no application server, API route, provider credential, admin dashboard, or
speech-recognition input.

For a server-backed alternative with cloud providers, private settings, real
audio-amplitude lip sync, and speech recognition, see
[`../character-support-bot`](../character-support-bot/).

## Architecture

```text
Static React page
  ├─ EN / JA language selection
  ├─ Gemini Nano availability and download UI
  ├─ public Core knowledge bundled with the page
  └─ @aituber-onair/core
       ├─ gemini-nano chat provider
       │    └─ Chrome LanguageModel API
       ├─ webSpeech voice engine
       │    └─ browser speechSynthesis
       └─ Core events
            ├─ SPEECH_START / SPEECH_END → synthetic lip sync
            └─ screenplay emotion → PuruPuru reaction
```

## Requirements

- Chrome 148 or later on a supported desktop device
- Windows 10/11, macOS 13+, Linux, or a supported Chromebook Plus
- Hardware and free-storage requirements described in the
  [Chrome Prompt API documentation](https://developer.chrome.com/docs/ai/prompt-api)
- Web Speech API support and an installed system voice for the selected
  language

No Chrome flags are required for normal web pages. Chrome may need to download
the built-in model after the user presses the preparation button. Preparation
creates a temporary session with the complete support prompt, so a context-size
failure is reported before chat input is enabled.

## Run

Build the local packages from the repository root first:

```bash
npm ci
npm -w @aituber-onair/chat run build
npm -w @aituber-onair/voice run build
npm -w @aituber-onair/core run build
```

Then install and start the example:

```bash
cd packages/core/examples/gemini-nano-character-support-bot
npm install
npm run dev
```

To verify the static production build and unit tests:

```bash
npm run build
npm run test
npm run preview
```

## Language selection

The EN / JA switch controls the visible copy, Prompt API input and output
languages, required answer language, and Web Speech language. Changing the
language resets the current conversation and re-checks model availability.
Japanese support may require Chrome to download additional model resources.

## Character behavior

- Gemini Nano is asked to begin every one-sentence reply with an emotion tag.
- Core removes the tag from visible and spoken text and exposes the emotion in
  the screenplay passed to `SPEECH_START`.
- Missing or unsupported emotion tags fall back to `neutral`.
- Web Speech plays audio directly and exposes no `ArrayBuffer`, so the avatar
  uses a bounded periodic mouth animation only while speech is active.
- Enter sends the message, Shift+Enter inserts a newline, and IME confirmation
  does not submit.

## Knowledge and privacy

`src/core-package-knowledge.md` is a compact summary of the public Core package
documentation. It is bundled with the frontend and becomes part of the Gemini
Nano system prompt.

Because this example is frontend-only, every knowledge entry and system
instruction is visible to the browser user. Use only public information.
Private support policies, account data, CRM operations, and secret-backed tools
require a server-side or hybrid architecture.

After the initial model download, inference and speech run on the device. The
current Gemini Nano provider returns one complete text response and does not
support image input.

## Avatar asset

The bundled Miko PuruPuru avatar is included under its own asset terms. Read
[`MIKO_ASSET_TERMS.md`](./MIKO_ASSET_TERMS.md) before redistributing or adapting
the example.
