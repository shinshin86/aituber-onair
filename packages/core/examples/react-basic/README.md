# React Basic Example - AITuber OnAir Core

![Demo](./images/demo.png)

A comprehensive React-based AI chat application demonstrating the full capabilities of [AITuber OnAir Core](https://www.npmjs.com/package/@aituber-onair/core). This example showcases multi-provider LLM integration, advanced voice synthesis, and real-time streaming features in a modern web interface.

## 🎯 Overview

This example application serves as a practical implementation guide for integrating AITuber OnAir Core into React applications. It demonstrates how to build a fully-featured AI chat interface with support for multiple LLM providers, various TTS engines, and advanced configuration options including GPT-5 support.

### Key Features

- **🤖 Multi-Provider LLM Support**
  - OpenAI (GPT-4.1, GPT-4o, GPT-5 series including GPT-5.6 Sol/Terra/Luna, GPT-5.5, and GPT-5.4 variants)
  - Gemini Nano (Chrome Built-in AI, no API key)
  - OpenAI-Compatible (local/self-hosted Chat Completions endpoints)
  - Google Gemini (Gemini 3.6 Flash, Gemini 3.5 Flash / Flash-Lite, Gemini 3.1 Flash-Lite, Gemma 4, Pro, Flash, Thinking models)
  - Anthropic Claude (4.8 Opus, 4.7 Opus, 4.6 Sonnet/Opus, 4.5 Opus/Sonnet/Haiku, 4.x, 3.x families)
  - DeepSeek, Mistral, Sakana AI (disabled in browser UI), and PLaMo first-class providers
  - Seamless provider switching

- **🎙️ Comprehensive Voice Synthesis**
  - 15 different TTS engines with unique capabilities
  - Real-time voice streaming
  - Speaker selection for each engine
  - Emotion-aware synthesis support

- **💬 Advanced Chat Features**
  - Text and image (vision) chat support
  - Real-time streaming responses
  - Adjustable response length (40-5000 tokens)
  - Chat history management

- **🎨 AI Avatar Generation**
  - Dynamic avatar generation using Gemini-2.5-Flash-Image API
  - Context-aware avatar updates based on conversation content
  - Base image modification to preserve character consistency
  - Automatic expression adjustment based on conversation mood

- **⚙️ GPT-5 Specific Features**
  - Quick presets (Casual, Balanced, Expert)
  - Custom configuration options
  - Verbosity and reasoning effort control
  - Endpoint preference selection

- **🔧 Developer Tools**
  - Tool integration framework
  - MCP (Model Context Protocol) support
  - DeepWiki integration example

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for your chosen LLM provider(s)
  (`openai-compatible` can work without an API key)
- (Optional) API keys for voice engines

### Installation

1. Clone the repository and navigate to the example:
```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-basic
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
npm run fmt      # Format code with Biome
```

## 🛠️ Configuration

### LLM Provider Setup

Click the "設定" (Settings) button to configure your AI provider:

1. **Select Provider**: Choose from OpenAI, Gemini, Gemini Nano, Claude, Z.ai, Kimi, xAI, DeepSeek, Mistral, PLaMo, OpenRouter, or OpenAI-Compatible. Sakana AI is shown as disabled for browser-only usage.
2. **Enter API Key**: Provide your provider's API key (`openai-compatible` and `gemini-nano` can work without one)
3. **Choose Model**: Select the specific model to use
4. **System Prompt**: Customize the AI's behavior and personality

#### Provider-Specific Models

**OpenAI:**
- GPT-4.1 series (Nano, Mini, Standard)
- GPT-5 series (Nano, Mini, Standard, 5.1, 5.4, 5.5, 5.4 Mini, 5.4 Nano, 5.4 Pro)
- o3-mini
- GPT-4o, GPT-4o Mini

**OpenAI-Compatible:**
- Any server model ID (default example: `local-model`)
- Endpoint URL is required (full `/v1/chat/completions` URL)
- API key is optional (header is omitted when empty)
- This example disables tool calling automatically for better local-LLM compatibility
- Vision support is treated as `unknown`: image upload is allowed after
  configuration, but unsupported endpoint/model combinations fail at runtime

**Gemini:**
- Gemma 4 series (31B IT, 26B A4B IT)
- Gemini 3.6 Flash and Gemini 3.5 Flash / Flash-Lite
- Gemini 3 series (3.1 Flash-Lite, 3.1 Pro Preview, 3 Flash Preview, plus deprecated preview aliases)
- Gemini 2.5 series (Flash Lite, Flash, Pro)
- Gemini 2.5 Flash Lite Preview (06-17)
- Gemini 3 Flash-family models expose `reasoning_effort`; Flash defaults to `minimal`, while Pro defaults to `low`
- Gemini 2.5 keeps using `thinkingBudget` and does not expose this control

**Gemini Nano:**
- Built-in Chrome `gemini-nano` model
- No API key required
- Requires Chrome 138+ with `#optimization-guide-on-device-model` and `#prompt-api-for-gemini-nano` enabled

**Claude:**
- Claude Opus 4.8
- Claude Opus 4.7
- Claude 4.6 Opus
- Claude 4.6 Sonnet
- Claude 4.5 series (Opus, Sonnet, Haiku)
- Claude 4 series (Sonnet, Opus, deprecated but still available)
- Claude 3 Haiku (deprecated but still available)

**Z.ai:**
- GLM-5.2
- GLM-5.1
- GLM-5V-Turbo (vision)
- GLM-5 and GLM-5-Turbo (text-only)
- GLM-4.7 series
- GLM-4.6 and GLM-4.6V series

**Kimi:**
- Kimi K3 with vision and the currently required `reasoning_effort: 'max'`
- Kimi K2.7 Code
- Kimi K2.7 Code HighSpeed
- Kimi K2.6
- Kimi K2.5

**xAI:**
- Grok 4.5 and Grok 4.3
- Grok 4.20 series
- Grok 4.1 Fast series
- Grok 4.5 exposes `reasoning_effort` and defaults to `low`; Grok 4.3 defaults to `none` for lower latency

**DeepSeek:**
- DeepSeek V4 Flash
- DeepSeek V4 Pro

**Mistral:**
- Ministral 3 (3B, 8B, and 14B; vision-capable)
- Mistral Small Latest
- Mistral Medium 3.5
- Mistral Large Latest / 3, Small 4, Medium 3.1

**Sakana AI:**
- Fugu
- Fugu Ultra / Fugu Ultra 20260615
- Shown as disabled in this browser example because direct browser requests can fail with CORS

**PLaMo:**
- PLaMo 3.0 Prime
- PLaMo 2.2 Prime

**OpenRouter:**
- Curated multi-provider models (OpenRouter Auto/Fusion, OpenAI/Claude/Gemini latest aliases, OpenAI GPT-5.5, Z.ai GLM-5.2, Kimi K2.7 Code)
- Fusion bills the combined underlying model calls and any enabled web search/fetch usage
- GLM-5.2 defaults reasoning effort to `none` and omits automatic `max_tokens`
- `Fetch free models` button to probe currently available `:free` models
- Dynamic free models are added to the model select list
- `Max candidates` means "maximum number of `:free` candidates to probe"
  (not "keep probing until N working models are found")
- Dynamic free model cache is stored in `localStorage`
  (`AITuberOnAirCore_example_react-basic`)

### GPT-5 Configuration

When using GPT-5 models, additional configuration options become available:

#### Response Length
- Base presets: Very Short (40), Short (100), Medium (200, default),
  Long (300), Very Long (1000), Deep (5000)
- For OpenAI GPT-5 family models, these are treated as preset levels rather
  than strict output limits
- The actual output token limit may be raised automatically based on the model
  and reasoning effort to reduce premature truncation

#### Presets
- **Casual**: Fast, conversational responses
- **Balanced**: General purpose with good reasoning
- **Expert**: Deep analysis and complex problem solving
- **Custom**: Manual configuration

#### Custom Settings
- **Verbosity**: Low, Medium, High
- **Reasoning Effort**: `none`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max` (options change by provider and model capability)
- **Endpoint**: Chat Completions API or Responses API (`gpt-5.4-pro` is fixed to Responses API)

`gpt-5.5-pro` is not listed because OpenAI documents it as non-streaming,
while this example uses the standard streaming chat flow.

## 🎤 Voice Engine Configuration

### Supported TTS Engines

The application supports 15 different Text-to-Speech engines:

#### 1. **OpenAI TTS**
- Requires OpenAI API key
- Voices: alloy, echo, fable, onyx, nova, shimmer
- High-quality neural voices

#### 2. **Gemini TTS**
- Requires Google API key
- Default model: `gemini-3.1-flash-tts-preview`
- Voices: 30 prebuilt options including Zephyr, Aoede, Kore, Leda, Puck, Charon, Fenrir, and Orus
- Supports model selection, language code, and style/audio-tag prompt

#### 3. **OpenAI-Compatible TTS**
- Optional API key
- Custom `/v1/audio/speech` endpoints
- Configurable endpoint, model, voice, and speed

#### 4. **VOICEVOX**
- Free, open-source Japanese TTS
- No API key required
- Requires local VOICEVOX server running
- Dynamic speaker fetching

#### 5. **Aivis Speech**
- Local TTS engine
- No API key required
- Requires Aivis Speech server
- Multiple character voices

#### 6. **Aivis Cloud API**
- Cloud-based TTS service
- Requires API key
- Advanced voice parameters
- Emotion control support

#### 7. **VoicePeak**
- Local TTS engine
- No API key required
- 6 built-in speakers
- Natural Japanese voices
- Supports single-tag and weighted emotion overrides (`vpeakserver >= v0.2.0`)

#### 8. **MiniMax**
- Chinese TTS service
- Requires API key and Group ID
- Multiple voice options
- Global endpoint support
- Supports speed/volume/pitch tuning and audio settings  
  (sample rate: 8k/16k/22.05k/24k/32k/44.1k Hz, bitrate: 32/64/128/256 kbps)

#### 9. **xAI TTS**
- Requires xAI API key
- Voices: ara, eve, leo, rex, sal
- Supports language, codec, sample rate, and bitrate

#### 10. **Unreal Speech**
- Requires Unreal Speech API key
- Uses the v8 `/stream` endpoint
- Supports bitrate, codec, speed, pitch, and temperature options

#### 11. **ElevenLabs**
- Requires ElevenLabs API key
- Fetches voices from the ElevenLabs Voices API and lets users select by name
- Supports model, output format, language code, voice settings, seed, and text normalization options

#### 12. **Inworld**
- Requires Inworld Basic Base64 credentials
- Fetches voices from the Inworld Voices API and lets users select by name
- Supports model, audio encoding, sample rate, bitrate, language, delivery mode, and temperature options

#### 13. **Gradium**
- Requires Gradium API key
- Lets users select flagship Gradium voices by readable names
- Supports output format, temperature, voice similarity, padding bonus, and rewrite rules

#### 14. **Piper Plus**
- Browser-side WASM TTS
- No API key required
- Requires `public/piper/` assets
- Supports speed and noise scale

#### 15. **Web Speech API**
- Browser-native speech synthesis with no API key
- Loads the browser's available voices and supports language, rate, pitch, and volume
- Plays directly through the browser, so audio-buffer-based lip sync is not supported

### Speech Chunking Settings

This example enables `speechChunking` so that long responses start speaking
sooner. Default configuration in `App.tsx`:

```ts
speechChunking: {
  enabled: true,
  minWords: 40,
  locale: 'all',
}
```

- `locale: 'all'` merges Japanese/English/Korean/Chinese punctuation presets,
  making the splitter robust even when multiple languages appear in one reply.
- You can override this runtime by calling
  `aituber.updateSpeechChunking({ enabled: true, minWords: 30, locale: 'en', separators: ['.', '!', '?'] })`
  or set `enabled: false` to revert to the legacy single-audio flow.
- Leaving `speechChunking` undefined keeps backwards-compatible behaviour
  (single TTS request per assistant response).

### Voice Engine Setup

1. Navigate to the Voice tab in settings
2. Select your preferred engine
3. Enter API key if required
4. Choose speaker/voice from available options
5. Click "設定を反映" to apply

### Piper Plus Setup

`piperPlus` is a browser-side WASM TTS engine using ONNX Runtime Web and
OpenJTalk. Its runtime assets are not bundled with this example because of
their size and third-party license requirements. You need to place them under
`public/piper/` before use.

### Quick setup (recommended)

```bash
cd packages/core/examples/react-basic
curl -L -o piper-assets.tar.gz \
  https://github.com/shinshin86/chrome-on-aituber/releases/download/piper-assets-v1/piper-assets.tar.gz
mkdir -p public
tar -xzf piper-assets.tar.gz -C public/
rm piper-assets.tar.gz
npm run dev
```

This downloads and extracts the full asset set (about 85 MB) into
`public/piper/`. After extraction, start the dev server and select
`Piper Plus`.

### Reuse an existing asset directory

You can also reuse the prepared assets from the voice example:

```bash
cd packages/core/examples/react-basic
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

## 🎨 AI Avatar Generation

### Gemini-2.5-Flash-Image Integration

The application features dynamic avatar generation that creates personalized avatar images based on conversation context using Google's Gemini-2.5-Flash-Image API.

#### Key Features

- **Context-Aware Generation**: Avatars are generated based on the assistant's responses and conversation mood
- **Base Image Modification**: Uses existing avatar as a base to maintain character consistency
- **Automatic Updates**: Avatar automatically updates after each assistant response
- **Expression Matching**: Facial expressions adjust to match conversation emotions
- **Real-time Status**: Visual indicators show when avatar generation is in progress

#### Setup

1. Navigate to the AI画像生成機能 (AI Image Generation) section in settings
2. Check "アシスタントの返答に基づいてアバター画像を自動生成する"
3. Enter your Gemini API Key in the password field
4. The system will automatically generate and update avatars based on conversations

#### Requirements

- Valid Gemini API Key with access to Gemini-2.5-Flash-Image-Preview model
- Internet connection for API requests
- Modern browser with blob URL support

#### How It Works

1. When the assistant responds, the system creates a context-aware prompt
2. Current avatar image is sent as a base image to Gemini API
3. Gemini generates a modified version reflecting the conversation mood
4. New avatar is automatically applied and displayed in the interface

## 📁 Project Structure

```
react-basic/
├── src/
│   ├── App.tsx                 # Main application component
│   ├── main.tsx               # Application entry point
│   ├── index.css              # Global styles
│   ├── constants/             # Configuration constants
│   │   ├── openai.ts          # OpenAI models and settings
│   │   ├── gemini.ts          # Gemini models
│   │   ├── claude.ts          # Claude models
│   │   ├── voiceEngines.ts    # TTS engine configurations
│   │   ├── tools.ts           # Tool definitions
│   │   ├── mcp.ts             # MCP server configs
│   │   └── speakers/          # Speaker configurations
│   │       ├── openaiTts.ts
│   │       ├── voicevox.ts
│   │       ├── aivisCloud.ts
│   │       ├── aivisSpeech.ts
│   │       ├── voicepeak.ts
│   │       └── minimax.ts
│   ├── mcpClient.ts           # MCP client implementation
│   ├── utils/                 # Utility functions
│   │   └── geminiImageGeneration.ts  # Gemini image generation utilities
│   └── assets/                # Static assets
│       └── icons/             # UI icons
├── index.html                 # HTML template
├── package.json               # Dependencies and scripts
├── vite.config.ts            # Vite configuration
└── tsconfig.json             # TypeScript configuration
```

## 🔌 Advanced Features

### Tool Integration

The example includes a sample tool implementation (`randomInt`) that demonstrates how to extend the AI's capabilities:

```typescript
// Define tool schema
const randomIntTool = {
  name: 'randomInt',
  description: 'Generate a random integer',
  parameters: { /* ... */ }
};

// Implement tool handler
const randomIntHandler = async (args) => {
  // Tool logic here
};
```

### MCP (Model Context Protocol) Support

Enable DeepWiki MCP integration for enhanced knowledge access:

1. Check "Enable DeepWiki MCP" in settings
2. The AI can then access DeepWiki for additional context
3. Uncomment MCP client code for custom MCP servers

### Image Chat Support

Upload images for vision-enabled models:
1. Click the image attachment button
2. Select an image file
3. The AI will analyze and respond to image content

For `openai-compatible`, the example also allows image upload when configured.
Because the endpoint/model is arbitrary, vision support cannot be pre-validated
and may fail at runtime.

## 🎨 Customization

### Styling

The application uses inline styles for simplicity. Key style customization points:

- Header styling in `App.tsx`
- Chat message bubbles
- Settings modal appearance
- Button themes

### Adding New Features

To extend the application:

1. **New LLM Provider**: Add model definitions in `constants/`
2. **New TTS Engine**: Update `voiceEngines.ts` and add speaker configs
3. **Custom Tools**: Define in `tools.ts` with handler implementation
4. **UI Components**: Modify `App.tsx` or create new components

## 🐛 Troubleshooting

### Common Issues

**"API Keyを入力してください"**
- Ensure you've entered a valid API key in settings

**Voice not working**
- Check if the selected TTS engine server is running (for local engines)
- Verify API key for cloud-based engines
- Ensure speaker is selected

**Avatar generation not working**
- Verify Gemini API Key has access to Gemini-2.5-Flash-Image-Preview model
- Check browser console for API errors
- Ensure stable internet connection
- Confirm Gemini API usage quotas

**Streaming not working**
- Verify your LLM provider supports streaming
- Check network connectivity

**CORS errors with local TTS**
- Ensure local TTS servers are configured to allow CORS
- Check server is running on the correct port

### Local TTS Server Endpoints

- VOICEVOX: `http://localhost:50021`
- VoicePeak: `http://localhost:19000`
- Aivis Speech: `http://localhost:10101`

## 🔗 Related Resources

- [AITuber OnAir Core Documentation](https://github.com/shinshin86/aituber-onair/tree/main/packages/core)
- [AITuber OnAir Main Repository](https://github.com/shinshin86/aituber-onair)
- [NPM Package](https://www.npmjs.com/package/@aituber-onair/core)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Anthropic Console](https://console.anthropic.com/)

## 📄 License

This example is part of the AITuber OnAir project and follows the same license terms.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve this example.
