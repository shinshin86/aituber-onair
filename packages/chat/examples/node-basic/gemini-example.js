/**
 * Gemini-specific example for @aituber-onair/chat
 * Demonstrates Google Gemini models and specific features
 */
const {
  ChatServiceFactory,
  MODEL_GEMINI_2_5_FLASH_LITE,
} = require('../../dist/cjs/index.js');

async function demonstrateDefaultModel() {
  console.log('=== Default Model Example ===\n');

  const service = ChatServiceFactory.createChatService('gemini', {
    apiKey: process.env.GOOGLE_API_KEY,
    model: MODEL_GEMINI_2_5_FLASH_LITE,
    responseLength: 'medium',
  });

  const messages = [
    {
      role: 'user',
      content:
        'Explain the difference between machine learning and deep learning in simple terms.',
    },
  ];

  console.log(`Generating response with ${service.getModel()}...\n`);

  await service.processChat(
    messages,
    (partial) => process.stdout.write(partial),
    async (complete) => {
      console.log('\n\n✓ Generation complete');
      console.log(`Model used: ${service.getModel()}\n`);
    },
  );
}

async function demonstrateSafetySettings() {
  console.log('=== Safety Settings Example ===\n');

  const service = ChatServiceFactory.createChatService('gemini', {
    apiKey: process.env.GOOGLE_API_KEY,
    model: MODEL_GEMINI_2_5_FLASH_LITE,
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  });

  const testPrompts = [
    'Write a friendly greeting message.',
    'Explain how to stay safe online.',
  ];

  for (const prompt of testPrompts) {
    console.log(`\nPrompt: "${prompt}"\n`);

    try {
      await service.processChat(
        [{ role: 'user', content: prompt }],
        (partial) => process.stdout.write(partial),
        async () => console.log('\n'),
      );
    } catch (error) {
      console.log(`Safety filter triggered: ${error.message}\n`);
    }
  }
}

async function demonstrateGenerationConfig() {
  console.log('=== Generation Configuration ===\n');

  // Different generation configs
  const configs = [
    {
      name: 'Creative',
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
    },
    {
      name: 'Balanced',
      temperature: 0.7,
      topP: 0.8,
      topK: 30,
    },
    {
      name: 'Precise',
      temperature: 0.3,
      topP: 0.7,
      topK: 20,
    },
  ];

  const prompt = 'Write a tagline for a coffee shop.';

  for (const config of configs) {
    console.log(`\n--- ${config.name} Mode ---`);
    console.log(
      `Temperature: ${config.temperature}, TopP: ${config.topP}, TopK: ${config.topK}`,
    );

    const service = ChatServiceFactory.createChatService('gemini', {
      apiKey: process.env.GOOGLE_API_KEY,
      model: MODEL_GEMINI_2_5_FLASH_LITE,
      temperature: config.temperature,
      generationConfig: {
        topP: config.topP,
        topK: config.topK,
        maxOutputTokens: 50,
      },
    });

    console.log('Response: ');
    await service.processChat(
      [{ role: 'user', content: prompt }],
      (partial) => process.stdout.write(partial),
      async () => console.log('\n'),
    );
  }
}

async function demonstrateConversation() {
  console.log('=== Multi-turn Conversation ===\n');

  const service = ChatServiceFactory.createChatService('gemini', {
    apiKey: process.env.GOOGLE_API_KEY,
    model: MODEL_GEMINI_2_5_FLASH_LITE,
    responseLength: 'short',
  });

  // Build conversation
  const conversation = [];

  // Turn 1
  const userMsg1 = 'What are the primary colors?';
  console.log(`User: ${userMsg1}\n`);
  conversation.push({ role: 'user', content: userMsg1 });

  console.log('Gemini: ');
  let response1 = '';
  await service.processChat(
    conversation,
    (partial) => {
      response1 += partial;
      process.stdout.write(partial);
    },
    async () => console.log('\n'),
  );

  conversation.push({ role: 'assistant', content: response1 });

  // Turn 2
  const userMsg2 = 'How do you make green?';
  console.log(`User: ${userMsg2}\n`);
  conversation.push({ role: 'user', content: userMsg2 });

  console.log('Gemini: ');
  await service.processChat(
    conversation,
    (partial) => process.stdout.write(partial),
    async () => console.log('\n'),
  );
}

async function demonstrateStreamingSpeed() {
  console.log('=== Streaming Performance ===\n');

  const service = ChatServiceFactory.createChatService('gemini', {
    apiKey: process.env.GOOGLE_API_KEY,
    model: MODEL_GEMINI_2_5_FLASH_LITE,
    maxTokens: 200,
  });

  const prompt =
    'Write a short story about a robot learning to paint. Include a beginning, middle, and end.';

  console.log('Streaming response (watch the speed)...\n');

  const startTime = Date.now();
  let charCount = 0;

  await service.processChat(
    [{ role: 'user', content: prompt }],
    (partial) => {
      charCount += partial.length;
      process.stdout.write(partial);
    },
    async (complete) => {
      const elapsed = Date.now() - startTime;
      console.log('\n\n✓ Streaming complete');
      console.log(`Time: ${elapsed}ms`);
      console.log(`Characters: ${charCount}`);
      console.log(
        `Speed: ${((charCount / elapsed) * 1000).toFixed(1)} chars/second\n`,
      );
    },
  );
}

async function main() {
  console.log('=== Google Gemini Chat Service Examples ===\n');

  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ Please set GOOGLE_API_KEY environment variable');
    console.log('\nExample:');
    console.log('export GOOGLE_API_KEY="your-api-key"');
    console.log(
      '\nGet your API key from: https://makersuite.google.com/app/apikey',
    );
    return;
  }

  try {
    await demonstrateDefaultModel();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateSafetySettings();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateGenerationConfig();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateConversation();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateStreamingSpeed();

    console.log('\n=== All Examples Complete ===');
    console.log('\nKey Features of Gemini:');
    console.log(
      '- gemini-2.5-flash-lite offers the most cost-effective Gemini experience',
    );
    console.log('- Configurable safety settings');
    console.log('- Fine-grained generation control');
    console.log('- Good at following instructions');
    console.log('- Competitive pricing');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log(
        '\n📌 Check that your API key is valid and has the correct permissions',
      );
    }
  }
}

main().catch(console.error);
