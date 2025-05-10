# AITuber OnAir Core

![AITuber OnAir Core - logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/refs/heads/main/packages/core/images/aituber-onair-core.png)

[AITuber OnAir Core](https://www.npmjs.com/package/@aituber-onair/core) is a TypeScript library developed to provide functionality for the [AITuber OnAir](https://aituberonair.com) web service, designed for AI-based virtual streaming (AITuber).  

[日本語版はこちら](https://github.com/shinshin86/aituber-onair/blob/main/packages/core/README_ja.md)

While it is primarily intended to provide functionality for [AITuber OnAir](https://aituberonair.com), this project is published as open-source software and is available as an [npm package](https://www.npmjs.com/package/@aituber-onair/core) under the MIT License.

It specializes in generating response text and audio from text or image inputs, and is designed to easily integrate with other parts of an application (storage, YouTube integration, avatar control, etc.).

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Main Features](#main-features)
- [Basic Usage](#basic-usage)
- [Tool System](#tool-system)
- [Function Calling Differences](#function-calling-differences)
- [Architecture](#architecture)
- [Main Components](#main-components)
- [Event System](#event-system)
- [Supported Speech Engines](#supported-speech-engines)
- [AI Provider System](#ai-provider-system)
- [Memory & Persistence](#memory--persistence)
- [Examples](#examples)
- [Integration with Existing Applications](#integration-with-existing-applications)
- [Testing & Development](#testing--development)

## Overview

**AITuberOnAirCore** is the central module that provides core features for AI tubers. It forms the core of the AITuber OnAir application. It encapsulates complex AI response generation, conversation context management, speech synthesis, and more, making these features available through a simple API.

## Installation

You can install AITuber OnAir Core using npm:

```bash
npm install @aituber-onair/core
```

Or using yarn:

```bash
yarn add @aituber-onair/core
```

Or using pnpm:

```bash
pnpm install @aituber-onair/core
```

## Main Features

- **AI Response Generation from Text Input**  
  Generates natural responses to user text input using OpenAI GPT models.
- **AI Response Generation from Images (Vision)**  
  Generates AI responses based on recognized content from images (e.g., live broadcast screens).
- **Conversation Context Management & Memory**  
  Maintains long-running conversation context via short-, mid-, and long-term memory systems.
- **Text-to-Speech Conversion**  
  Compatible with multiple speech engines (VOICEVOX, VoicePeak, NijiVoice, AivisSpeech, OpenAI TTS).
- **Emotion Extraction & Processing**  
  Extracts emotion from AI responses and utilizes it for speech synthesis or avatar expressions.
- **Event-Driven Architecture**  
  Emits events at each stage of processing to simplify external integrations.
- **Customizable Prompts**  
  Allows customization of prompts for vision processing and conversation summarization.
- **Pluggable Persistence**  
  Memory features can be persisted via LocalStorage, IndexedDB, or other customizable methods.
- **Function Calling with Tools Support**  
  Enables AI to use tools for performing actions beyond text generation, such as calculations, API calls, or data retrieval.

## Basic Usage

Below is a simplified example of how to use **AITuber OnAir Core**:

```typescript
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  AITuberOnAirCoreOptions
} from '@aituber-onair/core';

// 1. Define options
const options: AITuberOnAirCoreOptions = {
  chatProvider: 'openai', // Optional. If omitted, the default OpenAI will be used.
  apiKey: 'YOUR_API_KEY',
  chatOptions: {
    systemPrompt: 'You are an AI streamer. Act as a cheerful and friendly live broadcaster.',
    visionSystemPrompt: 'Please comment like a streamer on what is shown on screen.',
    visionPrompt: 'Look at the broadcast screen and provide commentary suited to the situation.',
    memoryNote: 'This is a summary of past conversations. Please refer to it appropriately to continue the conversation.',
  },
  // OpenAI Default model is gpt-4o-mini
  // You can specify different models for text chat and vision processing
  // model: 'o3-mini',        // Lightweight model for text chat (no vision support)
  // visionModel: 'gpt-4o',   // Model capable of image processing
  memoryOptions: {
    enableSummarization: true,
    shortTermDuration: 60 * 1000, // 1 minute
    midTermDuration: 4 * 60 * 1000, // 4 minutes
    longTermDuration: 9 * 60 * 1000, // 9 minutes
    maxMessagesBeforeSummarization: 20,
    maxSummaryLength: 256,
    // You can specify a custom summarization prompt
    summaryPromptTemplate: 'Please summarize the following conversation in under {maxLength} characters. Include important points.'
  },
  voiceOptions: {
    engineType: 'voicevox', // Speech engine type
    speaker: '1',           // Speaker ID
    apiKey: 'ENGINE_SPECIFIC_API_KEY', // If required (e.g., NijiVoice)
    onComplete: () => console.log('Voice playback completed'),
    // Custom API endpoint URLs (optional)
    voicevoxApiUrl: 'http://custom-voicevox-server:50021',
    voicepeakApiUrl: 'http://custom-voicepeak-server:20202',
    aivisSpeechApiUrl: 'http://custom-aivis-server:10101',
  },
  debug: true, // Enable debug output
};

// 2. Create an instance
const aituber = new AITuberOnAirCore(options);

// 3. Set up event listeners
aituber.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
  console.log('Processing started');
});

aituber.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (text) => {
  // Receive streaming responses and display in UI
  console.log(`Partial response: ${text}`);
});

aituber.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, (data) => {
  const { message, screenplay, rawText } = data;
  console.log(`Complete response: ${message.content}`);
  console.log(`Original text with emotion tags: ${rawText}`);
  if (screenplay.emotion) {
    console.log(`Emotion: ${screenplay.emotion}`);
  }
});

aituber.on(AITuberOnAirCoreEvent.SPEECH_START, (data) => {
  // The SPEECH_START event includes the screenplay object and rawText
  if (data && data.screenplay) {
    console.log(`Speech playback started: emotion = ${data.screenplay.emotion || 'neutral'}`);
    console.log(`Original text with emotion tags: ${data.rawText}`);
  } else {
    console.log('Speech playback started');
  }
});

aituber.on(AITuberOnAirCoreEvent.SPEECH_END, () => {
  console.log('Speech playback finished');
});

aituber.on(AITuberOnAirCoreEvent.TOOL_USE, (toolBlock) => 
  console.log(`Tool use -> ${toolBlock.name}`, toolBlock.input));

aituber.on(AITuberOnAirCoreEvent.TOOL_RESULT, (resultBlock) => 
  console.log(`Tool result ->`, resultBlock.content));

aituber.on(AITuberOnAirCoreEvent.ERROR, (error) => {
  console.error('Error occurred:', error);
});

// 4. Process text input
await aituber.processChat('Hello, how is the weather today?');

// 5. Clear event listeners if needed
aituber.offAll();
```

## Tool System

AITuber OnAir Core includes a powerful tool system that allows AI to perform actions beyond text generation, such as retrieving data or making calculations. This is particularly useful for creating interactive AITuber experiences.

### Tool Definition Structure

Tools are defined using the `ToolDefinition` interface, which conforms to the function calling specification used by LLM providers:

```typescript
type ToolDefinition = {
  name: string;                 // The name of the tool
  description?: string;         // Optional description of what the tool does
  parameters: {
    type: 'object';             // Must be 'object' (strictly typed)
    properties?: Record<string, {
      type?: string;            // Parameter type (e.g. 'string', 'integer')
      description?: string;     // Parameter description
      enum?: any[];             // For enumerated values
      items?: any;              // For array types
      required?: string[];      // Required nested properties
      [key: string]: any;       // Other JSON Schema properties
    }>;
    required?: string[];        // Names of required parameters
    [key: string]: any;         // Other JSON Schema properties
  };
  config?: { timeoutMs?: number }; // Optional configuration
};
```

Note that the `parameters.type` property is strictly typed as `'object'` to conform to function calling standards used by LLM providers.

### Registering and Using Tools

Tools are registered when initializing AITuberOnAirCore:

```typescript
// Define a tool
const randomIntTool: ToolDefinition = {
  name: 'randomInt',
  description: 'Return a random integer from 0 to (max - 1)',
  parameters: {
    type: 'object',  // This must be 'object'
    properties: {
      max: {
        type: 'integer',
        description: 'Upper bound (exclusive). Defaults to 100.',
        minimum: 1,
      },
    },
  },
};

// Create a handler for the tool
async function randomIntHandler({ max = 100 }: { max?: number }) {
  return Math.floor(Math.random() * max).toString();
}

// Register the tool with AITuberOnAirCore
const aituber = new AITuberOnAirCore({
  // ... other options ...
  tools: [{ definition: randomIntTool, handler: randomIntHandler }],
});

// Set up event listeners for tool use
aituber.on(AITuberOnAirCoreEvent.TOOL_USE, (toolBlock) => 
  console.log(`Tool use -> ${toolBlock.name}`, toolBlock.input));

aituber.on(AITuberOnAirCoreEvent.TOOL_RESULT, (resultBlock) => 
  console.log(`Tool result ->`, resultBlock.content));
```

### Tool Iteration Control

You can limit the number of tool call iterations using the `maxHops` option:

```typescript
const aituber = new AITuberOnAirCore({
  // ... other options ...
  chatOptions: {
    systemPrompt: 'Your system prompt',
    // ... other chat options ...
    maxHops: 10,  // Maximum number of tool call iterations (default: 6)
  },
  tools: [/* your tools */],
});
```

### Function Calling Differences

AITuber OnAir Core supports three major AI providers: OpenAI, Claude, and Gemini. Each provider has a different implementation of function calling (tool invocation). These differences are abstracted by AITuber OnAir Core, allowing developers to use a unified interface, but understanding the background is important.

> Note: This explanation covers the API versions as of May 2025. APIs are frequently updated, so please refer to the official documentation for the latest information.

#### OpenAI Function Calling Implementation

OpenAI's function calling has the following characteristics:

- **Tool Definition Format**: Uses an array of `functions` (deprecated) or `tools` (recommended from 2023-12-01) based on JSON Schema
- **Response Format**: Returns a response object containing a `tool_calls` array when using tools
- **Tool Result Submission**: Tool results are sent as messages with `role: 'tool'`
- **Multiple Tool Support**: Can call multiple tools simultaneously (Parallel function calling)

```typescript
// OpenAI tool definition example (minimal form)
const tools = [
  {
    type: "function", 
    function: {
      name: "randomInt",
      description: "Return a random integer from 0 to (max - 1)",
      parameters: {
        type: "object",
        properties: {
          max: {
            type: "integer",
            description: "Upper bound (exclusive). Defaults to 100."
          }
        },
        required: [] // Explicitly specifying even when empty improves schema validity
      }
    }
  }
];

// OpenAI tool call response example
{
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "call_abc123",
      type: "function",
      function: {
        name: "randomInt",
        arguments: "{\"max\":10}" // Note that this is returned as a stringified JSON
      }
    }
  ]
}

// Multiple tool calls example (Parallel function calling)
{
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "call_abc123",
      type: "function",
      function: {
        name: "randomInt",
        arguments: "{\"max\":10}"
      }
    },
    {
      id: "call_def456",
      type: "function",
      function: {
        name: "getCurrentTime",
        arguments: "{\"timezone\":\"JST\"}"
      }
    }
  ]
}

// OpenAI tool result submission example
{
  role: "tool",
  tool_call_id: "call_abc123",
  content: "7"
}
```

When handling OpenAI's function calling, AITuber OnAir Core converts tool definitions to OpenAI's format and processes tool calls and results. The `transformToolToFunction` method in the class performs this conversion.

#### Claude's Tool Calling Implementation

Claude's tool calling has the following characteristics:

- **Tool Definition Format**: Specifies `name`, `description`, and `input_schema` for each tool in the `tools` array
- **Response Format**: Returned as a special block with `type: 'tool_use'` and stops with `stop_reason: 'tool_use'`
- **Tool Result Submission**: Included in user role messages as `type: 'tool_result'`
- **Special Streaming Handling**: Requires special logic to handle tool calls in streaming responses

```typescript
// Claude tool definition example
const tools = [
  {
    name: "randomInt",
    description: "Return a random integer from 0 to (max - 1)",
    input_schema: {
      type: "object",
      properties: {
        max: {
          type: "integer",
          description: "Upper bound (exclusive). Defaults to 100."
        }
      }
    }
  }
];

// Claude tool call response example
{
  id: "msg_abc123",
  model: "claude-3-haiku-20240307",
  role: "assistant",
  content: [
    { type: "text", text: "I'll generate a random number for you." },
    { 
      type: "tool_use", 
      id: "tu_abc123",
      name: "randomInt",
      input: { max: 10 }
    }
  ],
  stop_reason: "tool_use"
}

// Example with only tool use, no text content
{
  id: "msg_xyz789",
  model: "claude-3-haiku-20240307",
  role: "assistant",
  content: [
    { 
      type: "tool_use", 
      id: "tu_xyz789",
      name: "randomInt",
      input: { max: 100 }
    }
  ],
  stop_reason: "tool_use"
}

// Claude tool result submission example
{
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "tu_abc123",
      content: "7"
    }
  ]
}
```

When handling Claude's tool calls, AITuber OnAir Core processes Claude's unique format and abstracts the complex processing, especially during streaming responses. Special handling is included in the `runToolLoop` method.

#### Gemini's Tool Calling Implementation

Gemini's tool calling has the following characteristics:

- **Tool Definition Format**: Describes definitions in `functionDeclarations` within the `tools` array
- **Response Format**: Returned as content objects containing `functionCall` parts
- **Tool Result Submission**: Sent as `functionResponse` objects included in content parts
- **Compositional Calling**: Supports Compositional Function Calling

```typescript
// Gemini tool definition example
const tools = [
  {
    functionDeclarations: [
      {
        name: "randomInt",
        description: "Return a random integer from 0 to (max - 1)",
        parameters: {
          type: "object",
          properties: {
            max: {
              type: "integer",
              description: "Upper bound (exclusive). Defaults to 100."
            }
          }
        }
      }
    ]
  }
];

// Gemini tool call response example (note the deep structure)
{
  candidates: [
    {
      content: {
        parts: [
          {
            functionCall: {
              name: "randomInt",
              args: {
                max: 10
              }
            }
          }
        ]
      }
    }
  ]
}

// Compositional function calling example
{
  candidates: [
    {
      content: {
        parts: [
          {
            functionCall: {
              name: "randomInt",
              args: {
                max: 10
              }
            }
          },
          {
            functionCall: {
              name: "formatResult",
              args: {
                prefix: "Random number:",
                value: "<function_response:randomInt>"
              }
            }
          }
        ]
      }
    }
  ]
}

// Gemini tool result submission example
// Include functionResponse directly in content parts (SDK automatically sets the role)
{
  parts: [
    {
      functionResponse: {
        name: "randomInt",
        response: {
          value: "7"
        }
      }
    }
  ]
}

// When directly calling REST API, you might include role like this
{
  role: "function",
  parts: [
    {
      functionResponse: {
        name: "randomInt",
        response: {
          value: "7"
        }
      }
    }
  ]
}
```

When handling Gemini's tool calls, AITuber OnAir Core processes Gemini's complex response structure and tool result format. Special logic is needed to convert tool responses to the appropriate JSON format.

#### Streaming Implementation Differences

Each provider also has differences in how tool calls are processed during streaming responses:

1. **OpenAI**:
   - During streaming, delta updates are sent as `delta.tool_calls`
   - Requires accumulation to reconstruct complete tool call data

2. **Claude**:
   - SSE streaming uses special event types `content_block_delta` and `content_block_stop`
   - Sends `stop_reason: "tool_use"` when a tool call is completed
   - Requires a special parser to detect tool calls

3. **Gemini**:
   - During streaming, `functionCall` may be split across chunks
   - Requires buffering to reconstruct complete JSON structures

AITuber OnAir Core abstracts these streaming processing differences, allowing you to process tool calls and results with the same interface regardless of which provider you use.

### Key Differences and Abstraction Between Providers

AITuber OnAir Core abstracts the differences between these three providers and provides a unified interface:

1. **Input Format Differences**:
   - Each provider uses its own tool definition format
   - AITuber OnAir Core performs appropriate conversions internally and provides a common `ToolDefinition` interface

2. **Response Processing Differences**:
   - OpenAI uses `tool_calls` objects
   - Claude uses `tool_use` blocks
   - Gemini uses `functionCall` objects
   - AITuber OnAir Core processes each format and converts to unified `TOOL_USE` events

3. **Tool Result Submission Format Differences**:
   - Each provider accepts tool results in different formats
   - AITuber OnAir Core converts and sends in the appropriate format

4. **Streaming Processing Differences**:
   - Claude in particular requires special handling for tool calls during streaming
   - AITuber OnAir Core abstracts this and provides a consistent streaming experience across all providers

5. **Tool Call Iteration**:
   - The `runToolLoop` method is implemented according to each provider's characteristics, providing consistent tool iteration

Through these abstractions, developers can use tool functionality through AITuber OnAir Core's unified interface without worrying about the details of provider implementations. Even when switching providers, there's no need to change tool definition and processing code.

## Architecture

**AITuberOnAirCore** is designed with the following layered structure:

```
AITuberOnAirCore (Integration Layer)
    ├── ChatProcessor (Conversation handling)
    │     └── ChatService (AI Chat)
    ├── MemoryManager (Memory handling)
    │     └── Summarizer (Summarization)
    └── VoiceService (Speech processing)
          └── VoiceEngineAdapter (Speech Engine Interface)
                └── Various Speech Engines (VOICEVOX, NijiVoice, etc.)
```

### Directory Structure

The source code is organized around the following directory structure:

```
src/
  ├── constants/             # Constants and configuration
  │     ├── index.ts         # Exported constants
  │     └── prompts.ts       # Default prompts and templates
  ├── core/                  # Core components
  │     ├── AITuberOnAirCore.ts
  │     ├── ChatProcessor.ts
  │     └── MemoryManager.ts
  ├── services/              # Service implementations
  │     ├── chat/            # Chat services
  │     │    ├── ChatService.ts            # Base interface
  │     │    ├── ChatServiceFactory.ts     # Factory for providers
  │     │    └── providers/                # AI provider implementations
  │     │         ├── ChatServiceProvider.ts  # Provider interface
  │     │         ├── claude/              # Claude-specific
  │     │         │    ├── ClaudeChatService.ts
  │     │         │    ├── ClaudeChatServiceProvider.ts
  │     │         │    └── ClaudeSummarizer.ts
  │     │         ├── gemini/              # Gemini-specific
  │     │         │    ├── GeminiChatService.ts
  │     │         │    ├── GeminiChatServiceProvider.ts
  │     │         │    └── GeminiSummarizer.ts
  │     │         └── openai/              # OpenAI-specific
  │     │              ├── OpenAIChatService.ts
  │     │              ├── OpenAIChatServiceProvider.ts
  │     │              └── OpenAISummarizer.ts
  │     ├── voice/           # Voice services
  │     │    ├── VoiceService.ts
  │     │    ├── VoiceEngineAdapter.ts
  │     │    └── engines/    # Voice engine implementations
  │     └── youtube/         # YouTube API integration
  │          └── YouTubeDataApiService.ts  # YouTube Data API client
  ├── types/                 # TypeScript type definitions
  └── utils/                 # Utilities and helpers
       ├── screenplay.ts     # Text and emotion processing
       └── storage.ts        # Storage utilities
```

## Main Components

### AITuberOnAirCore

This is the overall integration class, responsible for initializing and coordinating other components. It extends `EventEmitter` and emits events at various processing stages. In most cases, you will interact primarily with this class to use its features.

**Main methods** include:

- `processChat(text)` – Process text input
- `processVisionChat(imageDataUrl, visionPrompt?)` – Process image input (optionally pass a custom prompt)
- `stopSpeech()` – Stop speech playback
- `getChatHistory()` – Retrieve chat history
- `setChatHistory(messages)` – Set chat history from external source (e.g., for replay or migration)
- `clearChatHistory()` – Clear chat history
- `updateVoiceService(options)` – Update speech settings
- `isMemoryEnabled()` – Check if memory functionality is enabled
- `offAll()` – Remove all event listeners

### ChatProcessor

The component that sends text input to an AI model (e.g., OpenAI GPT) and receives responses. It manages the conversation flow and supports streaming responses. It also handles emotion extraction from responses.

- `updateOptions(newOptions)` – Allows you to update settings at runtime

### MemoryManager

**MemoryManager is designed to prevent issues such as API token limits, increased costs, and slow responses that can occur when the chat log grows too large. When a certain time or message threshold is exceeded, older chat history is summarized and stored as short-, mid-, and long-term memory. This allows recent conversation to be sent as-is, while past context is provided as a summary, maintaining context for the AI while keeping API requests efficient.**

Handles conversational context. In long conversations, older messages are summarized and maintained as short-term (1 min), mid-term (4 min), and long-term (9 min) memory. This helps maintain consistency in AI responses.

- **Custom Settings**: 
  - `summaryPromptTemplate` can be customized for summarization (it uses a `{maxLength}` placeholder).

### VoiceService

Converts text to speech. It integrates with multiple external speech synthesis engines through the `VoiceEngineAdapter`.

#### speakTextWithOptions Method

The `AITuberOnAirCore` class provides a flexible `speakTextWithOptions` method for speech playback:

```typescript
// Example of speaking text with temporary settings
await aituberOnairCore.speakTextWithOptions('[happy] Hello, everyone watching!', {
  // Enable or disable avatar animation
  enableAnimation: true,
  
  // Temporarily override current speech settings
  temporaryVoiceOptions: {
    engineType: 'voicevox',
    speaker: '8',
    apiKey: 'YOUR_API_KEY'  // If required
  },
  
  // Specify the ID of the HTML audio element for playback
  audioElementId: 'custom-audio-player'
});
```

**Key Features**:

1. **Temporary Voice Settings**: Override current speech settings without permanently changing them.  
2. **Animation Control**: Control avatar animation with the `enableAnimation` option.  
3. **Flexible Audio Playback**: Play audio in a specified HTML audio element.  
4. **Automatic Emotion Extraction**: Extract emotion tags (e.g., `[happy]`) from text and provide them in the `SPEECH_START` event.

## Event System

**AITuberOnAirCore** emits the following events:

- `PROCESSING_START`: When processing begins  
- `PROCESSING_END`: When processing finishes  
- `ASSISTANT_PARTIAL`: Upon receiving partial responses from the assistant (streaming)  
- `ASSISTANT_RESPONSE`: Upon receiving a complete response (includes a screenplay object and rawText with emotion tags)  
- `SPEECH_START`: When speech playback starts (includes a screenplay object with emotion and rawText with emotion tags)  
- `SPEECH_END`: When speech playback ends  
- `TOOL_USE`: When the AI calls a tool (includes the name of the tool and its input parameters)  
- `TOOL_RESULT`: When a tool execution completes and returns a result  
- `ERROR`: When an error occurs  

### Safely Handling Event Data

In particular, when implementing a listener for the `SPEECH_START` event, it is recommended to check if data is present:

```typescript
// Safe handling of SPEECH events
aituber.on(AITuberOnAirCoreEvent.SPEECH_START, (data) => {
  if (!data) {
    console.log('No data available');
    return;
  }
  
  const screenplay = data.screenplay;
  if (!screenplay) {
    console.log('No screenplay object');
    return;
  }
  
  const emotion = screenplay.emotion || 'neutral';
  console.log(`Speech started: Emotion = ${emotion}`);
  
  // Get original text with emotion tags
  console.log(`Original text: ${data.rawText}`);
  
  // Update UI or avatar animation
  updateUIWithEmotion(emotion);
});
```

### Emotion Handling

In a React application, you might use `useRef` to store the latest emotion data for immediate access:

```typescript
// Example in a React component
const [currentEmotion, setCurrentEmotion] = useState('neutral');
const emotionRef = useRef({ emotion: 'neutral', text: '' });

useEffect(() => {
  if (aituberOnairCore) {
    aituberOnairCore.on(AITuberOnAirCoreEvent.SPEECH_START, (data) => {
      if (data?.screenplay?.emotion) {
        setCurrentEmotion(data.screenplay.emotion);
        emotionRef.current = data.screenplay;
      }
    });
  }
}, [aituberOnairCore]);

// Use the ref for animation callbacks
const handleAnimation = () => {
  const emotion = emotionRef.current.emotion || 'neutral';
  // Perform animation based on emotion
};
```

### ChatProcessor Events

The internal `ChatProcessor` emits additional events:

- `chatLogUpdated`: Fired when the chat log is updated (e.g., when new messages are added or history is cleared).

You can access this event by referencing the `ChatProcessor` instance directly:

```typescript
// Example: using the chatLogUpdated event in ChatProcessor
const aituber = new AITuberOnAirCore(options);
const chatProcessor = aituber['chatProcessor']; // Accessing internal component

chatProcessor.on('chatLogUpdated', (chatLog) => {
  console.log('Chat log updated:', chatLog);
  
  // Example: Update UI
  updateChatDisplay(chatLog);
  
  // Example: Sync with an external system
  syncChatToExternalSystem(chatLog);
});
```

Possible use cases for `chatLogUpdated` include:

1. **Real-Time Chat UI Updates**  
   Reflect new messages or cleared logs in the UI immediately.
2. **External System Integration**  
   Save chat logs to a database or send them to an analytics service.
3. **Debugging & Monitoring**  
   Monitor changes in the chat log during development.

## Supported Speech Engines

**AITuberOnAirCore** supports the following speech engines:

- **VOICEVOX**: High-quality Japanese speech synthesis engine.  
- **VoicePeak**: Speech synthesis engine with rich emotional expression.  
- **NijiVoice**: AI-based speech synthesis service (requires an API key).  
- **AivisSpeech**: Speech synthesis using AI technology.  
- **OpenAI TTS**: Text-to-speech API from OpenAI.

You can dynamically switch the speech engine via `updateVoiceService`:

```typescript
// Example of switching speech engines
aituber.updateVoiceService({
  engineType: 'nijivoice',
  speaker: 'some-speaker-id',
  apiKey: 'YOUR_NIJIVOICE_API_KEY'
});
```

### Custom API Endpoints

For locally hosted voice engines (VOICEVOX, VoicePeak, AivisSpeech), you can specify custom API endpoint URLs:

```typescript
// Example of setting custom API endpoints
aituber.updateVoiceService({
  engineType: 'voicevox',
  speaker: '1',
  // Custom endpoint for a self-hosted or alternative VOICEVOX server
  voicevoxApiUrl: 'http://custom-voicevox-server:50021'
});

// Example for VoicePeak
aituber.updateVoiceService({
  engineType: 'voicepeak',
  speaker: '2',
  voicepeakApiUrl: 'http://custom-voicepeak-server:20202'
});

// Example for AivisSpeech
aituber.updateVoiceService({
  engineType: 'aivisSpeech',
  speaker: '3',
  aivisSpeechApiUrl: 'http://custom-aivis-server:10101'
});
```

This is useful when running voice engines on different ports or remote servers.

## AI Provider System

AITuber OnAir Core adopts an extensible provider system, enabling integration with various AI APIs.
Currently, OpenAI API, Gemini API, and Claude API are available. If you would like to use any other API, please submit a PR or send us a message.

### Available Providers

Currently, the following AI provider is built-in:

- **OpenAI**: Supports models like GPT-4.1(including mini and nano), GPT-4, GPT-4o-mini, O3-mini, o1, o1-mini
- **Gemini**: Supports models like Gemini 2.0 Flash, Gemini 2.0 Flash-Lite, Gemini 1.5 Flash, Gemini 1.5 Pro, Gemini 2.5 Pro(Experimental)
- **Claude**: Supports models like Claude 3 Haiku, Claude 3.5 Haiku, Claude 3.5 Sonnet v2, Claude 3.7 Sonnet

### Specifying a Provider

You can specify the provider when instantiating `AITuberOnAirCore`:

```typescript
const aituberCore = new AITuberOnAirCore({
  chatProvider: 'openai',  // Provider name
  apiKey: 'your-api-key',
  model: 'gpt-4o-mini',    // Optional (if omitted, the default model 'gpt-4o-mini' will be used)
  // Other options...
});
```

### Model-Specific Feature Limitations

Different AI models support different features. For example:

- **GPT-4o**, **GPT-4o-mini**: Support both text chat and image processing (Vision)
- **O3-mini**: Supports text chat only (does not support image processing)

When selecting a model, be aware of these limitations. Attempting to use unsupported features will result in an explicit error.

**Note**: If you don't specify a model, the default model used is 'gpt-4o-mini'. This model supports both text chat and image processing.

### Using Different Models Together

If you want to use different models for text chat and image processing, you can use the `visionModel` option:

```typescript
const aituberCore = new AITuberOnAirCore({
  apiKey: 'your-api-key',
  chatProvider: 'openai',
  model: 'o3-mini',       // For text chat 
  visionModel: 'gpt-4o',  // For image processing
  // Other options...
});
```

This allows for optimizations such as using a lightweight model for text chat and a more powerful model only when image processing is needed.

Note: When specifying a visionModel, ensure it supports vision capabilities. The system will validate this during initialization and throw an error if an unsupported model is provided.

### Retrieving Providers & Models

You can programmatically retrieve available providers and their supported models:

```typescript
// Get all available providers
const providers = AITuberOnAirCore.getAvailableProviders();

// Get supported models for a specific provider
const models = AITuberOnAirCore.getSupportedModels('openai');
```

### Creating a Custom Provider

To add a new AI provider, implement the `ChatServiceProvider` interface in a custom class and register it with the `ChatServiceFactory`:

```typescript
import { ChatServiceFactory } from 'aituber-onair-core';
import { MyCustomProvider } from './MyCustomProvider';

// Register the custom provider
ChatServiceFactory.registerProvider(new MyCustomProvider());

// Use the registered provider
const aituberCore = new AITuberOnAirCore({
  chatProvider: 'myCustomProvider',
  apiKey: 'your-api-key',
  // Other options...
});
```

## Memory & Persistence

**AITuberOnAirCore** includes a memory feature that maintains the context of long-running conversations. The AI summarizes older messages, preserving short-, mid-, and long-term context for more coherent responses.

### Memory Types

There are three types of memory:

1. **Short-Term Memory**  
   - Generated **1 minute** after the conversation starts  
   - Holds recent conversation details

2. **Mid-Term Memory**  
   - Generated **4 minutes** after the conversation starts  
   - Holds slightly broader summaries of the conversation

3. **Long-Term Memory**  
   - Generated **9 minutes** after the conversation starts  
   - Holds key themes and important information from the overall conversation

These memory records are automatically included in the AI prompts, helping the AI respond consistently over time.

### Memory Persistence

AITuberOnAirCore has a pluggable design for memory persistence, so that the conversation context can be retained even if the application is restarted.

#### MemoryStorage Interface

Persistence is provided through the abstract `MemoryStorage` interface:

```typescript
interface MemoryStorage {
  load(): Promise<MemoryRecord[]>;
  save(records: MemoryRecord[]): Promise<void>;
  clear(): Promise<void>;
}
```

#### Default Implementations

1. **LocalStorageMemoryStorage**  
   - Uses the browser's LocalStorage  
   - Simple solution (subject to storage limits)

2. **IndexedDBMemoryStorage** (Planned)  
   - Uses the browser's IndexedDB  
   - Supports larger capacity and more complex data structures

#### Custom Storage Implementations

To create your own storage implementation, simply implement the `MemoryStorage` interface:

```typescript
class CustomMemoryStorage implements MemoryStorage {
  async load(): Promise<MemoryRecord[]> {
    // Load records from a custom storage
    return customStorage.getItems();
  }
  
  async save(records: MemoryRecord[]): Promise<void> {
    // Save records to a custom storage
    await customStorage.setItems(records);
  }
  
  async clear(): Promise<void> {
    // Clear records in a custom storage
    await customStorage.clear();
  }
}
```

### Configuring the Memory Feature

Enable the memory feature and set up persistence when initializing **AITuberOnAirCore**:

```typescript
import { AITuberOnAirCore } from './lib/aituber-onair-core';
import { createMemoryStorage } from './lib/aituber-onair-core/utils/storage';

// Create a memory storage (LocalStorage example)
const memoryStorage = createMemoryStorage('myapp.aiMemoryRecords');

// Initialize AITuberOnAirCore
const aiTuber = new AITuberOnAirCore({
  // Other options...
  
  // Memory options
  memoryOptions: {
    enableSummarization: true,
    shortTermDuration: 60 * 1000,     // 1 minute (ms)
    midTermDuration: 4 * 60 * 1000,   // 4 minutes
    longTermDuration: 9 * 60 * 1000,  // 9 minutes
    maxMessagesBeforeSummarization: 20,
    maxSummaryLength: 256,
    memoryRetentionPeriod: 60 * 60 * 1000, // 1 hour
  },
  
  // Memory storage
  memoryStorage: memoryStorage,
});
```

### Memory-Related Events

The memory feature triggers the following events:

- `memoriesLoaded`: When memory is loaded from storage  
- `memoryCreated`: When a new memory record is created  
- `memoriesRemoved`: When a memory record is deleted  
- `memoriesSaved`: When memory records are saved to storage  
- `storageCleared`: When the storage is cleared  

These events are emitted by the `MemoryManager` instance internally, so you typically need a reference to the internal component to use them.

### Memory Cleanup

Over time, memory records may grow and consume storage space. **AITuberOnAirCore** automatically removes old memories beyond the set retention period (default is 1 hour).

- `cleanupOldMemories` is invoked automatically during user input processing.  
- You can manually trigger a cleanup if necessary.

```typescript
// Clear both chat history and memory
aiTuber.clearChatHistory();

// Or access the memory manager directly (not recommended for production)
const memoryManager = aiTuber['memoryManager'];
if (memoryManager) {
  await memoryManager.cleanupOldMemories();
}
```

## Examples

### Vision (Image) Input Processing

```typescript
// Obtain image data URL (e.g., via camera capture)
const imageDataUrl = captureScreenshot();

// Basic vision processing with default prompt
await aituber.processVisionChat(imageDataUrl);

// Vision processing with a custom prompt
await aituber.processVisionChat(
  imageDataUrl,
  'Analyze the broadcast screen and provide entertaining comments for viewers.'
);
```

### Custom Summarization Prompts

```typescript
// Using a custom summarization prompt
const aiTuberCore = new AITuberOnAirCore({
  openAiKey: 'your_api_key',
  chatOptions: { /* ... */ },
  memoryOptions: {
    enableSummarization: true,
    // Other memory settings
    summaryPromptTemplate: 'Please summarize the following conversation in under {maxLength} characters, highlighting the key points.',
  },
});
```

### Synchronized Speech Playback

```typescript
// Example of waiting for speech playback to finish (using handleSpeakAi)
async function playSequentially() {
  // Wait for the listener's speech playback
  await handleSpeakAi(
    listenerScreenplay,
    listenerVoiceType,
    listenerSpeaker,
    openAiKey
  );
  
  console.log('Listener speech playback has finished');
  
  // AI avatar response
  await aituber.processChat('Hello, any updates on the show so far?');
}
```

## Integration with Existing Applications

AITuberOnAirCore can be integrated into existing applications relatively easily. For example:

1. Initialize with relevant API keys or settings at application startup.  
2. Set up event listeners to handle various stages of processing.  
3. Call the appropriate methods (`processChat`, `processVisionChat`, etc.) when a user or vision input occurs.

```typescript
// Example in App.tsx
useEffect(() => {
  // If AITuberOnAirCore is already initialized, set up event listeners
  if (aituberOnairCore) {
    // Clear old listeners
    aituberOnairCore.offAll();
    
    // Register new listeners
    aituberOnairCore.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
      setChatProcessing(true);
      setAssistantMessage('Loading...');
    });

    aituberOnairCore.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (text) => {
      setAssistantMessage((prev) => {
        if (prev === 'Loading...') return text;
        return prev + text;
      });
    });
    
    // Other event listeners...
  }
}, [aituberOnairCore]);
```

In real-world applications, you might update the speech engine settings when the user changes preferences, toggle the memory feature on or off, and so on. Though optimized for AITuber OnAir, it's flexible enough to be embedded into custom AITuber apps.

## Testing & Development

**AITuberOnAirCore** includes a comprehensive test suite to ensure quality and stability.

### Test Structure

Tests are organized in the following directory structure:

```
tests/
├── core/         # Tests for core components
├── services/     # Tests for services (speech, chat, etc.)
├── utils/        # Tests for utility functions
└── README.md     # Detailed info on the test structure
```

### Naming Conventions

- Test files use the `.test.ts` suffix (e.g., `AITuberOnAirCore.test.ts`).  
- There should be a corresponding test file for each source file.

### Running Tests

The test framework uses **Vitest**:

```bash
# Navigate to the AITuberOnAirCore root directory
cd src/lib/aituber-onair-core

# Run all tests
npm test

# Watch mode (automatically reruns tests on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests

Follow these guidelines:

1. Use the Arrange-Act-Assert pattern.  
2. Properly mock external dependencies.  
3. Keep tests isolated and independent.  
4. Test both success and error cases.

**Example**:

```typescript
import { describe, it, expect } from 'vitest';
import { AITuberOnAirCore } from '../../core/AITuberOnAirCore';

describe('AITuberOnAirCore', () => {
  describe('constructor', () => {
    it('initializes properly with valid options', () => {
      // Arrange
      const options = { /* ... */ };
      
      // Act
      const instance = new AITuberOnAirCore(options);
      
      // Assert
      expect(instance).toBeDefined();
    });
  });
});
```

### Coverage Requirements

Particularly high test coverage is sought for:

- Core functionality  
- Public APIs  
- Edge cases  
- Error handling

### Setting Up the Development Environment

You will need:

1. Node.js (version 20 or higher)  
2. npm (version 10 or higher)

```bash
# Install dependencies
npm install

# Run the test suite
npm test
```