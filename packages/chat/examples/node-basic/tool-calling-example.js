/**
 * Tool/Function calling example for @aituber-onair/chat
 * Demonstrates how AI models can use tools to enhance their capabilities
 */
const { ChatServiceFactory } = require('../../dist/cjs/index.js');

// Example tool implementations
const tools = {
  get_weather: async ({ location, unit = 'celsius' }) => {
    // Simulated weather API
    const weather = {
      Tokyo: { temp: 22, condition: 'sunny' },
      'New York': { temp: 18, condition: 'cloudy' },
      London: { temp: 15, condition: 'rainy' },
      Sydney: { temp: 25, condition: 'sunny' },
    };

    const data = weather[location] || { temp: 20, condition: 'unknown' };
    const temp = unit === 'fahrenheit' ? (data.temp * 9) / 5 + 32 : data.temp;

    return {
      location,
      temperature: temp,
      unit,
      condition: data.condition,
    };
  },

  calculate: async ({ expression }) => {
    // Simple calculator (be careful with eval in production!)
    try {
      // Basic safety check
      if (!/^[\d\s+\-*/().,]+$/.test(expression)) {
        throw new Error('Invalid expression');
      }
      const result = Function('"use strict"; return (' + expression + ')')();
      return { result, expression };
    } catch (error) {
      return { error: 'Invalid expression', expression };
    }
  },

  get_current_time: async ({ timezone = 'UTC' }) => {
    const now = new Date();
    const options = {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'long',
    };
    return {
      timezone,
      time: now.toLocaleString('en-US', options),
    };
  },
};

// Tool definitions for the AI
const toolDefinitions = [
  {
    name: 'get_weather',
    description: 'Get the current weather for a specific location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city name, e.g., Tokyo, New York',
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'Temperature unit',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description:
            'Mathematical expression to evaluate, e.g., "2 + 2", "10 * 5"',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'get_current_time',
    description: 'Get the current time in a specific timezone',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone name, e.g., "America/New_York", "Asia/Tokyo"',
        },
      },
    },
  },
];

async function demonstrateSimpleToolUse() {
  console.log('=== Simple Tool Usage ===\n');

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    // Using default model (gpt-4o-mini) for tool calling
    tools: toolDefinitions,
    toolHandlers: tools,
  });

  const queries = [
    "What's the weather like in Tokyo?",
    'Calculate 123 * 456 for me',
    'What time is it in New York?',
  ];

  for (const query of queries) {
    console.log(`User: ${query}\n`);
    console.log('Assistant: ');

    await service.processChat(
      [{ role: 'user', content: query }],
      (partial) => process.stdout.write(partial),
      async () => console.log('\n\n'),
    );
  }
}

async function demonstrateMultiToolUse() {
  console.log('=== Multiple Tool Usage in One Request ===\n');

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    // Using default model for multi-tool scenarios
    tools: toolDefinitions,
    toolHandlers: tools,
    maxHops: 3, // Allow multiple tool calls
  });

  const complexQuery =
    'Compare the weather in Tokyo and New York, and tell me what time it is in both cities.';

  console.log(`User: ${complexQuery}\n`);
  console.log('Assistant: ');

  await service.processChat(
    [{ role: 'user', content: complexQuery }],
    (partial) => process.stdout.write(partial),
    async () => console.log('\n'),
  );
}

async function demonstrateToolsWithDifferentProviders() {
  console.log('=== Tool Usage Across Providers ===\n');

  const providers = [
    { name: 'openai', key: 'OPENAI_API_KEY' }, // Uses default model
    { name: 'claude', key: 'ANTHROPIC_API_KEY' }, // Uses default model
    { name: 'gemini', key: 'GOOGLE_API_KEY' }, // Uses default model
  ];

  const query = "What's 15% of 240?";

  for (const provider of providers) {
    if (!process.env[provider.key]) {
      console.log(`\nSkipping ${provider.name} (no API key)`);
      continue;
    }

    console.log(`\n--- ${provider.name.toUpperCase()} ---`);

    try {
      const service = ChatServiceFactory.createChatService(provider.name, {
        apiKey: process.env[provider.key],
        // Using default models for consistent comparison
        tools: toolDefinitions,
        toolHandlers: tools,
      });

      await service.processChat(
        [{ role: 'user', content: query }],
        (partial) => process.stdout.write(partial),
        async () => console.log('\n'),
      );
    } catch (error) {
      console.log(`Error: ${error.message}\n`);
    }
  }
}

async function demonstrateToolChaining() {
  console.log('=== Tool Chaining Example ===\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log('Skipping: OpenAI API key required\n');
    return;
  }

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    // Using default model for tool chaining
    tools: toolDefinitions,
    toolHandlers: tools,
    maxHops: 5,
  });

  const chainQuery =
    "If it's 20 degrees celsius in Tokyo, what would that be in fahrenheit? Also calculate what 20% warmer would be.";

  console.log(`User: ${chainQuery}\n`);
  console.log('Assistant: ');

  // Track tool usage
  let toolCallCount = 0;
  const originalHandlers = { ...tools };

  // Wrap handlers to log calls
  Object.keys(tools).forEach((name) => {
    tools[name] = async (params) => {
      toolCallCount++;
      console.log(
        `\n[Tool Call ${toolCallCount}: ${name}(${JSON.stringify(params)})]`,
      );
      const result = await originalHandlers[name](params);
      console.log(`[Tool Result: ${JSON.stringify(result)}]\n`);
      return result;
    };
  });

  await service.processChat(
    [{ role: 'user', content: chainQuery }],
    (partial) => process.stdout.write(partial),
    async () => {
      console.log(`\n\nTotal tool calls: ${toolCallCount}`);
    },
  );

  // Restore original handlers
  Object.assign(tools, originalHandlers);
}

async function main() {
  console.log('=== Tool/Function Calling Examples ===\n');
  console.log('This example demonstrates how AI models can use tools.\n');

  if (
    !process.env.OPENAI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.GOOGLE_API_KEY
  ) {
    console.error('❌ Please set at least one API key:');
    console.log('- OPENAI_API_KEY');
    console.log('- ANTHROPIC_API_KEY');
    console.log('- GOOGLE_API_KEY');
    console.log('\nNote: OpenAI has the most mature tool calling support.');
    return;
  }

  try {
    await demonstrateSimpleToolUse();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateMultiToolUse();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateToolsWithDifferentProviders();
    console.log('\n' + '='.repeat(50) + '\n');

    await demonstrateToolChaining();

    console.log('\n=== Tool Calling Examples Complete ===');
    console.log('\nKey Points:');
    console.log('- Tools extend AI capabilities with real functionality');
    console.log('- Multiple tools can be used in a single request');
    console.log('- Tool calling works across different providers');
    console.log('- Complex reasoning can chain multiple tool calls');
    console.log('- Always validate tool inputs in production');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main().catch(console.error);
