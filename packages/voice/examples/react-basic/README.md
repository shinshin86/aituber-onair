# AITuber Voice - React Basic Example

This is a React + Vite example demonstrating how to use the `@aituber-onair/voice` package in a modern web application.

## 🎯 Why React Example?

This example solves all the problems with the HTML-based examples:

- ✅ **No CORS issues** - Vite dev server handles everything
- ✅ **No .js extension problems** - Bundler resolves imports automatically  
- ✅ **Hot reload** - Fast development experience
- ✅ **TypeScript support** - Full type safety
- ✅ **Production ready** - Can be built and deployed
- ✅ **Familiar workflow** - Standard React + Vite development

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
npm run dev
```

The app will open at `http://localhost:3000` with hot reload enabled.

## 🎤 Features

### Supported Voice Engines

- **OpenAI TTS** - High-quality voices with API key
- **VOICEVOX** - Free Japanese voices (requires local server)
- **AIVIS Speech** - Emotion-aware synthesis
- **VoicePeak** - Professional voice synthesis
- **MiniMax** - Advanced Chinese/Japanese TTS

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
```

#### OpenAI TTS
```bash
# Standard OpenAI API key: "sk-..."
```

## 🚨 Troubleshooting

### Common Issues

1. **Import errors** - Make sure the voice package is built: `npm run build` from voice package root
2. **API errors** - Check your API keys and ensure services are running
3. **CORS errors** - Should not occur in this example (that's the point!)

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
