# Use a local LLM

AITuber OnAir can call a local or self-hosted server that implements OpenAI-compatible Chat Completions. Select **OpenAI-Compatible** in a React example's LLM settings to show buttons for Ollama, LM Studio, llama.cpp, and vLLM. Each button fills in that server's default URL. You can also type a base URL such as `http://localhost:11434/v1`, just an origin such as `http://localhost:11434`, or a full `/v1/chat/completions` URL. The field shows the URL that requests will actually go to. Then click **Fetch models** to pick a model, and **Test connection** to check the server before chatting.

Ollama exposes both its [native `/api` API](https://docs.ollama.com/api/introduction) and an [OpenAI-compatible `/v1` API](https://docs.ollama.com/api/openai-compatibility) on the local server without an extra compatibility switch. Its native `/api/chat` is Ollama's primary chat interface. AITuber OnAir uses the OpenAI-compatible `/v1` interface.

The model ID and server URL depend on the server. Start the server and load a chat-capable model first. You can discover its exact ID with `GET /v1/models` or the CLI:

```bash
npm -w @aituber-onair/chat run build
node packages/chat/examples/local-llm-cli/index.js \
  --endpoint="http://localhost:11434/v1" --list-models
```

Use the returned ID as the `model` setting. The model list request does not generate text.

In a React example, **Fetch models** requests the same list and shows the returned IDs as choices. To use a model that is not listed, choose **Other (type manually)** and enter its ID. If the list cannot be fetched, type the model ID in the field directly. **Test connection** also calls only `/v1/models` and does not generate text. When a model ID is set, it also reports whether the server lists that model.

## Local servers

These are default local URLs. If you changed a server's port or API prefix, use its actual URL. Browser access also depends on that server's CORS settings and the origin serving your app. In the React examples, you can enter a full `/v1/chat/completions` URL instead of the base URL.

| Server | React example button | Base URL | Model ID and browser access |
| --- | --- | --- | --- |
| [Ollama](https://docs.ollama.com/api/openai-compatibility) | **Ollama** | `http://localhost:11434/v1` | Pull a model, then query `/v1/models` for its ID. [Ollama's FAQ](https://docs.ollama.com/faq#how-can-i-allow-additional-web-origins-to-access-ollama) says it allows `127.0.0.1` and `0.0.0.0` origins by default. If the React dev server at `http://localhost:5173` is blocked, start Ollama with `OLLAMA_ORIGINS=http://localhost:5173 ollama serve`. |
| [LM Studio](https://lmstudio.ai/docs/developer/openai-compat) | **LM Studio** | `http://localhost:1234/v1` | Start its local server and [query `/v1/models`](https://lmstudio.ai/docs/developer/openai-compat/models). For browser access, [start with `lms server start --cors`](https://lmstudio.ai/docs/cli/serve/server-start); CORS is disabled without this flag. |
| [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) | **llama.cpp** | `http://127.0.0.1:8080/v1` | Start `llama-server` with a chat-capable GGUF file. `/v1/models` returns the loaded model ID; `--alias` can set a shorter ID. The documented `--cors-origins` default is `*` (all origins); set the flag to restrict allowed origins. |
| [vLLM](https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/) | **vLLM** | `http://localhost:8000/v1` | Start with `vllm serve <model-id>`, then query `/v1/models` for the served ID. The [`--allowed-origins` option](https://docs.vllm.ai/en/latest/cli/serve/) controls CORS; its documented default is `['*']`. |

For a browser app, allow only the origin you need when configuring CORS. A CLI runs outside the browser and does not need CORS. If your app is served over HTTPS, check browser mixed-content restrictions before connecting it to a plain HTTP local URL.

## Google Colab

The repository's [connect-colab-local-llm skill](../skills/connect-colab-local-llm/SKILL.md) describes running vLLM or llama.cpp on Colab and exposing a temporary, authenticated URL through a cloudflared Quick Tunnel. It checks `/v1/models`, Chat Completions, streaming, and browser CORS for each session. Enter the resulting URL (base or full), served model ID, and temporary API key in a React example.

## Voice output

The React examples also support local voice options such as VOICEVOX and AivisSpeech, and OpenAI-compatible TTS. Set up the LLM and TTS independently in the example's settings. For a local TTS server, see the [local TTS guide](local-tts.md).

## Troubleshooting

- **Network error in a browser:** The server may be stopped, or its CORS policy may reject the app's origin. Check that `/v1/models` responds with `curl`, then inspect the browser console and the server's CORS setting. Browsers often report both cases as a failed fetch.
- **Model not found:** Copy the exact `data[].id` from `/v1/models`; do not use a display name unless it matches the ID.
- **404:** Check the path. In a React example, confirm that the request URL shown below the endpoint field ends with `/v1/chat/completions`. If your server uses a custom API prefix, include it in the URL. `--list-models` calls `/v1/models` from a base URL.
- **Ollama `/api/chat` URL:** This is Ollama's native API, which uses a different request format and does not work in the React examples or the CLI. Enter `http://localhost:11434/v1` in both.
- **Emotion tags are ignored:** Small or differently trained models may not follow the example's character or emotion instructions consistently. Try a chat-capable model and check its output before adjusting TTS.
