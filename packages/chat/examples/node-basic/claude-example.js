/**
 * Claude-specific example for @aituber-onair/chat
 * Demonstrates Claude 3 models and Anthropic-specific features
 */
const {
  ChatServiceFactory,
  MODEL_CLAUDE_3_HAIKU,
} = require('../../dist/cjs/index.js');

async function demonstrateClaudeModels() {
  console.log('=== Claude 3 Model Family ===\n');

  const models = [
    { name: MODEL_CLAUDE_3_HAIKU, description: 'Fast and efficient' },
  ];

  const testPrompt = 'Write a one-sentence summary of quantum computing.';

  for (const model of models) {
    console.log(`\n--- ${model.name} (${model.description}) ---`);

    try {
      const service = ChatServiceFactory.createChatService('claude', {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: model.name,
      });

      const startTime = Date.now();
      let response = '';

      await service.processChat(
        [{ role: 'user', content: testPrompt }],
        (partial) => {
          response += partial;
          process.stdout.write(partial);
        },
        async (complete) => {
          const elapsed = Date.now() - startTime;
          console.log(`\n(Time: ${elapsed}ms)\n`);
        },
      );
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
}

async function demonstrateSystemPrompts() {
  console.log('=== System Prompts with Claude ===\n');

  const service = ChatServiceFactory.createChatService('claude', {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: MODEL_CLAUDE_3_HAIKU,
    responseLength: 'medium',
  });

  // Different system prompts for different behaviors
  const scenarios = [
    {
      name: 'Technical Expert',
      system:
        'You are a technical expert. Be precise and use technical terminology when appropriate.',
      user: 'What is a REST API?',
    },
    {
      name: 'ELI5 Teacher',
      system:
        'You are a teacher explaining concepts to a 5-year-old. Use simple words and fun analogies.',
      user: 'What is a REST API?',
    },
    {
      name: 'Pirate Character',
      system:
        'You are a pirate. Speak like a pirate in all your responses, but still be helpful and accurate.',
      user: 'What is a REST API?',
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\n--- ${scenario.name} ---`);
    console.log(`System: "${scenario.system}"`);
    console.log(`User: "${scenario.user}"\n`);

    await service.processChat(
      [
        { role: 'system', content: scenario.system },
        { role: 'user', content: scenario.user },
      ],
      (partial) => process.stdout.write(partial),
      async () => console.log('\n'),
    );
  }
}

async function demonstrateMultiTurn() {
  console.log('=== Multi-turn Conversation ===\n');

  const service = ChatServiceFactory.createChatService('claude', {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: MODEL_CLAUDE_3_HAIKU,
    responseLength: 'short',
  });

  const conversation = [
    { role: 'system', content: 'You are a helpful coding assistant.' },
    { role: 'user', content: 'I need to sort an array in JavaScript.' },
  ];

  // First turn
  console.log('User: I need to sort an array in JavaScript.\n');
  console.log('Claude: ');

  let assistantResponse = '';
  await service.processChat(
    conversation,
    (partial) => {
      assistantResponse += partial;
      process.stdout.write(partial);
    },
    async () => console.log('\n'),
  );

  // Add assistant response to conversation
  conversation.push({ role: 'assistant', content: assistantResponse });

  // Second turn
  const followUp = 'Can you show me how to sort in descending order?';
  conversation.push({ role: 'user', content: followUp });

  console.log(`User: ${followUp}\n`);
  console.log('Claude: ');

  await service.processChat(
    conversation,
    (partial) => process.stdout.write(partial),
    async () => console.log('\n'),
  );
}

async function demonstrateAdvancedFeatures() {
  console.log('=== Advanced Claude Features ===\n');

  const service = ChatServiceFactory.createChatService('claude', {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: MODEL_CLAUDE_3_HAIKU,
    temperature: 0.7,
    maxTokens: 500,
  });

  // Complex reasoning task
  const complexPrompt = `
    Analyze this code and suggest improvements:
    
    function calc(x, y, op) {
      if (op == '+') return x + y;
      if (op == '-') return x - y;
      if (op == '*') return x * y;
      if (op == '/') return x / y;
    }
    
    Consider: error handling, code style, and extensibility.
  `;

  console.log(`Analyzing code with ${service.getModel()}...\n`);

  await service.processChat(
    [{ role: 'user', content: complexPrompt }],
    (partial) => process.stdout.write(partial),
    async () => console.log('\n'),
  );
}

async function main() {
  console.log('=== Claude (Anthropic) Chat Service Examples ===\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Please set ANTHROPIC_API_KEY environment variable');
    console.log('\nExample:');
    console.log('export ANTHROPIC_API_KEY="sk-ant-..."');
    console.log('\nGet your API key from: https://console.anthropic.com/');
    return;
  }

  try {
    await demonstrateClaudeModels();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateSystemPrompts();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateMultiTurn();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateAdvancedFeatures();

    console.log('\n=== All Examples Complete ===');
    console.log('\nKey Features of Claude:');
    console.log(
      '- claude-3-haiku-20240307 provides the most cost-effective Claude experience',
    );
    console.log('- Strong system prompt adherence');
    console.log('- Excellent at complex reasoning');
    console.log('- Natural conversation flow');
    console.log('- High-quality code analysis');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('401')) {
      console.log('\n📌 Check that your API key is valid');
    }
  }
}

main().catch(console.error);
