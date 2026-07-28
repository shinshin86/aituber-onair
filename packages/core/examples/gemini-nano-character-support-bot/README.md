# Gemini Nano Character Support Bot Example

A browser-only character-support example built with React, Vite, TypeScript,
Chrome's built-in Prompt API, PiperPlus, the Web Speech API, a PuruPuru avatar,
and `@aituber-onair/core`.

The page runs chat, speech, avatar reactions, and lip sync in the browser. It
has no application server, API route, provider credential, admin dashboard, or
speech-recognition input.

For a server-backed alternative with cloud providers, private settings, and
speech recognition, see
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
       ├─ JA: piperPlus voice engine
       │    ├─ Tsukuyomi-chan ONNX model + OpenJTalk
       │    └─ Web Audio playback + RMS lip sync
       ├─ EN: webSpeech voice engine
       │    └─ browser speechSynthesis + synthetic lip sync
       └─ Core events
            ├─ SPEECH_START / SPEECH_END → voice state
            └─ screenplay emotion → PuruPuru reaction
```

## Requirements

- Chrome 148 or later on a supported desktop device
- Windows 10/11, macOS 13+, Linux, or a supported Chromebook Plus
- Hardware and free-storage requirements described in the
  [Chrome Prompt API documentation](https://developer.chrome.com/docs/ai/prompt-api)
- Web Speech API support and an installed English system voice for English
  replies
- PiperPlus assets prepared with `npm run setup:piper` for Japanese replies

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

Then install the example and download the PiperPlus voice assets:

```bash
cd packages/core/examples/gemini-nano-character-support-bot
npm install
npm run setup:piper
npm run dev
```

`npm run setup:piper` downloads
[`piper-assets-v2`](https://github.com/shinshin86/chrome-on-aituber/releases/tag/piper-assets-v2)
from the `chrome-on-aituber` GitHub Release and extracts it as
`public/piper/`. The archive includes the PiperPlus browser runtime, OpenJTalk,
the Tsukuyomi-chan model, and license notices. These large assets are excluded
by the example-local `.gitignore` and are not stored in this repository.

The script skips an existing complete asset directory. Use
`npm run setup:piper -- --force` to replace it with a fresh download.

To verify the static production build and unit tests:

```bash
npm run build
npm run test
npm run preview
```

## Language selection

The EN / JA switch controls the visible copy, Prompt API input and output
languages, required answer language, and voice engine. Japanese uses PiperPlus
with the Japanese-only Tsukuyomi-chan model and OpenJTalk phonemization. English
continues to use Web Speech with `en-US`, because the bundled Tsukuyomi-chan
model is not intended for English phonemization. Changing the language resets
the current conversation and re-checks model availability.

## Character behavior

- Gemini Nano is asked to begin every one-sentence reply with an emotion tag.
- Core removes the tag from visible and spoken text and exposes the emotion in
  the screenplay passed to `SPEECH_START`.
- Missing or unsupported emotion tags fall back to `neutral`.
- Japanese PiperPlus returns a WAV `ArrayBuffer`. Web Audio plays it while an
  `AnalyserNode` drives the avatar mouth from the real RMS amplitude.
- English Web Speech plays audio directly and exposes no `ArrayBuffer`, so the
  avatar uses a bounded periodic mouth animation only while speech is active.
- The first Japanese reply initializes the PiperPlus runtime, OpenJTalk, and
  the ONNX model. The widget displays an initialization loader until audio is
  ready.
- If required assets are missing, the widget disables input and asks the user
  to run `npm run setup:piper`.
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

After the initial model and voice-asset downloads, inference and speech run on
the device. The current Gemini Nano provider returns one complete text response
and does not support image input.

## PiperPlus voice assets and credit

The downloaded `public/piper/licenses/` directory contains the license notices
for PiperPlus, ONNX Runtime Web, OpenJTalk, its dictionary, and the voice model
asset set. Keep those notices with any redistributed copy of the downloaded
assets.

This software uses voice data made freely available by the free material
character "Tsukuyomi-chan" (c) Rei Yumesaki for speech synthesis.

- [Tsukuyomi-chan Corpus (CV. Rei Yumesaki)](https://tyc.rei-yumesaki.net/material/corpus/)
- Download source:
  [`chrome-on-aituber` piper-assets-v2](https://github.com/shinshin86/chrome-on-aituber/releases/tag/piper-assets-v2)

## Avatar asset

The bundled Miko PuruPuru avatar is included under its own asset terms. Read
[`MIKO_ASSET_TERMS.md`](./MIKO_ASSET_TERMS.md) before redistributing or adapting
the example.
