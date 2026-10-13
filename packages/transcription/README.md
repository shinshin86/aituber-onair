# @aituber-onair/transcription

![@aituber-onair/transcription logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/transcription/images/aituber-onair-transcription.png)

[日本語版はこちら](./README.ja.md)

Provider-neutral microphone transcription for AITuber OnAir.

> This package is an alpha release. Its public API may change before a stable
> release.

The package supports Web Speech, OpenAI Realtime transcription over browser
WebRTC, Gemini Live transcription over browser WebSocket, local Whisper
Tiny, Base, and Small inference through WebGPU, and OpenAI-compatible batch
transcription servers. All providers emit the same
per-utterance snapshot events. File transcription, server WebSocket input,
automatic chat submission, and provider fallback are intentionally out of
scope.

## Browser example

The package includes a framework-free browser example that exercises all five
providers without depending on AITuber OnAir Core:

```sh
cd packages/transcription/examples/browser-basic
npm run dev
```

After installing dependencies from the repository root, you can also start the
example with a workspace command:

```sh
npm -w @aituber-onair/transcription run example:dev
```

Open the displayed localhost URL and grant microphone permission when starting
a session. Web Speech and Local Whisper need no key. For OpenAI or Gemini,
enter an end-user-owned API key in the page. The sample connects to the selected
service directly from the browser, so avoid using it on a shared device. Local
Whisper requires WebGPU; its first start downloads model/runtime assets and
caches them in the browser. The interface supports English and Japanese and
selects the initial display from the browser language. See the
[example README](https://github.com/shinshin86/aituber-onair/blob/main/packages/transcription/examples/browser-basic/README.md)
for details. OpenAI-compatible servers use a configurable URL and an optional
API key; a local speech.cpp server needs no key.

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
Currently, only `local-whisper` emits them; Web Speech, OpenAI Realtime, and
Gemini Live and OpenAI-compatible servers do not.

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

### OpenAI-compatible servers

For servers that accept multipart audio transcription requests and return
`{ text: string }`, use `openai-compatible`. It captures microphone utterances,
sends mono 16 kHz PCM16 WAV to `/v1/audio/transcriptions`, and emits final results
only. No WebGPU or WebSocket streaming is required.

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'openai-compatible',
  baseUrl: 'http://127.0.0.1:8080',
  language: 'ja-JP',
  silenceDurationMs: 500,
  timeoutMs: 30000,
});
```

`baseUrl` accepts an origin, an API base such as `/v1`, or the complete
`/audio/transcriptions` endpoint. The exported
`resolveOpenAICompatibleTranscriptionEndpoint()` returns the actual request URL.
Optional `model`, `language`, and `prompt` values are sent only when nonempty;
language hints are normalized from `ja-JP` to `ja`. Leave Model blank for a
server that uses its loaded model; other servers require an explicit model ID.

Authentication is optional. If needed, provide `auth` with
`type: 'browser-api-key'`, `getApiKey`, and `acknowledgeBrowserKeyRisk: true`.
The callback runs per request. Audio and any key are sent directly to the chosen
server. Use trusted endpoints and keep application-owned keys on a backend.

`stop()` flushes the final utterance and drains queued requests. `dispose()`
aborts the current request and discards pending turns. Requests run in order;
network errors and timeouts report `connection-failed` and allow later turns.
401/403 report `authentication-failed` and stop capture. Other HTTP failures
report `provider-error`. Empty text and Local Whisper's known hallucination
phrases are filtered. The timeout defaults to 30 seconds; end silence defaults
to 500 ms (minimum 150 ms).

See the [local STT guide](../../docs/local-stt.md) for the speech.cpp example,
CORS configuration, optional authentication, and troubleshooting.

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

### Gemini Live

Gemini Live uses `gemini-3.5-transcribe-live` and streams raw 16-bit PCM audio
over a browser WebSocket. It emits low-latency interim snapshots and a final
snapshot for each detected utterance. The model supports automatic language
detection, language hints, custom vocabulary, and verbatim or smart
transcription modes.

The recommended browser authentication mode obtains a short-lived ephemeral
token from an application backend:

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'gemini-live',
  auth: {
    type: 'ephemeral-token',
    getEphemeralToken: async () => {
      const response = await fetch('/api/gemini/ephemeral-token', {
        method: 'POST',
      });
      const data = await response.json();
      return data.name;
    },
  },
  languages: ['ja-JP', 'en-US'],
  keywords: ['AITuber OnAir'],
  mode: 'smart',
});
```

Frontend-only, self-hosted applications may explicitly connect with an
end-user-owned API key:

```ts
const session = createRealtimeTranscriptionSession({
  provider: 'gemini-live',
  auth: {
    type: 'browser-api-key',
    getApiKey: async () => readEndUserKeyAtRuntime(),
    acknowledgeBrowserKeyRisk: true,
  },
  languages: [], // Automatic language detection
  mode: 'verbatim',
});
```

Gemini Live Transcribe currently has a 10-minute connection limit. This
provider reports an unexpected server disconnect as a typed connection error;
applications that need longer listening periods should start a new session.
Live streaming does not provide speaker diarization or word-level timestamps.
See the
[Gemini Live transcription documentation](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe)
for current preview status, supported languages, limits, and pricing links.

## Security

OpenAI and Google recommend keeping standard API keys on a server and minting
short-lived browser credentials. The browser-BYOK modes exist for trusted
frontend-only or self-hosted use. They must use a key owned and supplied by the
end user; never bundle an application-owner key in source code or built assets.

The package requests credentials through `getApiKey()`, `getClientSecret()`, or
`getEphemeralToken()` for each `start()` for the realtime providers, or each
utterance request for OpenAI-compatible servers. It does not persist, cache,
return, or log keys. A consuming application still controls its own storage. Browser
persistence can expose a key to XSS, extensions, local device access, or
compromised dependencies. Credential failures are returned as typed errors and
never trigger an authentication fallback.

## Provider differences

| Capability | Web Speech | OpenAI Realtime | Gemini Live | Local Whisper | OpenAI-compatible |
| --- | --- | --- | --- | --- | --- |
| Interim snapshots | Yes | Yes | Yes | No | No |
| Multiple expected languages | No | Yes | Yes | No | No |
| Keywords / custom vocabulary | No | Yes | Yes | No | No |
| Smart transcription | No | No | Yes | No | No |
| Configurable delay | No | Yes | No | Yes | No |
| Utterance boundary | Browser implementation | Browser audio-level detection | Gemini server VAD | Browser PCM/VAD | Browser PCM/VAD |

All providers require a supported browser and microphone permission. OpenAI
WebRTC, Gemini Live, Local Whisper, and OpenAI-compatible servers also require
the Web Audio API and HTTPS or localhost; Gemini Live additionally requires WebSocket and Local Whisper
requires WebGPU. OpenAI-compatible servers need AudioWorklet, fetch,
FormData, and server CORS access; their browser capture does not need WebGPU.
Web Speech availability and behavior vary by browser. Remote
providers can incur usage charges while listening, so applications should
expose state clearly and stop sessions when unused.
