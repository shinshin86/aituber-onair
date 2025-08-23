/**
 * OpenRouter Chat Service Example
 * This example demonstrates how to use the OpenRouter provider with the gpt-oss-20b:free model
 */

const { ChatServiceFactory } = require('../../dist/cjs/index.js');

async function main() {
  // Create OpenRouter chat service with gpt-oss-20b:free (free tier model)
  const chatService = ChatServiceFactory.createChatService('openrouter', {
    apiKey: process.env.OPENROUTER_API_KEY || 'your-openrouter-api-key',
    model: 'openai/gpt-oss-20b:free', // Free model
    // Optional: Add app information for OpenRouter analytics
    appName: 'AITuber OnAir Example',
    appUrl: 'https://github.com/shinshin86/aituber-onair',
  });

  console.log('OpenRouter Chat Service Example');
  console.log('Using model:', chatService.getModel());
  console.log('---');

  // Example 1: Simple chat
  console.log('Example 1: Simple chat');
  const messages = [
    {
      role: 'system',
      content: 'You are a helpful AI assistant.',
    },
    {
      role: 'user',
      content: 'What are the benefits of using OpenRouter for AI models?',
    },
  ];

  let fullResponse = '';
  await chatService.processChat(
    messages,
    (text) => {
      process.stdout.write(text);
      fullResponse += text;
    },
    async (text) => {
      console.log('\n\nComplete response received');
    },
  );

  console.log('\n---');

  // Example 2: Another request with the same model
  console.log('Example 2: Testing response length control');

  const messages2 = [
    {
      role: 'user',
      content: 'Explain what OpenRouter is in one sentence.',
    },
  ];

  await chatService.processChat(
    messages2,
    (text) => {
      process.stdout.write(text);
    },
    async (text) => {
      console.log('\n\nResponse completed');
    },
  );

  // Add delay between requests to respect rate limits (20 req/min for free tier)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('\n\n---');
  console.log('OpenRouter examples completed!');
  console.log('Note: Free tier models have rate limits (20 requests/minute)');
}

// Run the example
main().catch(console.error);
