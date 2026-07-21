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
   - **Sakana AI**: Get from [console.sakana.ai](https://console.sakana.ai/)
   - **PLaMo**: Get from [plamo.preferredai.jp](https://plamo.preferredai.jp/)

## 📁 Example Structure

### [Node.js Examples](./node-basic/)
Simple JavaScript runtime examples demonstrating core functionality:

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

### [OpenAI Compatible Probe](./compat-probe/)
Validation probe for OpenAI-compatible Chat Completions endpoints:

- **T1** Non-stream short response
- **T2** Streaming completion (SSE)
- **T3** Conversation history reference
- **T4** Long input response
- **T5** Intentional 4xx error handling
- **T6** Timeout handling (simulated)

Use this probe to verify compatibility against local LLM servers without
adding provider-specific code.

### [Sakana AI Fugu Node.js Example](./sakana-basic/)
Minimal Node.js example for the first-class `sakana` provider:

- Uses OpenAI-compatible Chat Completions
- Defaults to `fugu`
- Supports `fugu`, `fugu-ultra`, and `fugu-ultra-20260615`
- Uses `responseLength: 'veryShort'` to keep the sample inexpensive
- Avoids browser CORS issues by running in Node.js

### [Local LLM CLI](./local-llm-cli/)
Minimal interactive CLI for local/self-hosted LLMs (Ollama/LM Studio/vLLM):

- Uses `openai-compatible` provider under the hood
- Supports streaming output
- Keeps simple conversation history
- Works with env vars or CLI flags

### [Agent SDK Providers](./agent-providers/)
JavaScript runtime examples for Agent SDK providers:

- Uses `@aituber-onair/chat/agent`
- Supports `codex-sdk`, `claude-agent-sdk`, and `copilot-sdk`
- Requires the corresponding SDK package and local SDK authentication
- Text chat only; browser/GAS/UMD environments are not supported

### [Codex Character Chat](./codex-character-chat/)
Lightweight experimental CLI for using Codex SDK as an AI character chat engine:

- Uses `@aituber-onair/chat/agent` with the `codex-sdk` provider
- Keeps a short conversation history in the terminal
- Supports a custom character name and system prompt
- Text-only proof of concept for agent-SDK-powered AI characters

### [AITuber Secretary Agent Example](./character-agent/)
TypeScript CLI example for an AI character secretary:

- Uses tool calling to save memos, todos, schedule suggestions, drafts, and memories
- Stores demo data in local JSON files
- Demonstrates safe assistant behavior without sending email, posting to social media, or registering calendar events
- Includes Vitest coverage for storage, tools, registry, memory search, safety policy, and the agent loop

### [Discord AI Character Bot](./discord-bot/)
Minimal Discord example that lets an AI character live in your server:

- Responds to direct messages and bot mentions by default
- Uses a Japanese AI character prompt by default
- Supports character name/profile customization through environment variables
- Keeps short per-channel conversation history

### [Slack AI Character Bot](./slack-bot/)
Minimal Slack Socket Mode example that lets an AI character live in your
workspace:

- Responds to app mentions and direct messages by default
- Uses a Japanese AI character prompt by default
- Supports character name/profile customization through environment variables
- Replies in Slack threads

### [Mock OpenAI-Compatible Server](./mock-openai-server/)
Minimal local server for CI and local validation:

- Implements `POST /v1/chat/completions`
- Supports both non-stream and SSE stream responses
- Provides `GET /health` for readiness checks

### [React Example](./react-basic/)
Interactive web application with TypeScript and Vite:

- ✅ **Provider Switching** - Switch between OpenAI, Claude, Gemini, OpenRouter, Z.ai, Kimi, DeepSeek, Mistral, browser-disabled Sakana AI, and PLaMo
- ✅ **Real-time Streaming** - See responses as they're generated
- ✅ **Chat History** - Full conversation management
- ✅ **Vision Support** - Upload and analyze images
- ✅ **Response Control** - Adjust response lengths
- ✅ **Error Handling** - Graceful error management

Sakana AI is shown as disabled in the React browser example because direct
browser requests may fail with CORS. Use the Node.js Sakana example or your own
backend proxy for web apps.

**Quick Start:**
```bash
cd react-basic
npm install
npm run dev
```

### [Customer Support Bot](./customer-support-bot/)
Embedded support-widget example with React, TypeScript, and Vite:

- Uses a curated package knowledge file in the system prompt (no RAG)
- Streams replies into a compact floating chat panel
- Switches between OpenAI, Claude, and Gemini models
- Persists provider, model, API key, and persona settings in localStorage
- Demonstrates a production-style widget shell with browser security guidance

**Quick Start:**
```bash
cd customer-support-bot
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
// Uses: gemini-3.1-flash-lite (stable, efficient)
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

The table below focuses on the primary providers used in the core JavaScript runtime examples.

| Feature | OpenAI | Claude | Gemini |
|---------|--------|--------|--------|
| Default Model | `gpt-4o-mini` | `claude-3-haiku-20240307` | `gemini-3.1-flash-lite` |
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
