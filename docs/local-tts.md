# Use a local TTS server

AITuber OnAir can send speech requests to a local or self-hosted server that implements OpenAI's `POST /v1/audio/speech`. The server can run on your PC, on Google Colab, or anywhere else the browser can reach.

In a React example, select **OpenAI-Compatible TTS** as the TTS engine and enter the server URL. You can enter any of these forms:

- the server origin, such as `http://localhost:8880`
- the API base URL, such as `http://localhost:8880/v1`
- the full speech URL, such as `http://localhost:8880/v1/audio/speech`

The settings show **Requests go to:** with the resolved speech URL, so you can check the path before speaking.

## Detect the server

Press **Detect server** to fill in the settings from the server. It asks for three things; only the model list is part of OpenAI's API, so the others are used only when the server provides them.

| What | Request | When it is missing |
| --- | --- | --- |
| Model list | `GET /v1/models` | Type the model ID manually. |
| Voice list | `GET /v1/audio/voices`, then `GET /v1/voices` | Type the voice name manually, or leave it empty to use the server's default voice. |
| Engine name | `GET /` returning JSON with an `engine` field | Generic hints are shown. |

When lists are found, the Model and Voice fields become selects with an **Other (type manually)** option. If a server reports its engine name and the example knows that engine, the Voice and Instructions fields show engine-specific hints.

## Voice and instructions

- **Voice** is sent as `voice`. Accepted values depend on the server. Leave it empty to omit the field.
- **Instructions** is sent as `instructions`, the same field OpenAI uses for speaking style. Servers that support it usually treat it as a voice style prompt; others may ignore or reject it. Leave it empty if your server returns an error for it.

## Test speech

Press **Test speech** to synthesize one short sentence with the current model, voice, instructions, and speed, and play it. If the server rejects the request, the settings show the HTTP status and the server's error message.

## Browser access

A React example runs in the browser, so the TTS server must allow the page's origin through CORS (for example `http://localhost:5173` for the Vite dev server). Otherwise the browser blocks the request and the settings show a network error. If your app is served over HTTPS, a plain HTTP server URL may also be blocked as mixed content.

## Google Colab

The repository's [connect-colab-local-tts skill](../skills/connect-colab-local-tts/SKILL.md) describes starting an OpenAI-compatible TTS server on Colab and exposing it through a temporary cloudflared Quick Tunnel URL. Enter that URL (the `/v1` base URL is enough) in the React example and press **Detect server**.

## Troubleshooting

- **Network error:** The server may be stopped, or its CORS policy may reject the page's origin. Check that `GET /v1/models` responds with `curl`, then check the server's CORS setting.
- **HTTP 404:** Check the path in **Requests go to:**. If the server uses a different API prefix, enter its full URL ending in `/audio/speech`.
- **HTTP 400 or 422:** Read the server message shown in the settings. It usually names the field that was rejected, such as `voice` or `instructions`.
- **JSON instead of audio:** The server answered with an error body. Read the message and adjust the settings.
- **Nothing plays:** Check that the server returns a format the browser can play, such as WAV or MP3.
