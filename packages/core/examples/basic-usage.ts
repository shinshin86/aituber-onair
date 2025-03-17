/**
 * Basic usage example for AITuberOnAirCore
 *
 * This example demonstrates how to use AITuberOnAirCore for:
 * - Text input chat processing
 * - Vision (image) processing
 * - Screenshot capture and processing
 */

import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  AITuberOnAirCoreOptions,
  ChatScreenplay,
  Message,
} from '../src';

/**
 * Example of basic chat processing with AITuberOnAirCore
 */
async function basicExample() {
  // 1. Configuration
  const OPENAI_API_KEY = 'your-api-key-here'; // Replace with your actual API key
  const SYSTEM_PROMPT =
    'You are a friendly AITuber. Please maintain a cheerful and approachable conversation style.';

  // 2. Initialize AITuberOnAirCore
  const aituberOptions: AITuberOnAirCoreOptions = {
    chatProvider: 'openai', // Optional. If omitted, the default OpenAI will be used. (English: If omitted, the default OpenAI will be used.)
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
    // visionModel: 'gpt-4o',   // More capable model for image processing
    memoryOptions: {
      enableSummarization: true,
      shortTermDuration: 60 * 1000, // 1 minute
      midTermDuration: 4 * 60 * 1000, // 4 minutes
      longTermDuration: 9 * 60 * 1000, // 9 minutes
      maxMessagesBeforeSummarization: 20,
    },
    voiceOptions: {
      speaker: '1', // VOICEVOX speaker ID
      engineType: 'voicevox', // Voice engine type
      onComplete: () => console.log('Voice playback completed'),
    },
    debug: true, // Enable debug output
  };

  const aituber = new AITuberOnAirCore(aituberOptions);

  // 3. Set up event listeners
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

  // 6. Additional examples (commented out for brevity)

  // Example: Continue chat conversation
  // await new Promise(resolve => setTimeout(resolve, 3000));
  // console.log('\nUser: What are your hobbies?');
  // await aituber.processChat('What are your hobbies?');

  // Example: Stop speech playback
  // aituber.stopSpeech();

  // Example: Get and clear chat history
  // const history = aituber.getChatHistory();
  // console.log('Chat history:', history);
  // aituber.clearChatHistory();

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
}

// Only execute in Node.js environment
if (typeof window === 'undefined') {
  basicExample().catch(console.error);
}

export { basicExample };
