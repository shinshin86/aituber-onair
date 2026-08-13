# @aituber-onair/transcription

![@aituber-onair/transcription logo](./images/aituber-onair-transcription.png)

[日本語版はこちら](./README.ja.md)

Provider-neutral realtime microphone transcription for AITuber OnAir.

> This package is an unreleased spike. It is `private`, version `0.0.0`, and is
> not available from npm.

The initial implementation supports Web Speech and OpenAI Realtime
transcription over browser WebRTC. Both providers emit the same per-utterance
snapshot events. File transcription, server WebSocket input, automatic chat
submission, and provider fallback are intentionally out of scope.

## Browser example

The package includes a framework-free browser example that exercises both
providers without depending on AITuber OnAir Core:

```sh
npm -w @aituber-onair/transcription run example:dev
```

Open the displayed localhost URL and grant microphone permission when starting
a session. Web Speech needs no key. For OpenAI, enter an end-user-owned API key
in the page. The sample reads it only when a session starts and does not persist
it. The interface supports English and Japanese and selects the initial display
from the browser language. See the
[example README](./examples/browser-basic/README.md) for details.

Build the example without starting a server:

```sh
npm -w @aituber-onair/transcription run example:build
```

## Usage

```ts
import { createRealtimeTranscriptionSession } from '@aituber-onair/transcription';

const session = createRealtimeTranscriptionSession({
  provider: 'web-speech',
  language: 'ja-JP',
});

session.onTranscript(({ utteranceId, text, isFinal }) => {
  console.log({ utteranceId, text, isFinal });
});

await session.start();
// Later:
await session.stop();
await session.dispose();
```

OpenAI Realtime uses `gpt-live-transcribe`, browser WebRTC, and server VAD. The
recommended authentication mode obtains a short-lived client secret from an
application backend:

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'openai-realtime',
  auth: {
    type: 'client-secret',
    getClientSecret: async () => {
      const response = await fetch('/api/openai/realtime/client-secret', {
        method: 'POST',
      });
      const data = await response.json();
      return data.value;
    },
  },
  languages: ['ja', 'en'],
  keywords: ['AITuber OnAir'],
  prompt: 'An AITuber livestream.',
  delay: 'low',
});
```

Frontend-only, self-hosted applications may explicitly use an end-user-owned
standard API key to mint a client secret in the browser:

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'openai-realtime',
  auth: {
    type: 'browser-api-key',
    getApiKey: async () => readEndUserKeyAtRuntime(),
    acknowledgeBrowserKeyRisk: true,
  },
  languages: ['ja'],
});
```

## Security

OpenAI recommends keeping standard API keys on a server and minting short-lived
client secrets for browser sessions. The browser-BYOK mode exists for trusted
frontend-only or self-hosted use. It must use a key owned and supplied by the
end user; never bundle an application-owner key in source code or built assets.

The package requests the key through `getApiKey()` for each `start()` and does
not persist, cache, return, or log it. A consuming application still controls
its own storage. Browser persistence can expose the key to XSS, extensions,
local device access, or compromised dependencies. Direct client-secret minting
also depends on the OpenAI endpoint's current browser/CORS behavior; failures
are returned as typed errors and never trigger an authentication fallback.

## Provider differences

| Capability | Web Speech | OpenAI Realtime |
| --- | --- | --- |
| Interim snapshots | Yes | Yes |
| Multiple expected languages | No | Yes |
| Keywords and context prompt | No | Yes |
| Configurable delay | No | Yes |
| Utterance boundary | Browser implementation | Server VAD |

Both providers require a supported browser and microphone permission. OpenAI
WebRTC also requires HTTPS or localhost. Web Speech availability and behavior
vary by browser. Listening can incur OpenAI usage charges even during silence,
so applications should expose state clearly and stop sessions when unused.
