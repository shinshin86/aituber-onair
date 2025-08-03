/**
 * Basic example of using @aituber-onair/chat in Node.js environment
 * This example demonstrates basic setup and usage with all three providers.
 */
const { ChatServiceFactory } = require('../../dist/cjs/index.js');

async function main() {
  console.log('=== AITuber OnAir Chat - Basic Node.js Example ===\n');

  // Example messages
  const messages = [
    { role: 'system', content: 'You are a helpful AI assistant.' },
    { role: 'user', content: 'Hello! Can you briefly introduce yourself?' },
  ];

  // Example 1: OpenAI (if API key is available)
  if (process.env.OPENAI_API_KEY) {
    console.log('1. Testing OpenAI Chat Service\n');

    try {
      const openaiService = ChatServiceFactory.createChatService('openai', {
        apiKey: process.env.OPENAI_API_KEY,
        // Using default model (gpt-4o-mini) for optimal cost/performance balance
        responseLength: 'short',
      });

      console.log(`Using model: ${openaiService.getModel()}`);
      console.log('Processing chat...\n');

      let streamedText = '';
      await openaiService.processChat(
        messages,
        (partial) => {
          // Handle streaming response
          process.stdout.write(partial);
          streamedText += partial;
        },
        async (complete) => {
          // Handle complete response
          console.log('\n\n✓ Chat completed');
          console.log(`Total length: ${complete.length} characters\n`);
        },
      );
    } catch (error) {
      console.error('❌ OpenAI Error:', error.message);
    }
  } else {
    console.log(
      '⚠️  OpenAI API key not found. Set OPENAI_API_KEY environment variable.\n',
    );
  }

  // Example 2: Claude (if API key is available)
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('2. Testing Claude Chat Service\n');

    try {
      const claudeService = ChatServiceFactory.createChatService('claude', {
        apiKey: process.env.ANTHROPIC_API_KEY,
        // Using default model (claude-3-haiku-20240307) for cost efficiency
        responseLength: 'short',
      });

      console.log(`Using model: ${claudeService.getModel()}`);
      console.log('Processing chat...\n');

      await claudeService.processChat(
        messages,
        (partial) => {
          process.stdout.write(partial);
        },
        async (complete) => {
          console.log('\n\n✓ Chat completed');
          console.log(`Total length: ${complete.length} characters\n`);
        },
      );
    } catch (error) {
      console.error('❌ Claude Error:', error.message);
    }
  } else {
    console.log(
      '⚠️  Claude API key not found. Set ANTHROPIC_API_KEY environment variable.\n',
    );
  }

  // Example 3: Gemini (if API key is available)
  if (process.env.GOOGLE_API_KEY) {
    console.log('3. Testing Gemini Chat Service\n');

    try {
      const geminiService = ChatServiceFactory.createChatService('gemini', {
        apiKey: process.env.GOOGLE_API_KEY,
        // Using default model (gemini-2.0-flash-lite) for cost efficiency
        responseLength: 'short',
      });

      console.log(`Using model: ${geminiService.getModel()}`);
      console.log('Processing chat...\n');

      await geminiService.processChat(
        messages,
        (partial) => {
          process.stdout.write(partial);
        },
        async (complete) => {
          console.log('\n\n✓ Chat completed');
          console.log(`Total length: ${complete.length} characters\n`);
        },
      );
    } catch (error) {
      console.error('❌ Gemini Error:', error.message);
    }
  } else {
    console.log(
      '⚠️  Gemini API key not found. Set GOOGLE_API_KEY environment variable.\n',
    );
  }

  // Summary
  console.log('\n=== Example Complete ===');
  console.log('\nTo run specific provider examples:');
  console.log('- node openai-example.js');
  console.log('- node claude-example.js');
  console.log('- node gemini-example.js');
  console.log('\nFor advanced features:');
  console.log('- node vision-example.js');
  console.log('- node tool-calling-example.js');
  console.log('- node streaming-example.js');
}

// Run the example
main().catch(console.error);
