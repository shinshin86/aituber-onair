# React Chat Example

Interactive web application demonstrating the @aituber-onair/chat package with React, TypeScript, and Vite.

## Features

- 🔄 **Provider Switching** - Switch between OpenAI, Claude, and Gemini in real-time
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
  - Claude: https://console.anthropic.com/
  - Gemini: https://makersuite.google.com/app/apikey

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

1. Select a provider (OpenAI, Claude, or Gemini)
2. Enter your API key
3. Type a message and press Enter or click Send
4. Watch the AI response stream in real-time

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
- Models: GPT-4, GPT-3.5
- Vision: GPT-4 Vision
- Best for: General purpose, code generation

**Claude**
- Models: Claude 3 (Opus, Sonnet, Haiku)
- Vision: All Claude 3 models
- Best for: Long context, analysis

**Gemini**
- Models: Gemini Pro
- Vision: Gemini Pro Vision
- Best for: Fast responses, cost-effective

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