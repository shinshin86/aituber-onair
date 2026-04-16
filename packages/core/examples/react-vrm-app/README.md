# VRM Chat

![react-vrm-app image](./images/react-vrm-app.png)

A VRM avatar chat app built with `@aituber-onair/core`.  
Speech input uses Web Speech API, and lip-sync is driven in real time
from actual audio output volume.

## What this app can do

- Chat with LLM providers:
  `openai`, `openai-compatible`, `openrouter`, `gemini`, `gemini-nano`,
  `claude`, `zai`, `kimi`, `xai`
- Provider model lists are sourced from `@aituber-onair/core`, so newly synced
  chat models are available automatically in Settings
- For `openrouter`, fetch currently working `:free` models from Settings:
  - `Fetch free models` probes candidates and appends working models to the model list
  - `Max candidates` is the maximum number of `:free` candidates to probe
    (not a target number of working models)
- Use TTS engines:
  `openai`, `geminiTts`, `openaiCompatible`, `voicevox`, `voicepeak`,
  `aivisSpeech`, `aivisCloud`, `minimax`, `xai`, `piperPlus`, `none`
- `geminiTts` defaults to `gemini-3.1-flash-tts-preview` and exposes 30
  prebuilt voices plus style/audio-tag prompt input
- Fetch and select speaker lists dynamically:
  - `voicevox` / `aivisSpeech`: from `/speakers`
  - `minimax`: from `query/tts_speakers` after API key input
- Use fixed Aivis Cloud voice presets (CORS-safe UI):
  - `コハク` (`22e8ed77-94fe-4ef2-871f-a86f94e9a579`)
  - `まお` (`a59cb814-0083-4369-8542-f51a29e72af7`)
- `piperPlus` expects browser assets under `public/piper/`
- Render a VRM avatar (`miko.vrm`) with optional idle VRMA animation
- Real-time lip-sync for VRM expression (`Aa`)
- Control camera on the avatar stage:
  drag to rotate / mouse wheel to zoom / double-click to reset
- Set visuals directly in Settings:
  - Background image upload (PNG/JPG, memory-only)
  - Fixed avatar asset path display (`/avatar/miko.vrm`)

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
| `miko.vrm` | Yes | VRM model loaded by the viewer |
| `idle_loop.vrma` | Optional | Idle animation clip (if missing, only animation is skipped) |

Notes:
- `idle_loop.vrma` is reused from the `pixiv/ChatVRM` assets:
  https://github.com/pixiv/ChatVRM
- For `miko.vrm` details, see:
  https://miko.aituberonair.com/

If `miko.vrm` is missing or invalid, the app shows a load error on the
avatar stage.

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
