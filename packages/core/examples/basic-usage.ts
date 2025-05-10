/**
 * Basic usage example for AITuberOnAirCore
 *
 * This example demonstrates how to use AITuberOnAirCore for:
 * - Text input chat processing
 * - Vision (image) processing
 * - Screenshot capture and processing
 * - Using summarizers for memory management with different chat providers
 */

import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  AITuberOnAirCoreOptions,
  ChatScreenplay,
  Message,
  ToolDefinition,
} from '../src';

// Example of using MCP with AITuberOnAirCore
// Note: When using this example, you need to install @modelcontextprotocol/sdk
// @ts-ignore
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// @ts-ignore
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// @ts-ignore
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * Tool definition
 */
const randomIntTool: ToolDefinition = {
  name: 'randomInt',
  description: 'Return a random integer from 0 to (max - 1)',
  parameters: {
    type: 'object',
    properties: {
      max: {
        type: 'integer',
        description: 'Upper bound (exclusive). Defaults to 100.',
        minimum: 1,
      },
    },
  },
};

async function randomIntHandler({ max = 100 }: { max?: number }) {
  return Math.floor(Math.random() * max).toString();
}

/**
 * Example of basic chat processing with AITuberOnAirCore
 */
async function basicExample() {
  // 1. Configuration
  const OPENAI_API_KEY = 'your-api-key-here'; // Replace with your actual API key
  const GEMINI_API_KEY = 'your-gemini-api-key-here'; // Replace with your actual Gemini API key
  const SYSTEM_PROMPT =
    'You are a friendly AITuber. Please maintain a cheerful and approachable conversation style.';

  // 2. Initialize AITuberOnAirCore with OpenAI (default)
  const aituberOptions: AITuberOnAirCoreOptions = {
    chatProvider: 'openai', // Optional. If omitted, the default OpenAI will be used.
    apiKey: OPENAI_API_KEY,
    chatOptions: {
      systemPrompt: SYSTEM_PROMPT,
      visionSystemPrompt:
        'Please analyze the stream screen and provide relevant comments.',
      visionPrompt: 'Describe what you see in this image.',
      memoryNote:
        'This is a summary of past conversations. Please refer to it appropriately to continue the conversation.',
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
      summaryPromptTemplate:
        'Please summarize the following conversation in under {maxLength} characters. Include important points.',
    },
    voiceOptions: {
      speaker: '1', // VOICEVOX speaker ID
      engineType: 'voicevox', // Voice engine type
      onComplete: () => console.log('Voice playback completed'),
    },
    tools: [{ definition: randomIntTool, handler: randomIntHandler }],
    debug: true, // Enable debug output
  };

  const aituber = new AITuberOnAirCore(aituberOptions);

  // 3. Set up event listeners
  aituber.on('TOOL_USE', (b: any) =>
    console.log(`Tool use -> ${b.name}`, b.input),
  );
  aituber.on('TOOL_RESULT', (b: any) =>
    console.log(`Tool result ->`, b.content),
  );

  aituber.on(AITuberOnAirCoreEvent.PROCESSING_START, (data) => {
    console.log('Processing started:', data);
  });

  aituber.on(AITuberOnAirCoreEvent.PROCESSING_END, () => {
    console.log('Processing completed');
  });

  aituber.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (text) => {
    // Receive streaming response and display it on UI, etc.
    console.log(text);
  });

  aituber.on(
    AITuberOnAirCoreEvent.ASSISTANT_RESPONSE,
    (data: {
      message: Message;
      screenplay: ChatScreenplay;
      rawText: string;
    }) => {
      // Handle response completion
      console.log('\n');
      console.log('Response completed:', data.message.content);

      if (data.screenplay.emotion) {
        console.log('Emotion expression:', data.screenplay.emotion);
      }

      // Show original text with emotion tags
      console.log('Original text with emotion tags:', data.rawText);
    },
  );

  aituber.on(
    AITuberOnAirCoreEvent.SPEECH_START,
    (data: {
      screenplay: ChatScreenplay;
      rawText: string;
    }) => {
      console.log('Voice playback started:', data.screenplay.text);
      console.log('Original text with emotion tags:', data.rawText);
    },
  );

  aituber.on(AITuberOnAirCoreEvent.SPEECH_END, () => {
    console.log('Voice playback ended');
  });

  aituber.on(AITuberOnAirCoreEvent.ERROR, (error) => {
    console.error('An error occurred:', error);
  });

  // 4. Text chat processing
  console.log('User: Hello, how is the weather today?');
  await aituber.processChat('Hello, how is the weather today?');

  // Wait for the response to complete
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 5. Vision processing example (simulated)
  console.log('\n--- Vision Processing Example ---');
  console.log('Simulating image capture and processing...');

  // In a browser environment, you would capture a real screenshot:
  // const videoElement = document.querySelector('video');
  // const screenshot = captureScreenshot(videoElement);

  // For this example, we're using a simulated data URL
  const mockScreenshot =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';

  console.log('Processing vision chat with captured image...');
  await aituber.processVisionChat(mockScreenshot);

  // 6. Examples with different chat providers and automatic summarizer selection
  console.log('\n--- Chat Provider and Summarizer Examples ---');

  // 7. Tool usage example
  console.log('\n--- Tool Usage Example ---');
  console.log('User: What is the random number between 0 and 100?');
  await aituber.processChat('What is the random number between 0 and 100?');

  // Example with Gemini Provider and Summarizer
  console.log('\nExample using Gemini Provider:');

  const geminiOptions: AITuberOnAirCoreOptions = {
    chatProvider: 'gemini', // Using Gemini as the chat provider
    apiKey: GEMINI_API_KEY,
    chatOptions: {
      systemPrompt: SYSTEM_PROMPT,
      memoryNote:
        'This is a summary of past conversations. Please refer to it appropriately.',
    },
    memoryOptions: {
      enableSummarization: true,
      maxMessagesBeforeSummarization: 10,
      maxSummaryLength: 200,
      shortTermDuration: 60 * 1000,
      midTermDuration: 5 * 60 * 1000,
      longTermDuration: 10 * 60 * 1000,
      // Optional custom prompt
      summaryPromptTemplate:
        'Please create a brief summary of this conversation in {maxLength} characters or less.',
    },
    debug: true,
  };

  // Create AITuberOnAirCore with Gemini provider
  // This will automatically use GeminiSummarizer for memory management
  const geminiAITuber = new AITuberOnAirCore(geminiOptions);
  console.log(
    'AITuber with Gemini provider and summarizer has been configured.',
  );

  // Example with OpenAI Provider and Summarizer
  console.log('\nExample using OpenAI Provider:');

  const openaiOptions: AITuberOnAirCoreOptions = {
    chatProvider: 'openai', // Using OpenAI as the chat provider
    apiKey: OPENAI_API_KEY,
    chatOptions: {
      systemPrompt: SYSTEM_PROMPT,
      memoryNote:
        'This is a summary of past conversations. Please refer to it appropriately.',
    },
    memoryOptions: {
      enableSummarization: true,
      maxMessagesBeforeSummarization: 10,
      maxSummaryLength: 200,
      shortTermDuration: 60 * 1000,
      midTermDuration: 5 * 60 * 1000,
      longTermDuration: 10 * 60 * 1000,
    },
    debug: true,
    tools: [{ definition: randomIntTool, handler: randomIntHandler }],
  };

  // Create AITuberOnAirCore with OpenAI provider
  // This will automatically use OpenAISummarizer for memory management
  const openaiAITuber = new AITuberOnAirCore(openaiOptions);
  console.log(
    'AITuber with OpenAI provider and summarizer has been configured.',
  );

  // Demonstrate how to use the different AITuber instances
  console.log('\nUsage examples:');

  /* Usage example:
  // With OpenAI Summarizer
  await openaiAITuber.processChat("Hello, how are you today?");
  
  // With Gemini Summarizer
  await geminiAITuber.processChat("Hello, how are you today?");
  */

  // 7. Additional examples (commented out for brevity)

  // Example: Continue chat conversation
  // await new Promise(resolve => setTimeout(resolve, 3000));
  // console.log('\nUser: What are your hobbies?');
  // await aituber.processChat('What are your hobbies?');

  // Example: Stop speech playback
  // aituber.stopSpeech();

  // Example: Get and clear chat history
  const history = aituber.getChatHistory();
  console.log('Chat history:', history);
  aituber.clearChatHistory();

  // Example: Restore chat history from external source
  aituber.setChatHistory(history);
  console.log('Restored chat history:', aituber.getChatHistory());

  // Example: Update voice service options
  // aituber.updateVoiceService({
  //   speaker: '2',
  //   engineType: 'voicevox'
  // });

  // Example: Speak text with custom options
  // await aituber.speakTextWithOptions('This is a test of custom voice options', {
  //   enableAnimation: true,
  //   temporaryVoiceOptions: {
  //     speaker: '3',
  //     speakOptions: {
  //       speed: 1.2,
  //       pitch: 1.1
  //     }
  //   }
  // });

  // 8. MCP (Model Context Protocol) Client Example
  console.log('\n--- MCP Client Example ---');

  // Example of using MCP with AITuberOnAirCore
  async function mcpExample() {
    console.log('Creating MCP client with Streamable HTTP transport...');

    // Initialize the MCP client
    const mcpClient = new Client({
      name: 'aituber-mcp-client',
      version: '1.0.0',
    });

    // Connect to an MCP server over Streamable HTTP
    const streamableTransport = new StreamableHTTPClientTransport(
      new URL('http://localhost:3000/mcp'), // Replace with your actual MCP server URL
    );

    try {
      await mcpClient.connect(streamableTransport);
      console.log('Connected to MCP server via Streamable HTTP');

      // List available resources
      const resources = await mcpClient.listResources();
      console.log('Available resources:', resources);

      // Call a tool through MCP
      const result = await mcpClient.callTool({
        name: 'randomInt',
        arguments: { max: 100 },
      });

      console.log('MCP tool call result:', result);

      // Define a tool that delegates to MCP
      const mcpRandomIntTool: ToolDefinition = {
        name: 'mcpRandomInt',
        description: 'Get a random integer using MCP',
        parameters: {
          type: 'object',
          properties: {
            max: {
              type: 'integer',
              description: 'Upper bound (exclusive)',
              minimum: 1,
            },
          },
        },
      };

      // Tool handler that uses MCP
      async function mcpRandomIntHandler({ max = 100 }: { max?: number }) {
        // Delegate the tool call to the MCP server
        const result = await mcpClient.callTool({
          name: 'randomInt',
          arguments: { max },
        });

        // Extract result text from MCP response
        const content = result.content as Array<{ type: string; text: string }>;
        return content[0]?.text || 'Error: No result from MCP server';
      }

      // Create AITuber with the MCP-backed tool
      const mcpAITuberOptions: AITuberOnAirCoreOptions = {
        chatProvider: 'openai',
        apiKey: OPENAI_API_KEY,
        chatOptions: {
          systemPrompt:
            'You are an AITuber using MCP tools. Use mcpRandomInt when needed.',
        },
        tools: [{ definition: mcpRandomIntTool, handler: mcpRandomIntHandler }],
        debug: true,
      };

      const mcpAITuber = new AITuberOnAirCore(mcpAITuberOptions);

      console.log('AITuber with MCP integration configured');
      console.log('User: Generate a random number using MCP');

      // Process a chat message that should trigger the MCP tool
      await mcpAITuber.processChat('Generate a random number using MCP');
    } catch (error) {
      console.error('MCP error:', error);
    }
  }

  // Execute MCP example
  // Uncomment to run the example (requires installing @modelcontextprotocol/sdk):
  // await mcpExample();
}

// Only execute in Node.js environment
if (typeof window === 'undefined') {
  basicExample().catch(console.error);
}

export { basicExample };
