# @aituber-onair/transcription

![@aituber-onair/transcription logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/transcription/images/aituber-onair-transcription.png)

[日本語版はこちら](./README.ja.md)

Provider-neutral realtime microphone transcription for AITuber OnAir.

> This package is an alpha release. Its public API may change before a stable
> release.

The package supports Web Speech, OpenAI Realtime transcription over browser
WebRTC, and local Whisper Tiny, Base, and Small inference through WebGPU. All
providers emit the same per-utterance snapshot events. File transcription,
server WebSocket input, automatic chat submission, and provider fallback are
intentionally out of scope.

## Browser example

The package includes a framework-free browser example that exercises all three
providers without depending on AITuber OnAir Core:

```sh
npm -w @aituber-onair/transcription run example:dev
```

Open the displayed localhost URL and grant microphone permission when starting
a session. Web Speech and Local Whisper need no key. For OpenAI, enter an
end-user-owned API key in the page. The sample connects to OpenAI directly from
the browser, so avoid using it on a shared device. Local Whisper requires
WebGPU; its first start downloads model/runtime assets and caches them in the
browser. The interface supports English and Japanese and selects the initial
display from the browser language. See the
[example README](https://github.com/shinshin86/aituber-onair/blob/main/packages/transcription/examples/browser-basic/README.md)
for details.

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

Only providers with potentially long initialization emit `onProgress` events.
Currently, only `local-whisper` emits them; Web Speech and OpenAI Realtime do
not.

### Local Whisper

Local Whisper runs the selected Whisper model in a module worker and emits
final transcripts only:

```ts
import { createRealtimeTranscriptionSession } from '@aituber-onair/transcription';

const session = createRealtimeTranscriptionSession({
  provider: 'local-whisper',
  model: 'tiny',
  language: 'ja-JP',
  silenceDurationMs: 500,
});

session.onTranscript(({ text, isFinal }) => {
  if (isFinal) {
    console.log(text);
  }
});

session.onProgress(({ phase, progress }) => {
  updateLoadingIndicator(phase, progress);
});

session.onError((error) => {
  console.error(error.code, error.message);
});

await session.start();

// Later:
await session.stop();
await session.dispose();
```

Local Whisper is less accurate than Web Speech or OpenAI Realtime. It is
intended for use cases that prioritize requiring no API key and not sending
microphone audio to a remote service. Choose `small` when recognition quality
is important.

| Model | First download reported by progress | Quality guide | Inference (Japanese / English) |
| --- | ---: | --- | ---: |
| `tiny` (default) | About 122 MB | Lower | 237.3 ms / 203.0 ms |
| `base` | About 209 MB | Middle | 255.9 ms / 311.2 ms |
| `small` | About 589 MB | Practical | 574.7 ms / 551.6 ms |

These measurements were taken in Chrome with WebGPU using the same short
Japanese and English microphone clips. Inference excludes capture/VAD time and
varies by GPU. First-use download time depends on network speed and can take
several minutes for hundreds of MB. After caching, initialization measured
about 0.9 s for Tiny, 1.2 s for Base, and 2.5 s for Small. Download sizes are
the sum of the latest `totalBytes` reported for each model file and do not
include assets that do not report progress.

Requirements and behavior:

- A secure browser context (HTTPS or localhost), microphone access, Web Audio,
  AudioWorklet, module workers, and WebGPU are required.
- No API key is required. There is no automatic fallback to a remote provider
  or WASM inference when WebGPU initialization fails.
- On first use, the selected model assets are downloaded from the Hugging Face
  Hub and ONNX Runtime WebAssembly files are downloaded from jsDelivr. These
  assets are cached by the browser. Larger models take longer to download and
  infer.
- Microphone audio is processed in the browser and never leaves the browser.
  The package does not persist audio or transcripts.
- `language` accepts a BCP 47-style hint and is optional. The default 500 ms
  `silenceDurationMs` can be reduced to a minimum of 150 ms for faster turn
  completion.
- `model` accepts `tiny`, `base`, or `small` and defaults to `tiny`. Model dtype
  is fixed to an fp32 encoder and q4 merged decoder for every size.
- Download progress can include `file`, `loadedBytes`, `totalBytes`, and a
  normalized `progress` value from 0 to 1. Initialization and ready phases do
  not require byte totals.

The package normally resolves `dist/local-whisper.worker.js` relative to its
ESM entry. If a bundler pre-bundles the package and cannot resolve that asset,
set the advanced `workerUrl` option to the same module worker asset or an
equivalent build. This browser example uses Vite's `?worker&url` import for that
reason.

### OpenAI Realtime

OpenAI Realtime uses `gpt-live-transcribe` and browser WebRTC. Because this
transcription model does not accept server turn detection, the package detects
sustained silence through the browser Web Audio API and explicitly commits each
audio turn. The recommended authentication mode obtains a short-lived client
secret from an application backend:

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

| Capability | Web Speech | OpenAI Realtime | Local Whisper |
| --- | --- | --- | --- |
| Interim snapshots | Yes | Yes | No |
| Multiple expected languages | No | Yes | No |
| Keywords and context prompt | No | Yes | No |
| Configurable delay | No | Yes | Yes |
| Utterance boundary | Browser implementation | Browser audio-level detection | Browser PCM/VAD |

All providers require a supported browser and microphone permission. OpenAI
WebRTC and Local Whisper also require the Web Audio API and HTTPS or localhost;
Local Whisper additionally requires WebGPU. Web Speech availability and
behavior vary by browser. Listening can incur OpenAI usage charges even during
silence, so applications should expose state clearly and stop sessions when
unused.
