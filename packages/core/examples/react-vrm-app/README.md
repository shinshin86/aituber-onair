# VRM Chat

![react-vrm-app image](./images/react-vrm-app.png)

A VRM avatar chat app built with `@aituber-onair/core`.  
Speech input uses Web Speech API, and lip-sync is driven in real time
from actual audio output volume.

## What this app can do

- Chat with LLM providers:
  `openai`, `openai-compatible`, `openrouter`, `gemini`, `gemini-nano`,
  `claude`, `zai`, `kimi`, `xai`, `deepseek`, `mistral`
- Provider model lists are sourced from `@aituber-onair/core`, so newly synced
  chat models such as Claude Opus 4.8, Gemini 3.5 Flash, and GPT-5.5 are available automatically
  in Settings
- Gemini 3.5 Flash automatically uses minimal thinking for chat-style responses
- `gpt-5.5-pro` is intentionally omitted because OpenAI documents it as
  non-streaming, while this example uses the standard streaming chat flow
- For `openrouter`, fetch currently working `:free` models from Settings:
  - `Fetch free models` probes candidates and appends working models to the model list
  - `Max candidates` is the maximum number of `:free` candidates to probe
    (not a target number of working models)
- Use TTS engines:
  `openai`, `geminiTts`, `openaiCompatible`, `voicevox`, `voicepeak`,
  `aivisSpeech`, `aivisCloud`, `minimax`, `xai`, `unrealSpeech`,
  `elevenLabs`, `inworld`, `gradium`, `piperPlus`, `none`
- `geminiTts` defaults to `gemini-3.1-flash-tts-preview` and exposes 30
  prebuilt voices plus style/audio-tag prompt input
- Fetch and select speaker lists dynamically:
  - `voicevox` / `aivisSpeech`: from `/speakers`
  - `minimax`: from `query/tts_speakers` after API key input
  - `elevenLabs`: from `/v2/voices` after API key input
  - `inworld`: from `/voices/v1/voices` after API key input
- Use fixed Gradium flagship voice presets with readable labels
- Use fixed Aivis Cloud voice presets (CORS-safe UI):
  - `コハク` (`22e8ed77-94fe-4ef2-871f-a86f94e9a579`)
  - `まお` (`a59cb814-0083-4369-8542-f51a29e72af7`)
- `piperPlus` expects browser assets under `public/piper/`
- Render a VRM avatar (`miko.vrm`) with optional idle VRMA animation
- Real-time lip-sync for VRM expression (`Aa`)
- Apply available VRM expressions from response emotion tags, with graceful
  fallback when a loaded VRM does not include the optional expressions
- Add subtle randomized idle expressions while the avatar is not speaking
- Control camera on the avatar stage:
  drag to rotate / mouse wheel to zoom / double-click to reset
- Set visuals directly in Settings:
  - Background image upload (PNG/JPG, memory-only)
  - Fixed avatar asset path display (`/avatar/miko.vrm`)
- Fetch live chat comments from YouTube Live or Twitch, analyze them with
  `@aituber-onair/comment-intelligence`, and send only selected comments into
  the LLM pipeline
  - YouTube uses the YouTube Data API v3 (requires a Google Cloud API key)
  - Twitch uses EventSub WebSocket with a browser-based implicit OAuth flow
- Capture one frame from OBS Virtual Camera in **Settings → Screen Vision** and
  send it to a vision-capable model for an avatar comment
- Detect repetitive conversation patterns with `@aituber-onair/manneri` and
  add an internal topic-diversification instruction before the next response

## Setup

```bash
cd packages/core/examples/react-vrm-app
npm install
npm run dev
```

After launch, open **Settings** and set API keys / provider options.  
All settings are saved in `localStorage` (`react-vrm-app-settings`).

For `openai-compatible`, set:
- `Endpoint URL` (required, full `/v1/chat/completions` URL)
- `Model` (required, free text)
- `API Key` (optional; omitted when empty)

For `gemini-nano`, set:
- Chrome 138+ with Built-in AI flags enabled
- `#optimization-guide-on-device-model`
- `#prompt-api-for-gemini-nano`
- No API key is required

## Screen Vision

Start OBS Virtual Camera, choose it from **Settings → Screen Vision**, then press
**画面を見る** to send the current frame to the selected vision-capable model.

## Stream comments (YouTube Live / Twitch)

This app can analyze live chat comments from YouTube Live or Twitch before
forwarding selected comments into the LLM.
Configure it from **Settings → Stream**.

Only one platform can be active at a time.

Comment Intelligence is enabled by default. It batches comments while the AI is
processing or speaking, filters unsafe or disruptive comments, ranks the
remaining comments, summarizes ignored comments, and sends compact live-chat
context to the AITuber. Rules mode runs without an additional LLM call. Hybrid
and LLM-assisted modes reuse the provider, model, API key, and endpoint from the
LLM settings tab for comment analysis and fall back to rules when unavailable.

Manneri is enabled by default. It watches recent user and assistant messages,
and when conversation patterns become repetitive, it injects a hidden
topic-diversification instruction into the next LLM request. You can adjust the
similarity threshold, lookback window, cooldown, and minimum message length in
Settings → Stream.

### YouTube Live

1. Create an API key in Google Cloud Console with **YouTube Data API v3** enabled.
2. Open Settings → Stream, choose `YouTube`, paste the API key, and enter the live
   video ID (the `v=` parameter of the YouTube Live URL).
3. Adjust the polling interval if needed (default: 20s), then enable the toggle.

### Twitch

This app uses the Twitch browser-based implicit OAuth flow (`response_type=token`,
scope `user:read:chat`). The access token lives only in `localStorage` inside
your browser. No server is involved.

1. Register an application in the
   [Twitch Developer Console](https://dev.twitch.tv/console/apps) and copy the
   Client ID.
2. Add **`http://localhost:5173/`** as an OAuth Redirect URL for that app
   (use the exact URL shown in Settings → Stream → Twitch; for Vite this is
   typically `http://localhost:5173/`).
3. In Settings → Stream, choose `Twitch`, paste the Client ID, then click
   **Connect to Twitch** and approve the OAuth prompt.
4. Enter the channel login name (the name in the Twitch URL, lowercase), set
   the dequeue interval, and enable the toggle.

**Deploying to a non-localhost origin:** if you host this sample app anywhere
other than `http://localhost:5173/`, register the deployed origin
(for example `https://your-domain.example/`) as an additional OAuth Redirect
URL in the Twitch Developer Console, then re-run the OAuth flow from that
origin. The Redirect URL displayed in the Settings panel is derived from
`window.location` and updates automatically.

### Security note on stored credentials

This is a sample app. The YouTube API key, Twitch Client ID, and Twitch access
token are stored **unencrypted in `localStorage`** (same place as the other
provider API keys used by this sample). Any script running on the app's origin
can read them. Do not use production-scope credentials here, do not deploy this
sample on a shared or public origin, and rotate keys if the browser storage is
shared with other users.

## Piper Plus Setup

`piperPlus` is a browser-side WASM TTS engine using ONNX Runtime Web and
OpenJTalk. Its runtime assets are not bundled with this example because of
their size and third-party license requirements. You need to prepare
`public/piper/` before selecting `Piper Plus` in Settings.

### Quick setup (recommended)

Download the prebuilt asset bundle from the `chrome-on-aituber` release and
extract it into this example:

```bash
cd packages/core/examples/react-vrm-app
curl -L -o piper-assets.tar.gz \
  https://github.com/shinshin86/chrome-on-aituber/releases/download/piper-assets-v1/piper-assets.tar.gz
mkdir -p public
tar -xzf piper-assets.tar.gz -C public/
rm piper-assets.tar.gz
npm run dev
```

This downloads and extracts the full asset set (about 85 MB) into
`public/piper/`. After extraction, select `Piper Plus` in Settings.

### Reuse an existing asset directory

If you already prepared assets for the voice example, you can copy them:

```bash
cd packages/core/examples/react-vrm-app
mkdir -p public
cp -R ../../../voice/examples/react-basic/public/piper public/
```

### Manual setup

If you prefer to collect assets yourself, you need files from these 3 sources:

1. [piper-plus](https://github.com/ayutaz/piper-plus) (`dev` branch):
   `piper-global-loader.js`, `src/`, OpenJTalk WASM/dictionary, HTS voice
2. [onnxruntime-web](https://www.npmjs.com/package/onnxruntime-web):
   `ort.min.js`, `ort-wasm-simd.wasm`, `ort-wasm.wasm`
3. [piper-plus-tsukuyomi-chan](https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan):
   ONNX model and config JSON

Place them under `public/piper/` following this layout:

```text
public/piper/
├── piper-global-loader.js
├── dist/
│   ├── ort.min.js
│   ├── ort-wasm-simd.wasm
│   ├── openjtalk.js
│   └── openjtalk.wasm
├── src/
├── assets/
│   ├── dict/
│   └── voice/
└── models/
    ├── tsukuyomi-wavlm-300epoch.onnx
    └── tsukuyomi-config.json
```

For the original setup script, detailed asset sources, and license notes, see
[`packages/voice/examples/react-basic/README.md`](../../../voice/examples/react-basic/README.md).

## Settings persistence

- LLM/TTS/API key settings are persisted in `localStorage`
- OpenRouter dynamic free model cache
  (`models`, `fetchedAt`, `maxCandidates`) is also persisted in the same key
- Visual background image is memory-only and reset on page reload

## Avatar assets (`public/avatar`)

Place these files in `public/avatar/`:

| File | Required | Description |
|---|---|---|
| `miko.vrm` | Yes | VRM model loaded by the viewer, including optional expression presets for this sample |
| `idle_loop.vrma` | Optional | Idle animation clip (if missing, only animation is skipped) |

Notes:
- `idle_loop.vrma` is reused from the `pixiv/ChatVRM` assets:
  https://github.com/pixiv/ChatVRM
- For `miko.vrm` details, see:
  https://miko.aituberonair.com/

If `miko.vrm` is missing or invalid, the app shows a load error on the
avatar stage.

The bundled model includes optional expressions such as `happy`, `sad`,
`surprised`, `mouthSmileLeft`, and `browInnerUp`. When users replace it with a
different VRM, unsupported expressions are ignored and the app falls back to the
available expressions and lip-sync behavior.

## Lip-sync tuning

You can tune constants in `src/hooks/useAudioLipsync.ts`:

| Constant | Default | Description |
|---|---|---|
| `SMOOTH_FACTOR` | `0.5` | Smoothing factor (higher = smoother, 0.0-1.0) |
| `RMS_CEILING` | `0.12` | RMS normalization ceiling (lower = more sensitive mouth movement) |
| `MOUTH_LEVELS` | `5` | Number of mouth-open steps mapped to VRM expression weight |

## Notes for Web Speech API

- Works on **Chrome / Edge** (Chrome recommended)
- Firefox and Safari are not supported
- Mic button is disabled on unsupported browsers
- Requires HTTPS or localhost

## Tech stack

- Vite + React + TypeScript
- `@aituber-onair/core` (LLM + TTS)
- `three`, `@pixiv/three-vrm`, `@pixiv/three-vrm-animation`
- Web Speech API (speech input)
- Web Audio API + `AnalyserNode` (lip-sync analysis)
