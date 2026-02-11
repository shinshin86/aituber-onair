# Chat Package Examples

This directory contains examples demonstrating how to use the @aituber-onair/chat package with various AI providers and configurations.

## 🚀 Quick Start

### Prerequisites

1. **Build the chat package:**
   ```bash
   cd ../
   npm install
   npm run build
   ```

2. **Get API Keys:**
   - **OpenAI**: Get from [platform.openai.com](https://platform.openai.com/)
   - **Claude**: Get from [console.anthropic.com](https://console.anthropic.com/)
   - **Gemini**: Get from [makersuite.google.com](https://makersuite.google.com/app/apikey)
   - **OpenRouter**: Get from [openrouter.ai](https://openrouter.ai/)
   - **Z.ai**: Get from [platform.z.ai](https://platform.z.ai/)
   - **Kimi (Moonshot)**: Get from [platform.moonshot.cn](https://platform.moonshot.cn/)

## 📁 Example Structure

### [Node.js Examples](./node-basic/)
Simple Node.js examples demonstrating core functionality:

- **Basic Usage** (`index.js`) - Getting started with all providers
- **OpenAI Example** (`openai-example.js`) - GPT-4, o1 models, response formats
- **Claude Example** (`claude-example.js`) - Claude 3 models, advanced features
- **Gemini Example** (`gemini-example.js`) - Gemini Pro, safety settings
- **Vision Chat** (`vision-example.js`) - Image analysis with vision models
- **Tool Calling** (`tool-calling-example.js`) - Function calling demonstration
- **Streaming** (`streaming-example.js`) - Real-time streaming responses

**Quick Start:**
```bash
cd node-basic
npm install  # Install any required dependencies
node index.js
```

### [React Example](./react-basic/)
Interactive web application with TypeScript and Vite:

- ✅ **Provider Switching** - Switch between OpenAI, Claude, Gemini, OpenRouter, Z.ai, and Kimi
- ✅ **Real-time Streaming** - See responses as they're generated
- ✅ **Chat History** - Full conversation management
- ✅ **Vision Support** - Upload and analyze images
- ✅ **Response Control** - Adjust response lengths
- ✅ **Error Handling** - Graceful error management

**Quick Start:**
```bash
cd react-basic
npm install
npm run dev
```

## 🔑 API Key Management

### Environment Variables (Recommended for Production)

Create a `.env` file in your project:
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### Direct Configuration (Examples Only)
```typescript
const service = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-api-key' // Never commit API keys!
});
```

## 🌟 Key Features

### 1. Default Models
All examples use optimal default models for cost and performance:
```typescript
// No model specified - uses defaults automatically
const openaiService = ChatServiceFactory.createChatService('openai', { apiKey });
// Uses: gpt-4o-mini (fast, cost-effective)

const claudeService = ChatServiceFactory.createChatService('claude', { apiKey });
// Uses: claude-3-haiku-20240307 (balanced speed/cost)

const geminiService = ChatServiceFactory.createChatService('gemini', { apiKey });
// Uses: gemini-2.0-flash-lite (latest, efficient)
```

### 2. Multi-Provider Support
```typescript
// Same interface for all providers
const openaiService = ChatServiceFactory.createChatService('openai', options);
const claudeService = ChatServiceFactory.createChatService('claude', options);
const geminiService = ChatServiceFactory.createChatService('gemini', options);
const openRouterService = ChatServiceFactory.createChatService(
  'openrouter',
  options,
);
const zaiService = ChatServiceFactory.createChatService('zai', options);
const kimiService = ChatServiceFactory.createChatService('kimi', options);
```

### 3. Streaming Responses
```typescript
await chatService.processChat(
  messages,
  (partial) => console.log('Streaming:', partial),
  async (complete) => console.log('Complete:', complete)
);
```

### 4. Vision Capabilities
```typescript
const visionMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }
  ]
};
```

### 5. Tool/Function Calling
```typescript
const tools = [{
  name: 'get_weather',
  description: 'Get weather information',
  parameters: { /* ... */ }
}];
```

### 6. Response Length Control
```typescript
// Using presets
{ responseLength: 'short' } // veryShort, short, medium, long, veryLong, deep

// Using token limits
{ maxTokens: 500 }
```

## 📊 Provider Comparison

The table below focuses on the primary providers used in the core Node.js examples.

| Feature | OpenAI | Claude | Gemini |
|---------|--------|--------|--------|
| Default Model | `gpt-4o-mini` | `claude-3-haiku-20240307` | `gemini-2.0-flash-lite` |
| Text Chat | ✅ GPT-4, GPT-3.5 | ✅ Claude 3 Family | ✅ Gemini Pro |
| Vision | ✅ GPT-4 Vision | ✅ Claude 3 Vision | ✅ Gemini Pro Vision |
| Streaming | ✅ Full Support | ✅ Full Support | ✅ Full Support |
| Tools | ✅ Function Calling | ✅ Tool Use | ✅ Function Calling |
| MCP | ✅ Supported | ✅ Supported | ❌ Not Supported |

## 🛠️ Common Use Cases

### 1. Chatbot Development
Build AI-powered chatbots with streaming responses and context management.

### 2. Content Generation
Generate articles, stories, or creative content with controlled lengths.

### 3. Image Analysis
Analyze images for content moderation, description, or data extraction.

### 4. Tool Integration
Connect AI to external tools and APIs for enhanced functionality.

### 5. Multi-Modal Applications
Combine text and vision for rich interactive experiences.

## 🐛 Troubleshooting

### Import Errors
- Ensure the chat package is built: `npm run build` in the package root
- Check that node_modules is properly installed

### API Errors
- Verify API keys are correct and have proper permissions
- Check rate limits and quotas for your API plan
- Ensure models are available in your region

### TypeScript Errors
- Make sure TypeScript is installed: `npm install -D typescript`
- Check tsconfig.json for proper module resolution

### Network Issues
- Some providers may require proxy configuration
- Check firewall settings for API endpoints

## 📚 Next Steps

1. **Start Simple**: Run the basic Node.js example to understand core concepts
2. **Try React**: Experience the interactive UI with real-time features
3. **Experiment**: Modify examples to fit your use case
4. **Build**: Create your own applications using these examples as templates

## 📖 Additional Resources

- [Chat Package Documentation](../README.md)
- [Main Project README](../../../README.md)
- [API Provider Documentation](#):
  - [OpenAI API Docs](https://platform.openai.com/docs)
  - [Claude API Docs](https://docs.anthropic.com)
  - [Gemini API Docs](https://ai.google.dev)

## 🤝 Contributing

Found an issue or have a suggestion? Please open an issue on GitHub!
