# @aituber-onair/chat

![@aituber-onair/chat logo](https://github.com/shinshin86/aituber-onair/raw/main/packages/chat/images/aituber-onair-chat.png)

Chat and LLM API integration library for AITuber OnAir. This package provides a unified interface for interacting with various AI chat providers including OpenAI, Claude, Gemini, OpenRouter, Z.ai, and Kimi.

## Features

- 🤖 **Multiple AI Provider Support**: OpenAI, Claude (Anthropic), Google Gemini, OpenRouter, Z.ai, and Kimi
- 🔄 **Unified Interface**: Consistent API across different providers
- 🛠️ **Tool/Function Calling**: Support for AI function calling with automatic iteration
- 💬 **Streaming Responses**: Real-time streaming chat responses
- 🖼️ **Vision Support**: Process images with vision-enabled models
- 📝 **Emotion Detection**: Extract emotions from AI responses
- 🎯 **Response Length Control**: Configure response lengths with presets or custom token limits
- 🔌 **Model Context Protocol (MCP)**: Support for MCP servers

## Installation

```bash
npm install @aituber-onair/chat
```

## UMD Build (Browser/GAS)

This package ships ESM/CJS by default. For environments without bundlers (browsers via script tag, Google Apps Script), a UMD/IIFE bundle is available.

- Global name: `AITuberOnAirChat`
- Files: `dist/umd/aituber-onair-chat.js`, `dist/umd/aituber-onair-chat.min.js`

Build UMD locally (in the monorepo):

```bash
# Install deps at repo root
npm ci

# Build for chat only
npm -w @aituber-onair/chat run build
```

### Browser via UMD

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="/dist/umd/aituber-onair-chat.min.js"></script>
  </head>
  <body>
    <script>
      const chat = AITuberOnAirChat.ChatServiceFactory.createChatService('openai', {
        apiKey: 'your-api-key'
      });
      // Streaming is available in browsers
    </script>
  </body>
  </html>
```

### Google Apps Script (GAS)

GAS does not support streaming or the Fetch API natively. Use the provided adapter and the non‑streaming helper.

Steps:
- Build UMD and copy `dist/umd/aituber-onair-chat.min.js` into your GAS project as a script file (e.g., `lib.gs`). With clasp, place it under the project folder and push.
- Create another file (e.g., `main.js`) and use the following snippet:

```javascript
async function testChat() {
  // Install fetch backed by UrlFetchApp
  AITuberOnAirChat.installGASFetch();

  const chat = AITuberOnAirChat.ChatServiceFactory.createChatService('openai', {
    apiKey: PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY')
  });

  const text = await AITuberOnAirChat.runOnceText(chat, [
    { role: 'user', content: 'Hello!' }
  ]);

  Logger.log(text);
}
```

Notes:
- GAS runtime: V8. No streaming; prefer `chatOnce(..., false)` or `runOnceText`.
- Set your API key in Script Properties: `OPENAI_API_KEY`.
- See `packages/chat/examples/gas-basic` for a working example. The Apps Script manifest (`appsscript.json`) is optional; modern projects default to V8. Add one only if you need custom settings (e.g., time zone).

## Usage

### Basic Chat

```typescript
import { ChatServiceFactory, ChatServiceOptions } from '@aituber-onair/chat';

// Create a chat service
const options: ChatServiceOptions = {
  apiKey: 'your-api-key',
  model: 'gpt-4' // optional, uses provider default if not specified
};

const chatService = ChatServiceFactory.createChatService('openai', options);

// Process a simple chat
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello! How are you?' }
];

await chatService.processChat(
  messages,
  (partialText) => {
    // Handle streaming response
    console.log('Partial:', partialText);
  },
  async (completeText) => {
    // Handle complete response
    console.log('Complete:', completeText);
  }
);
```

### Provider-Specific Usage

#### OpenAI

```typescript
const openaiService = ChatServiceFactory.createChatService('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5.1',
  endpoint: 'responses', // Recommended for GPT-5.1 or when MCP/tools are enabled
  reasoning_effort: 'none', // Skip structured reasoning for fastest replies
  verbosity: 'medium'
});
```

`reasoning_effort` options differ per model: GPT-5 (5.0) accepts `'minimal' | 'low' | 'medium' | 'high'`, while GPT-5.1 replaces `'minimal'` with `'none'` so the valid values are `'none' | 'low' | 'medium' | 'high'`. Use `'none'` (GPT-5.1's default) when you want the quickest response without structured reasoning, and raise the effort level for deeper analysis.

**Meet the GPT-5 family**

- `gpt-5.1` – Complex reasoning, broad world knowledge, and code-heavy or multi-step agentic workflows.
- `gpt-5` – Previous flagship, still available for backward compatibility but superseded by GPT-5.1.
- `gpt-5-mini` – Cost-optimized reasoning/chat model that balances speed, cost, and capability.
- `gpt-5-nano` – High-throughput option best suited for simple instruction-following or classification runs.

#### Claude (Anthropic)

```typescript
const claudeService = ChatServiceFactory.createChatService('claude', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-opus-4-6'
});
```

#### Google Gemini

```typescript
const geminiService = ChatServiceFactory.createChatService('gemini', {
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'gemini-pro'
});
```

#### OpenRouter

```typescript
const openRouterService = ChatServiceFactory.createChatService('openrouter', {
  apiKey: process.env.OPENROUTER_API_KEY,
  model: 'openai/gpt-oss-20b:free', // Free tier model
  // Optional: Add app information for analytics
  appName: 'Your App Name',
  appUrl: 'https://your-app-url.com'
});
```

**Important Notes for OpenRouter:**
- Token limits are automatically disabled for the `gpt-oss-20b:free` model due to technical limitations
- To control response length, include instructions in your prompt (e.g., "Please respond in 40 characters or less")
- Free tier has rate limits (20 requests/minute)
- Supported models (curated list):
  - `openai/gpt-oss-20b:free`
  - `openai/gpt-5.1-chat`, `openai/gpt-5.1-codex`, `openai/gpt-5-mini`, `openai/gpt-5-nano`
  - `openai/gpt-4o`, `openai/gpt-4.1-mini`, `openai/gpt-4.1-nano`
  - `anthropic/claude-opus-4`, `anthropic/claude-sonnet-4`
  - `anthropic/claude-3.7-sonnet`, `anthropic/claude-3.5-sonnet`, `anthropic/claude-haiku-4.5`
  - `google/gemini-2.5-pro`, `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite-preview-09-2025`
  - `z-ai/glm-4.7-flash`, `z-ai/glm-4.5-air`, `z-ai/glm-4.5-air:free`
  - `moonshotai/kimi-k2.5`

#### Z.ai (GLM)

```typescript
const zaiService = ChatServiceFactory.createChatService('zai', {
  apiKey: process.env.ZAI_API_KEY,
  model: 'glm-5',
  visionModel: 'glm-4.6V-Flash', // Optional: vision-capable model
  responseFormat: { type: 'json_object' } // Optional JSON mode
});
```

Notes:
- Z.ai uses OpenAI-compatible Chat Completions.
- Supported text models: `glm-5`, `glm-4.7`, `glm-4.7-FlashX`, `glm-4.7-Flash`, `glm-4.6`
- Supported vision models: `glm-4.6V`, `glm-4.6V-FlashX`, `glm-4.6V-Flash`
- `glm-5` is currently handled as text-only in this package.
- `thinking` is disabled by default to match fast response behavior.

#### Kimi (Moonshot)

```typescript
const kimiService = ChatServiceFactory.createChatService('kimi', {
  apiKey: process.env.MOONSHOT_API_KEY,
  model: 'kimi-k2.5',
  // Optional: override endpoint or baseUrl
  // endpoint: 'https://api.moonshot.ai/v1/chat/completions',
  // baseUrl: 'https://api.moonshot.ai/v1',
  thinking: { type: 'enabled' }
});
```

Notes:
- Kimi uses OpenAI-compatible Chat Completions.
- When tools are enabled, `thinking` is forced to `{ type: 'disabled' }`.

Self-hosted example:

```typescript
const kimiService = ChatServiceFactory.createChatService('kimi', {
  apiKey: process.env.MOONSHOT_API_KEY,
  baseUrl: 'http://localhost:8000/v1',
  thinking: { type: 'disabled' }
});
```

Notes for self-hosted:
- Self-hosted endpoints use `chat_template_kwargs` for thinking controls.

### Vision Chat

```typescript
const visionMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'What do you see in this image?' },
    {
      type: 'image_url',
      image_url: {
        url: 'data:image/jpeg;base64,...', // or https:// URL
        detail: 'low' // 'low', 'high', or 'auto'
      }
    }
  ]
};

await chatService.processVisionChat(
  [visionMessage],
  (partial) => console.log(partial),
  async (complete) => console.log(complete)
);
```

### Tool/Function Calling

```typescript
import { ToolDefinition } from '@aituber-onair/chat';

const tools: ToolDefinition[] = [{
  name: 'get_weather',
  description: 'Get the current weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' }
    },
    required: ['location']
  }
}];

// Tool calling is handled automatically by the chat service
// Configure tool handlers when creating the service
```

### Response Length Control

```typescript
// Using preset response lengths
const service = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  responseLength: 'medium' // 'veryShort', 'short', 'medium', 'long', 'veryLong', 'deep'
});

// Using custom token limits
const service = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  maxTokens: 500 // Direct token limit
});
```

### Model Context Protocol (MCP)

The chat package supports MCP (Model Context Protocol) servers across all providers, with different implementation approaches:

#### Provider-Specific MCP Implementation

**OpenAI & Claude**: Direct MCP Integration
- Uses provider's native MCP support (Responses API for OpenAI)
- Server-to-server communication (no CORS issues)
- Direct connection to MCP servers

**Gemini**: Function Calling Integration
- MCP tools are registered as Gemini function declarations
- ToolExecutor handles MCP server communication
- Requires CORS configuration in browser environments

#### Basic Usage

```typescript
// MCP servers work with all providers (OpenAI, Claude, Gemini)
const mcpServers = [{
  type: 'url',
  url: 'http://localhost:3000',
  name: 'local-server',
  authorization_token: 'optional-token'
}];

// OpenAI/Claude - direct MCP integration
const openaiService = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  mcpServers // Direct integration via Responses API
});

// Gemini - MCP via function calling
const geminiService = ChatServiceFactory.createChatService('gemini', {
  apiKey: 'your-key',
  mcpServers // Integrated as function declarations
});

// MCP tools are automatically available and handled by ToolExecutor
```

#### Gemini-Specific CORS Configuration

When using Gemini with MCP in browser environments, you need to configure a proxy to avoid CORS issues:

**Vite Development Setup** (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api/mcp': {
        target: 'https://mcp.deepwiki.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mcp/, ''),
      }
    }
  }
})
```

**Dynamic MCP URL Configuration**:
```typescript
// Provider-specific MCP server configuration
const getMcpServers = (provider: string): MCPServerConfig[] => {
  const baseUrl = provider === 'gemini' 
    ? '/api/mcp/sse'  // Proxy URL for Gemini (browser)
    : 'https://mcp.deepwiki.com/sse';  // Direct URL for OpenAI/Claude

  return [{
    type: 'url',
    url: baseUrl,
    name: 'deepwiki',
  }];
};

// Use in chat service creation
const mcpServers = getMcpServers(chatProvider);
const chatService = ChatServiceFactory.createChatService(chatProvider, {
  apiKey: 'your-api-key',
  mcpServers
});
```

#### Error Handling & Timeouts

The Gemini MCP implementation includes robust error handling:
- 5-second timeout for MCP schema fetching
- Automatic fallback to basic search tools if MCP servers are unavailable
- Graceful degradation when MCP initialization fails

### Emotion Detection

```typescript
import { textToScreenplay } from '@aituber-onair/chat';

const text = "[happy] I'm so glad to see you!";
const screenplay = textToScreenplay(text);
console.log(screenplay); // { emotion: 'happy', text: "I'm so glad to see you!" }
```

## API Reference

### ChatService Interface

```typescript
interface ChatService {
  getModel(): string;
  getVisionModel(): string;
  
  processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>
  ): Promise<void>;
  
  processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>
  ): Promise<void>;
  
  chatOnce(
    messages: Message[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number
  ): Promise<ToolChatCompletion>;
  
  visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number
  ): Promise<ToolChatCompletion>;
}
```

### Types

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: number;
}

interface MessageWithVision {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | VisionBlock[];
}

type ChatResponseLength = 'veryShort' | 'short' | 'medium' | 'long' | 'veryLong' | 'deep';
```

## Available Providers

Currently, the following AI providers are built-in:

- **OpenAI**: Supports models like GPT-5.1, GPT-5 (Nano/Mini/Standard), GPT-4.1 (including mini and nano), GPT-4, GPT-4o-mini, O3-mini, o1, o1-mini
- **Gemini**: Supports models like Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash Lite Preview, Gemini 2.0 Flash, Gemini 2.0 Flash-Lite
- **Claude**: Supports models like Claude Opus 4.6, Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5, Claude 4 Sonnet, Claude 4 Opus, Claude 3.7 Sonnet, Claude 3.5 Haiku/Sonnet, Claude 3 Haiku
- **OpenRouter**: Supports a curated OpenRouter model list (OpenAI/Claude/Gemini/Z.ai/Kimi). See the OpenRouter section for model IDs.
- **Z.ai**: Supports GLM-5 (text), GLM-4.7/4.6 (text), and GLM-4.6V family (vision)
- **Kimi**: Supports Kimi K2.5 (`kimi-k2.5`) with vision support

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
