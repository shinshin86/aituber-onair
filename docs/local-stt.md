# Local speech-to-text with an OpenAI-compatible server

[日本語](./local-stt.ja.md)

`@aituber-onair/transcription` can send microphone utterances to servers that
accept multipart `POST /v1/audio/transcriptions` and return JSON with a string
`text` field. The `openai-compatible` provider uses the same browser PCM capture,
utterance detection, and 16 kHz resampling as Local Whisper. It sends a mono
PCM16 WAV after each utterance and emits final results only. It does not use
WebSocket streaming or require WebGPU. Each WAV starts with 1 second of
silence, because some recognizers drop the first word when speech begins right
at the start of the file.

The server must accept `file` and `response_format=json`. The package sends
`model`, `language`, and `prompt` only when nonempty; support for these options
depends on the server and model. BCP 47 language hints such as `ja-JP` become
`ja`. No other multipart fields are sent. An OpenAI-compatible label alone does
not establish compatibility with this endpoint.

## Example: speech.cpp

[speech.cpp](https://github.com/nyosegawa/speech.cpp) provides this batch API.
Install it using its own instructions, then start an STT model:

```sh
speech serve qwen3-asr-0.6b --cors-origin http://localhost:5173
```

The first run downloads approximately 0.84 GB of model data. For Japanese,
`reazonspeech-v2` is an alternative, with an approximately 1.24 GB download:

```sh
speech serve reazonspeech-v2 --cors-origin http://localhost:5173
```

The default address is `http://127.0.0.1:8080`. Replace the CORS origin with the
exact page origin, including its port. `localhost` and `127.0.0.1` are different
origins. These commands use an example frontend port; the browser sample shows
the origin it actually uses. See the
[speech.cpp server contract (v0.8.3)](https://github.com/nyosegawa/speech.cpp/blob/v0.8.3/docs/server.md)
for installation-specific options and endpoint details.

## Browser sample

After installing the repository dependencies, run:

```sh
npm -w @aituber-onair/transcription run example:dev
```

1. Open the URL printed by Vite using localhost or HTTPS.
2. Select **OpenAI-compatible server**.
3. Choose **speech.cpp** under **Preset**, or set **Server URL** to
   `http://127.0.0.1:8080`. The presets list only servers verified with this
   sample. If you would like a preset added, please send a pull request. Check the **Requests go to** line.
4. Leave **Model** blank for speech.cpp's loaded model, or enter the ID returned
   by `GET /v1/models`. Other servers may require a model, such as `whisper-1`
   for an OpenAI Whisper transcription request.
5. Leave **API key** blank for a local speech.cpp server. Set a key only if your
   endpoint requires bearer authentication. Use a server you trust: audio and
   the key are sent to the configured URL.
6. Use `ja-JP` as a language hint, or clear it for server-side detection. Leave
   **Prompt** blank unless the chosen server/model supports it.
7. Start transcription, allow microphone access, and speak. The default 500 ms
   end silence finalizes a turn; values below 150 ms are rejected. Results appear
   under **Final utterances**, with no interim updates.

## Application API

```ts
import {
  createRealtimeTranscriptionSession,
  resolveOpenAICompatibleTranscriptionEndpoint,
} from '@aituber-onair/transcription';

const baseUrl = 'http://127.0.0.1:8080';
console.log(resolveOpenAICompatibleTranscriptionEndpoint(baseUrl));
// http://127.0.0.1:8080/v1/audio/transcriptions

const session = createRealtimeTranscriptionSession({
  provider: 'openai-compatible',
  baseUrl,
  language: 'ja-JP',
  silenceDurationMs: 500,
  timeoutMs: 30000,
});
session.onTranscript(({ text, isFinal }) => {
  if (isFinal) console.log(text);
});
session.onError(({ code, message }) => console.error(code, message));
await session.start();
// Later:
await session.stop();
await session.dispose();
```

`baseUrl` is required. An origin gains `/v1/audio/transcriptions`; a `/v1` API
base gains `/audio/transcriptions`; a complete endpoint is kept. Trailing
slashes are removed and custom prefixes are retained. URLs with credentials,
query parameters, or fragments are rejected.

When needed, add optional bearer authentication:

```ts
auth: {
  type: 'browser-api-key',
  getApiKey: async () => readEndUserKeyAtRuntime(),
  acknowledgeBrowserKeyRisk: true,
}
```

The callback runs for each utterance request. Keys are not persisted by the
package. Keep application-owned keys on a backend in production; browser BYOK
is for a trusted application using an end-user-owned key. Cookies are omitted
and redirects are rejected. Configure the final endpoint URL directly.

`stop()` flushes the last utterance and waits for queued requests. `dispose()`
stops capture, aborts the current request, and discards pending turns. Timeout
(default 30 seconds) covers key retrieval, the request, and response reading.
Empty transcripts and the same known hallucination phrases filtered by Local
Whisper are suppressed. This heuristic may also suppress a legitimate utterance
that exactly matches one of those phrases.

## CORS, HTTPS, and remote runtimes

Microphone capture requires a secure browser context (HTTPS or localhost),
Web Audio, AudioWorklet, `fetch`, and `FormData`. The API server must separately
allow the page origin through CORS. An `Authorization` header also requires a
successful CORS preflight. HTTPS pages may block HTTP endpoints as mixed
content; use compatible HTTPS endpoints or a local frontend for local testing.

A server in a remote runtime such as Google Colab needs a reachable HTTPS
endpoint, suitable CORS rules, and authentication before exposure. A temporary
tunnel URL can be entered as **Server URL** if it passes this same batch API
contract. Keep any per-session bearer key out of URLs and source code. This
guide does not provide a Colab STT launcher or verify a particular tunnel;
configure and test your server before using it from the sample.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Network/CORS error or timeout | Server is running; URL and page origin match; CORS and mixed-content rules allow the request. For speech.cpp use `--cors-origin` with the page origin displayed in the sample. Increase `timeoutMs` in application code if inference needs longer. |
| HTTP 401 | Bearer key and endpoint authentication requirements. |
| HTTP 403 `origin_not_allowed` | Add the exact frontend origin to speech.cpp's `--cors-origin`; this can occur even without API-key authentication. |
| HTTP 404 / model not loaded | Check the endpoint path and `GET /v1/models`; leave Model blank to use speech.cpp's loaded model. |
| HTTP 400 | Check the server error detail, model support for language/prompt, and accepted multipart fields. |
| HTTP 503 | The model may still be loading; wait until the server is ready. |
| No result | Speak for at least 300 ms and leave a pause; empty responses and known hallucination phrases are filtered. |

401/403 are `authentication-failed` errors and stop capture; invalid local
configuration is `invalid-configuration`. Network failures and timeouts are
`connection-failed`; other HTTP failures and invalid JSON responses are
`provider-error`. Transient failures discard that turn and keep listening;
they do not retry old audio. Correct authentication/configuration before
starting again.
