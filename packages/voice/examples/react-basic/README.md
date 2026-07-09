# AITuber Voice - React Basic Example

This is a React + Vite example demonstrating how to use the `@aituber-onair/voice` package in a modern web application.

## 🎯 Why React Example?

This example solves the local development problems with the HTML-based examples:

- ✅ **No local file/module CORS issues** - Vite dev server handles local assets and imports
- ✅ **No .js extension problems** - Bundler resolves imports automatically  
- ✅ **Hot reload** - Fast development experience
- ✅ **TypeScript support** - Full type safety
- ✅ **Production ready** - Can be built and deployed
- ✅ **Familiar workflow** - Standard React + Vite development

Provider APIs can still enforce their own browser CORS policies. If a supported
cloud voice-list endpoint rejects direct browser requests, use a backend
relay/proxy for that lookup in production.

## 🚀 Quick Start

### Prerequisites

Make sure you're in the voice package root and have built the package:

```bash
# From the voice package root
cd ../../  # Go to packages/voice
npm install
npm run build
```

### Run the Example

```bash
# Navigate to the React example
cd examples/react-basic

# Install dependencies
npm install

# Start development server
# This also rebuilds @aituber-onair/voice automatically
npm run dev
```

The app will open at `http://localhost:3000` with hot reload enabled.

## 🎤 Features

### Supported Voice Engines

- **OpenAI TTS** - High-quality voices with API key
- **OpenAI-Compatible TTS** - Self-hosted OpenAI-style endpoints such as Kokoro FastAPI
- **Inworld TTS** - Non-streaming Inworld REST API with Basic authentication
- **Gradium TTS** - One-shot Gradium REST API with flagship voice presets
- **VOICEVOX** - Free Japanese voices (requires local server)
- **AIVIS Speech** - Emotion-aware synthesis
- **VoicePeak** - Professional voice synthesis with single-tag and weighted emotion UI (`vpeakserver v0.2.0+` required for weighted mode)
- **MiniMax** - Advanced Chinese/Japanese TTS
- **Web Speech API** - Browser-native speechSynthesis playback with no API key and sample-side language filtering

### Dynamic Configuration

- **Auto URL setting** - Default URLs are set automatically when switching engines
- **Smart API key handling** - Required/optional based on engine
- **Real-time feedback** - Status updates during speech generation
- **Error handling** - Clear error messages for troubleshooting

## 🛠️ Development

### Project Structure

```
src/
├── App.tsx          # Main application component
├── App.css          # Component-specific styles  
├── main.tsx         # React application entry point
└── index.css        # Global styles
```

### Key Implementation Details

```typescript
import { VoiceEngineAdapter, type VoiceServiceOptions } from '@aituber-onair/voice'

// Create voice service
const options: VoiceServiceOptions = {
  engineType: 'openai',
  apiKey: 'your-api-key',
  speaker: 'alloy'
}

const service = new VoiceEngineAdapter(options)

// Synthesize speech
await service.speak({ text: 'Hello, world!' })
```

### Customization

You can easily customize this example:

1. **Add new engines** - Extend the `ENGINE_DEFAULTS` configuration
2. **Custom UI** - Modify the React components and styles
3. **Advanced features** - Add emotion selection, voice cloning, etc.
4. **Integration** - Use as a starting point for your own projects

## 🏗️ Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The built files will be in the `dist/` directory and can be deployed to any static hosting service.

## 🔧 Configuration

### Engine-Specific Setup

#### VOICEVOX
```bash
# Download and run VOICEVOX locally
# Default URL: http://localhost:50021
```

#### MiniMax
```bash
# API key format: "your-api-key:your-group-id"
# MiniMax uses documented system voice IDs. This example shows representative
# presets from https://platform.minimax.io/docs/faq/system-voice-id instead of
# fetching a dynamic voice list, because the linked Get Voice API is currently
# unavailable.
```

#### OpenAI TTS
```bash
# Standard OpenAI API key: "sk-..."
```

#### OpenAI-Compatible TTS
```bash
# Kokoro FastAPI default endpoint: http://localhost:8880/v1/audio/speech
# API key is optional. Set the model explicitly to one accepted by your endpoint.
```

#### Inworld TTS
```bash
# Default endpoint: https://api.inworld.ai/tts/v1/voice
# Use the Basic Base64 authorization value from Inworld as the API key.
# Do not expose Basic credentials in production browser apps; use a backend proxy or JWT.
```

#### Gradium TTS
```bash
# Default endpoint: https://api.gradium.ai/api/post/speech/tts
# Enter a Gradium API key, then try fetching voices or select a built-in
# flagship voice preset.
# If the voice-list request fails CORS in the browser, use a backend proxy for
# dynamic voice selection in production.
```

#### Aivis Cloud
```bash
# Default endpoint: https://api.aivis-project.com/v1/tts/synthesize
# The synthesis endpoint can be used from the browser, but Aivis Cloud
# model/list APIs such as /v1/aivm-models/search may fail browser CORS checks.
# This example keeps fixed model UUID input. For dynamic model selection, call
# getVoiceEngineVoiceList('aivisCloud') from a Node.js backend or proxy in
# production.
```

#### Web Speech API
```bash
# No API key or server is required. The browser plays audio directly through
# window.speechSynthesis, so audio ArrayBuffer callbacks are not available.
# Use the "Browser voice list" button to select a local browser voice.
```

## Piper Plus Setup

`piperPlus` is a browser-side WASM TTS engine using ONNX Runtime Web and OpenJTalk. Its runtime assets are **not bundled** with this example due to their size and third-party license requirements. You need to place them under `public/piper/` before use.

### Quick setup (recommended)

A setup script is provided that downloads all required assets from the [chrome-on-aituber](https://github.com/shinshin86/chrome-on-aituber) GitHub Release:

```bash
./scripts/setup-piper-assets.sh
```

This downloads and extracts the full asset set (~85 MB) into `public/piper/`. After running the script, start the dev server and select the "Piper Plus" engine.

### Manual setup

If you prefer to collect assets yourself, you need files from these 3 sources:

1. **[piper-plus](https://github.com/ayutaz/piper-plus)** (`dev` branch) — `piper-global-loader.js`, `src/` JS modules, OpenJTalk WASM/dictionary, and HTS voice files
2. **[onnxruntime-web](https://www.npmjs.com/package/onnxruntime-web)** (npm) — `ort.min.js`, `ort-wasm-simd.wasm`, `ort-wasm.wasm`
3. **[piper-plus-tsukuyomi-chan](https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan)** (Hugging Face) — ONNX model and config JSON

Place them under `public/piper/` following this layout:

```text
public/piper/
├── piper-global-loader.js
├── dist/
│   ├── ort.min.js
│   ├── ort-wasm-simd.wasm
│   ├── openjtalk.js
│   └── openjtalk.wasm
├── src/          (piper-plus JS modules)
├── assets/
│   ├── dict/     (OpenJTalk dictionary files)
│   └── voice/    (HTS voice file, e.g. mei_normal.htsvoice)
└── models/
    ├── tsukuyomi-wavlm-300epoch.onnx
    └── tsukuyomi-config.json
```

For detailed step-by-step instructions, refer to the [chrome-on-aituber README](https://github.com/shinshin86/chrome-on-aituber).

### Third-party licenses

The Piper Plus engine uses the following third-party components. By downloading and using these assets you agree to their respective license terms.

| Component | License | Source |
|-----------|---------|--------|
| piper-plus | MIT License (c) 2022 Michael Hansen, (c) 2025 ayutaz | [GitHub](https://github.com/ayutaz/piper-plus) |
| Piper TTS | MIT License (c) 2022 Michael Hansen | [GitHub](https://github.com/rhasspy/piper) |
| ONNX Runtime Web | MIT License (c) Microsoft Corporation | [npm](https://www.npmjs.com/package/onnxruntime-web) |
| Open JTalk | BSD 3-Clause License | [SourceForge](https://open-jtalk.sourceforge.net/) |
| Tsukuyomi-chan Corpus | Tsukuyomi-chan Corpus terms (c) Rei Yumesaki | [Official site](https://tyc.rei-yumesaki.net/) |
| piper-plus-tsukuyomi-chan model | Compliant with Tsukuyomi-chan Corpus | [Hugging Face](https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan) |

**Important:** The Tsukuyomi-chan voice model is not governed solely by common OSS licenses. If you redistribute or create derivative works, review the [terms of use](https://tyc.rei-yumesaki.net/about/terms/) and [credit guide](https://tyc.rei-yumesaki.net/about/terms/credit/) on the official Tsukuyomi-chan website.

## 🚨 Troubleshooting

### Common Issues

1. **Import errors** - `npm run dev` and `npm run build` rebuild `@aituber-onair/voice` automatically. If you still see stale behavior, restart the dev server once.
2. **API errors** - Check your API keys and ensure services are running
3. **CORS errors** - For browser use, the target server or provider API must return proper CORS headers. If it does not, use your own backend relay/proxy in production. This can affect supported cloud voice-list endpoints even when synthesis itself works.

### Audio Playback

The example handles audio playback automatically using the browser's built-in audio capabilities. No additional setup required.

## 🎮 Extending the Example

Want to add more features? Consider:

- **Emotion selection UI** - Add buttons for different emotions
- **Voice preset management** - Save/load favorite configurations  
- **Batch processing** - Process multiple texts at once
- **Audio export** - Download generated audio files
- **Real-time streaming** - Stream audio as it's generated

## 📝 Notes

This example demonstrates the **recommended way** to use the `@aituber-onair/voice` package in web applications. The bundler approach eliminates the ES module complexity that occurs with direct HTML imports.

For production applications, consider:
- Environment variable management for API keys
- Error boundaries for robust error handling
- Loading states and user feedback
- Audio caching and optimization
