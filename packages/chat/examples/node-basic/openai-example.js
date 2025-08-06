/**
 * OpenAI-specific example for @aituber-onair/chat
 * Demonstrates GPT models, o1 series, and OpenAI-specific features
 */
const {
  ChatServiceFactory,
  MODEL_GPT_4_1_NANO,
} = require('../../dist/cjs/index.js');

async function demonstrateDefaultModel() {
  console.log('=== Default Model Example ===\n');

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: MODEL_GPT_4_1_NANO,
    responseLength: 'medium',
  });

  const messages = [
    {
      role: 'system',
      content: 'You are a creative writing assistant. Be concise but engaging.',
    },
    {
      role: 'user',
      content: 'Write a short haiku about artificial intelligence.',
    },
  ];

  console.log(`Generating haiku with ${service.getModel()}...\n`);

  await service.processChat(
    messages,
    (partial) => process.stdout.write(partial),
    async (complete) => {
      console.log('\n\n✓ Generation complete\n');
    },
  );
}

async function demonstrateResponseFormats() {
  console.log('=== Response Length Control ===\n');

  const prompt = 'Explain what machine learning is.';

  // Test different response lengths
  const lengths = ['veryShort', 'short', 'medium'];

  for (const length of lengths) {
    console.log(`\n--- Response Length: ${length} ---`);

    const service = ChatServiceFactory.createChatService('openai', {
      apiKey: process.env.OPENAI_API_KEY,
      model: MODEL_GPT_4_1_NANO,
      responseLength: length,
    });

    let response = '';
    await service.processChat(
      [{ role: 'user', content: prompt }],
      (partial) => {
        response += partial;
        process.stdout.write(partial);
      },
      async (complete) => {
        console.log(`\n(Length: ${complete.length} chars)\n`);
      },
    );
  }
}

async function demonstrateTemperature() {
  console.log('=== Temperature Settings ===\n');

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: MODEL_GPT_4_1_NANO,
    temperature: 0.9, // High creativity
    maxTokens: 100,
  });

  const messages = [
    {
      role: 'user',
      content: 'Give me a creative name for a robot assistant.',
    },
  ];

  console.log('Generating with high temperature (0.9)...\n');

  for (let i = 0; i < 3; i++) {
    console.log(`Attempt ${i + 1}: `);
    await service.processChat(
      messages,
      (partial) => process.stdout.write(partial),
      async (complete) => console.log('\n'),
    );
  }
}

async function main() {
  console.log('=== OpenAI Chat Service Examples ===\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Please set OPENAI_API_KEY environment variable');
    console.log('\nExample:');
    console.log('export OPENAI_API_KEY="sk-..."');
    return;
  }

  try {
    // Run demonstrations
    await demonstrateDefaultModel();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateResponseFormats();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateTemperature();

    console.log('\n=== All Examples Complete ===');
    console.log('\nKey Takeaways:');
    console.log('- gpt-4.1-nano provides excellent quality at the lowest cost');
    console.log('- o1 models excel at reasoning tasks');
    console.log('- Response length can be controlled with presets');
    console.log('- Temperature affects creativity and randomness');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('401')) {
      console.log('\n📌 Check that your API key is valid');
    }
  }
}

main().catch(console.error);
