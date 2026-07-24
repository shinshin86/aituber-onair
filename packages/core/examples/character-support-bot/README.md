# Character Support Bot

An `@aituber-onair/core` example that combines a product landing page with a
floating, speaking character support widget.

Open the widget to meet Miko, a bundled `.purupuru` avatar. The browser-side
core streams chat through a same-origin OpenAI-compatible route, sends the
completed screenplay to a same-origin speech route, plays the returned audio
bytes, and uses Web Audio amplitude analysis for lip sync. Emotion tags from
`SPEECH_START` also drive PuruPuru reactions, while the renderer keeps its idle
motion and blink behavior.

## Security warning

> **Do not expose `/admin` or this demo server to the public internet.**

The admin page is intentionally unauthenticated for local example use. It can
write provider credentials to `server/data/settings.json`. Before adapting this
example for a real deployment, add authentication, authorization, CSRF
protection, rate limits, network restrictions, and a deployment-appropriate
secret store.

The example enforces one useful boundary even in local development:

- LLM and TTS keys are saved only in the gitignored server settings file.
- Admin GET responses contain masked key values only.
- The browser bundle creates `AITuberOnAirCore` with an empty key.
- Browser chat and speech requests never include provider credentials.
- The Node server adds credentials only to its upstream provider requests.

## Architecture

```text
Browser
  AITuberOnAirCore
    chatProvider: openai-compatible
      -> POST /api/support/chat/completions (no key)
    voice engine: openaiCompatible
      -> POST /api/support/tts (no key)
      <- audio bytes -> Web Audio playback + lip sync

Node server
  /api/support/chat/completions
    -> @aituber-onair/chat -> configured LLM provider
    <- OpenAI-compatible SSE
  /api/support/tts
    -> configured OpenAI or OpenAI-compatible speech endpoint
    <- audio bytes
```

The server replaces browser-supplied system messages with a server-owned
persona, support rules, emotion-tag contract, and curated Core package
knowledge.

## Run locally

From this example directory:

```bash
npm install
npm run dev
```

Then open:

- Landing page and widget: `http://localhost:5173`
- Server settings: `http://localhost:5173/admin`

`npm run dev` launches both Vite and the zero-dependency Node HTTP server. The
Node server listens on `127.0.0.1:8788` by default. Override it with
`CHARACTER_SUPPORT_BOT_PORT`; update `vite.config.ts` when changing the local
proxy port.

## Configure providers

Open `/admin` and configure both sections.

### LLM

The server uses `ChatServiceFactory` from `@aituber-onair/chat`, so the admin
page discovers the package's registered server-capable providers and models.
OpenAI-compatible servers accept a full Chat Completions URL and an arbitrary
model ID.

### TTS

The example supports:

- **OpenAI**: predefined models and voices; a key is required.
- **OpenAI-compatible**: a full `/v1/audio/speech`-style URL, model, optional
  voice, and optional key.
- **Built-in mock**: generates a short PCM WAV for local UI, playback, and
  lip-sync checks. It is not a production voice.

The browser always uses Core's `openaiCompatible` voice engine against the
local proxy, regardless of which upstream TTS provider the server uses.

## Local mock flow

The repository includes a mock OpenAI-compatible chat server. From the
repository root, run:

```bash
node packages/chat/examples/mock-openai-server/server.js --port=18080
```

In `/admin`, choose:

- LLM provider: `OpenAI-Compatible`
- Model: `mock-chat-model`
- Endpoint: `http://127.0.0.1:18080/v1/chat/completions`
- API key: `test-key`
- TTS provider: `Built-in mock (development)`

This exercises the full browser Core flow without calling a paid API:
streaming chat, assistant events, generated audio bytes, playback, blink/idle
animation, and audio-driven lip sync.

## Build and verify

```bash
npm run fmt
npm run lint
npm run test
npm run build
```

After building, `npm run server` serves `dist` and the API together at
`http://127.0.0.1:8788`.

## Main files

- `src/hooks/useCharacterSupportCore.ts`: browser-side Core configuration and
  event mapping.
- `src/hooks/useAudioLipsync.ts`: audio playback, AudioContext unlock, and RMS
  analysis.
- `src/components/AvatarCanvas.tsx`: bundled avatar loading and PuruPuru
  renderer integration.
- `server/index.js`: static server, masked admin settings, LLM SSE adapter, and
  TTS proxy.
- `server/core-package-knowledge.md`: curated support knowledge supplied by the
  server.

## Miko avatar terms

The bundled Miko asset is part of the example software. See
[MIKO_ASSET_TERMS.md](./MIKO_ASSET_TERMS.md) for its terms.
