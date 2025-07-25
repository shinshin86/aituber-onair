# Voice Package Examples

This directory contains examples demonstrating how to use the @aituber-onair/voice package in web applications.

## 🚀 React + Vite Example

### [React Basic Example](./react-basic/)
Modern React + TypeScript example with Vite bundler - the recommended way to use the voice package!

- ✅ **No CORS issues** - Vite dev server handles everything
- ✅ **No .js extension problems** - Bundler resolves imports automatically
- ✅ **Hot reload** - Fast development experience
- ✅ **TypeScript support** - Full type safety
- ✅ **Production ready** - Can be built and deployed
- ✅ **Dynamic engine switching** - Real-time configuration updates
- ✅ **Smart API key management** - Automatic validation based on engine requirements

**Quick Start:**
```bash
cd react-basic
npm install
npm run dev
```

### Features

- **Multiple TTS Engines**: OpenAI TTS, VOICEVOX, AIVIS Speech, VoicePeak, NijiVoice, MiniMax
- **Automatic URL Configuration**: Default URLs set based on library constants
- **Smart API Key Handling**: Required/optional validation per engine
- **Real-time Status Updates**: Visual feedback during synthesis
- **Error Handling**: Clear error messages and validation

## Getting Started

### Prerequisites

1. **Build the voice package:**
   ```bash
   cd ../
   npm install
   npm run build
   ```

2. **For local engines:**
   - **VOICEVOX**: Download from [voicevox.hiroshiba.jp](https://voicevox.hiroshiba.jp/)
   - **AIVIS Speech**: Set up local AIVIS Speech server (port 10101)
   - **VoicePeak**: Set up local VoicePeak server (port 20202)

3. **API Keys:**
   - **OpenAI**: Get from [platform.openai.com](https://platform.openai.com/)
   - **NijiVoice**: Get from NijiVoice service
   - **MiniMax**: Register at MiniMax platform (requires API key + Group ID)

## Key Concepts

### 1. Voice Service Creation
```typescript
import { VoiceEngineAdapter, type VoiceServiceOptions } from '@aituber-onair/voice';

const options: VoiceServiceOptions = {
    engineType: 'openai',
    apiKey: 'your-api-key',
    speaker: 'alloy'
};

const voiceService = new VoiceEngineAdapter(options);
```

### 2. Basic Speech
```typescript
await voiceService.speak({ text: 'Hello, world!' });
```

### 3. Engine-Specific Configuration
```typescript
// Local engines (no API key needed)
const voicevoxService = new VoiceEngineAdapter({
    engineType: 'voicevox',
    apiUrl: 'http://localhost:50021',
    speaker: 1
});

// Cloud engines (API key required)
const openaiService = new VoiceEngineAdapter({
    engineType: 'openai',
    apiKey: 'sk-...',
    speaker: 'alloy'
});

// MiniMax (special format: apiKey:groupId)
const minimaxService = new VoiceEngineAdapter({
    engineType: 'minimax',
    apiKey: 'your-api-key',
    minimaxGroupId: 'your-group-id',
    speaker: 'male-qn-qingse'
});
```

### 4. Dynamic Engine Switching
```typescript
// React state management for dynamic switching
const [engine, setEngine] = useState<EngineType>('openai');
const [voiceService, setVoiceService] = useState<VoiceEngineAdapter | null>(null);

// Update service when engine changes
useEffect(() => {
    const options = getEngineConfig(engine);
    setVoiceService(new VoiceEngineAdapter(options));
}, [engine]);
```

## Browser Compatibility

The voice package is designed for modern browsers with:
- ES Module support
- Web Audio API
- Async/await support
- Fetch API

Tested on:
- Chrome/Edge 90+
- Firefox 89+
- Safari 14+

## Troubleshooting

### Common Issues

1. **Import errors** - Make sure the voice package is built: `npm run build` from voice package root
2. **API errors** - Check your API keys and ensure local services are running
3. **CORS errors** - Not applicable with the React + Vite approach (that's the benefit!)

### Audio Playback

The React example handles audio playback automatically using the browser's built-in audio capabilities. No additional setup required.

## Next Steps

1. **Start with the React example** to understand the basic concepts
2. **Modify the example** to suit your needs
3. **Integrate into your project** using npm
4. **Build your own** voice-enabled applications

For production applications, consider:
- Environment variable management for API keys
- Error boundaries for robust error handling
- Loading states and user feedback
- Audio caching and optimization

## Support

For issues or questions:
- Check the [voice package README](../README.md)
- Review the [main project README](../../../README.md)
- Open an issue on GitHub