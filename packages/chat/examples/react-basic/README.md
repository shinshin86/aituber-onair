# React Chat Example

Interactive web application demonstrating the @aituber-onair/chat package with React, TypeScript, and Vite.

## Features

- 🔄 **Provider Switching** - Switch between OpenAI, OpenAI-compatible, Claude, Gemini, OpenRouter, Z.ai, and Kimi in real-time
- 💬 **Real-time Streaming** - See AI responses as they're generated
- 📝 **Chat History** - Full conversation history with role indicators
- 🖼️ **Vision Support** - Upload and analyze images (drag & drop supported)
- 🎛️ **Response Control** - Adjust response lengths and model settings
- 🎨 **Modern UI** - Clean, responsive interface
- ⚡ **Fast Development** - Vite with hot module replacement
- 🔒 **Secure** - API keys stored in browser session only

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

4. Enter your API key(s) and start chatting!

## Development

### Prerequisites

- Node.js 16+
- npm or yarn
- API keys for at least one provider:
  - OpenAI: https://platform.openai.com/api-keys
  - OpenAI-compatible (Local LLM): use your own endpoint and token (or dummy key)
  - Claude: https://console.anthropic.com/
  - Gemini: https://makersuite.google.com/app/apikey
  - OpenRouter: https://openrouter.ai/
  - Z.ai: https://platform.z.ai/
  - Kimi (Moonshot): https://platform.moonshot.cn/

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Project Structure

```
react-basic/
├── src/
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.tsx             # Application entry point
│   └── components/
│       ├── ChatInterface.tsx # Chat UI component
│       ├── ProviderSelector.tsx # Provider switching
│       └── MessageList.tsx  # Message display
├── index.html               # HTML template
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── vite.config.ts           # Vite configuration
```

## Usage Guide

### Basic Chat

1. Select a provider (OpenAI, OpenAI-compatible, Claude, Gemini, OpenRouter, Z.ai, or Kimi)
2. Enter your API key
3. Type a message and press Enter or click Send
4. Watch the AI response stream in real-time

### Local LLM (OpenAI-Compatible)

1. Select `OpenAI-Compatible`
2. Set `Endpoint URL` (example: `http://127.0.0.1:18080/v1/chat/completions`)
3. Set `Model ID` to the exact model name exposed by your server
4. API key is optional (if empty, Authorization header is omitted)
5. Send a message and verify streaming/non-stream behavior

### Image Analysis (Vision)

1. Ensure you're using a vision-capable model
2. Click the image icon or drag & drop an image
3. Add a text prompt about the image
4. Send to analyze

### Response Length Control

Use the dropdown to select response length:
- Very Short: ~50 tokens
- Short: ~100 tokens
- Medium: ~200 tokens (default)
- Long: ~500 tokens
- Very Long: ~1000 tokens

### Provider-Specific Features

**OpenAI**
- Models: GPT-5.1, GPT-5 (Standard), GPT-5 Mini, GPT-5 Nano, GPT-4.1, GPT-4, GPT-3.5
- Vision: GPT-4 Vision
- Best for: General purpose, code generation, advanced reasoning
- Reasoning Effort: GPT-5 (5.0) supports Minimal/Low/Medium/High, while GPT-5.1 swaps Minimal for None (fastest) plus Low/Medium/High

**OpenAI-Compatible (Local/Self-Hosted)**
- Endpoint: user-configurable full URL (`/v1/chat/completions`)
- Model: user-configurable model ID
- Vision: depends on your server/model implementation
- Best for: local LLMs (Ollama/LM Studio/vLLM-compatible endpoints)

**Claude**
- Models: Claude Sonnet 4.6, Claude Opus 4.6, Claude 4.5 (Opus, Sonnet, Haiku), Claude 4 (Sonnet, Opus), Claude 3 (Sonnet, Haiku)
- Vision: All Claude 4.6/4.5/4/3 models listed above
- Best for: Long context, tool use + advanced reasoning

**Gemini**
- Models: Gemini 3.1 Pro Preview, Gemini 3 Pro/Flash Preview, Gemini 2.5 Pro/Flash/Flash Lite, Gemini 2.0 Flash/Flash Lite
- Vision: Supported for all listed Gemini models
- Best for: Fast responses, cost-effective

**OpenRouter**
- Models: Curated multi-provider model list (OpenAI/Claude/Gemini/Z.ai/Kimi)
- Vision: Depends on selected routed model
- Best for: Flexible model routing and unified API usage
- Dynamic Free Models: Click `Fetch free models` to probe currently available `:free` models and append working IDs to the model list
- Max candidates: Adjustable in UI (default `1`) to control probe request volume
- `Max candidates = 10` means probing up to 10 `:free` candidates (it does not continue until 10 working models are found)
- Persistence: Fetched dynamic free model IDs are saved under localStorage root key `AITuberOnAirChat_example_react-basic`

**Z.ai**
- Models: GLM-5, GLM-4.7/4.6, GLM-4.6V family
- Vision: GLM-4.6V family (`glm-5` is currently text-only)
- Best for: OpenAI-compatible GLM integration

**Kimi**
- Models: Kimi K2.5
- Vision: Supported
- Best for: Moonshot models with OpenAI-compatible API

### OpenRouter Dynamic Free Models (Manual Check)

1. Select `OpenRouter` as provider
2. Enter a valid OpenRouter API key
3. Click `Fetch free models` in the model settings panel
4. Confirm fetched `:free` models are added to the `Models` list
5. Select one dynamic model and send a chat message
6. Reload the page and confirm the dynamic list is restored from localStorage

## Troubleshooting

### Build Issues

If you encounter module resolution errors:
```bash
cd ../../  # Go to chat package root
npm run build
cd examples/react-basic
npm install
```

### API Errors

- **401**: Invalid API key
- **429**: Rate limit exceeded
- **500**: Server error (try again)

### CORS Issues

The Vite dev server proxies API requests to avoid CORS issues. For production, you'll need to:
1. Use a backend proxy
2. Configure CORS on your server
3. Use provider SDKs that handle CORS

## Customization

### Styling

Modify `App.css` for custom styling. The app uses CSS variables for theming:

```css
:root {
  --primary-color: #007bff;
  --background: #f5f5f5;
  --text-color: #333;
}
```

### Adding Features

Common extensions:
- Chat export/import
- Message editing
- Voice input/output
- Custom system prompts
- Tool/function integration

## Production Deployment

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting service

3. Set up environment variables for API keys (don't hardcode!)

4. Configure a backend proxy for API calls

## Security Notes

- Never commit API keys
- Use environment variables in production
- Implement rate limiting
- Add user authentication for public deployments
- Validate and sanitize all inputs

## Learn More

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Chat Package Documentation](../../README.md)
