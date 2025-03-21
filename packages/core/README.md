# AITuber OnAir Core

![AITuber OnAir Core - logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/refs/heads/main/packages/core/images/aituber-onair-core.png)

**AITuber OnAir Core** is a TypeScript library developed to provide functionality for the [AITuber OnAir](https://aituberonair.com) web service, designed for AI-based virtual streaming (AITuber).  

[日本語版はこちら](https://github.com/shinshin86/aituber-onair/blob/main/packages/core/README_ja.md)

While it is primarily intended for use within [AITuber OnAir](https://aituberonair.com), this project is available as open-source software under the MIT License and can be used freely.

It specializes in generating response text and audio from text or image inputs, and is designed to easily integrate with other parts of an application (storage, YouTube integration, avatar control, etc.).

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Main Features](#main-features)
- [Basic Usage](#basic-usage)
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

aituber.on(AITuberOnAirCoreEvent.ERROR, (error) => {
  console.error('Error occurred:', error);
});

// 4. Process text input
await aituber.processChat('Hello, how is the weather today?');

// 5. Clear event listeners if needed
aituber.offAll();
```

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

## Main Components

### AITuberOnAirCore

This is the overall integration class, responsible for initializing and coordinating other components. It extends `EventEmitter` and emits events at various processing stages. In most cases, you will interact primarily with this class to use its features.

**Main methods** include:

- `processChat(text)` – Process text input
- `processVisionChat(imageDataUrl, visionPrompt?)` – Process image input (optionally pass a custom prompt)
- `stopSpeech()` – Stop speech playback
- `getChatHistory()` – Retrieve chat history
- `clearChatHistory()` – Clear chat history
- `updateVoiceService(options)` – Update speech settings
- `isMemoryEnabled()` – Check if memory functionality is enabled
- `offAll()` – Remove all event listeners

### ChatProcessor

The component that sends text input to an AI model (e.g., OpenAI GPT) and receives responses. It manages the conversation flow and supports streaming responses. It also handles emotion extraction from responses.

- `updateOptions(newOptions)` – Allows you to update settings at runtime

### MemoryManager

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

## AI Provider System

AITuber OnAir Core adopts an extensible provider system, enabling integration with various AI APIs.
Currently, OpenAI API and Gemini API is available, but other API providers (such as Claude API, etc.) are planned to be added soon.

### Available Providers

Currently, the following AI provider is built-in:

- **OpenAI**: Supports models like GPT-4o, GPT-4o-mini, O3-mini.
- **Gemini**: Supports models like Gemini 2.0 Flash, Gemini 2.0 Flash-Lite, Gemini 1.5 Flash

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