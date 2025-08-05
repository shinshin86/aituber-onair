# @aituber-onair/chat

![@aituber-onair/chat logo](./images/aituber-onair-chat.png)

Chat and LLM API integration library for AITuber OnAir. This package provides a unified interface for interacting with various AI chat providers including OpenAI, Claude, and Gemini.

## Features

- 🤖 **Multiple AI Provider Support**: OpenAI, Claude (Anthropic), and Google Gemini
- 🔄 **Unified Interface**: Consistent API across different providers
- 🛠️ **Tool/Function Calling**: Support for AI function calling with automatic iteration
- 💬 **Streaming Responses**: Real-time streaming chat responses
- 🖼️ **Vision Support**: Process images with vision-enabled models
- 📝 **Emotion Detection**: Extract emotions from AI responses
- 🎯 **Response Length Control**: Configure response lengths with presets or custom token limits
- 🔌 **Model Context Protocol (MCP)**: Support for MCP servers (all providers)

## Installation

```bash
npm install @aituber-onair/chat
```

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
  model: 'gpt-4-turbo-preview',
  endpoint: 'chat/completions' // or 'responses' for o1 series models
});
```

#### Claude (Anthropic)

```typescript
const claudeService = ChatServiceFactory.createChatService('claude', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-opus-20240229'
});
```

#### Google Gemini

```typescript
const geminiService = ChatServiceFactory.createChatService('gemini', {
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'gemini-pro'
});
```

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
  responseLength: 'medium' // 'veryShort', 'short', 'medium', 'long', 'veryLong'
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

type ChatResponseLength = 'veryShort' | 'short' | 'medium' | 'long' | 'veryLong';
```

## Available Providers

### OpenAI
- Models: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, o1 series
- Vision: GPT-4 Vision
- Tools: Function calling support
- MCP: Supported

### Claude (Anthropic)
- Models: Claude 3 (Opus, Sonnet, Haiku), Claude 2
- Vision: Claude 3 models
- Tools: Tool use support
- MCP: Supported

### Gemini (Google)
- Models: Gemini Pro, Gemini Pro Vision
- Vision: Gemini Pro Vision
- Tools: Function calling support
- MCP: Supported (via function calling integration)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.