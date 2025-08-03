/**
 * Streaming response example for @aituber-onair/chat
 * Demonstrates real-time streaming capabilities and performance
 */
const { ChatServiceFactory } = require('../../dist/cjs/index.js');

async function demonstrateBasicStreaming() {
  console.log('=== Basic Streaming Example ===\n');

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    // Using default model (gpt-4o-mini) for streaming demo
    maxTokens: 150,
  });

  const prompt = 'Write a short poem about coding.';
  console.log(`Prompt: "${prompt}"\n`);
  console.log('Streaming response:\n');

  const startTime = Date.now();
  let firstTokenTime = 0;
  let tokenCount = 0;

  await service.processChat(
    [{ role: 'user', content: prompt }],
    (partial) => {
      if (tokenCount === 0) {
        firstTokenTime = Date.now() - startTime;
      }
      tokenCount++;
      process.stdout.write(partial);
    },
    async (complete) => {
      const totalTime = Date.now() - startTime;
      console.log('\n\n--- Streaming Stats ---');
      console.log(`Time to first token: ${firstTokenTime}ms`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Characters: ${complete.length}`);
      console.log(`Approx tokens: ${tokenCount}`);
      console.log(
        `Speed: ${((complete.length / totalTime) * 1000).toFixed(1)} chars/second\n`,
      );
    },
  );
}

async function demonstrateStreamingWithProgress() {
  console.log('=== Streaming with Progress Indicator ===\n');

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    // Using default model with progress indicators
    maxTokens: 200,
  });

  const prompt = 'Explain the concept of recursion in programming.';
  console.log(`Prompt: "${prompt}"\n`);

  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinnerIndex = 0;
  let buffer = '';
  let lastLineLength = 0;

  // Show spinner while waiting for first token
  const spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${spinner[spinnerIndex]} Waiting for response...`);
    spinnerIndex = (spinnerIndex + 1) % spinner.length;
  }, 100);

  await service.processChat(
    [{ role: 'user', content: prompt }],
    (partial) => {
      // Clear spinner on first token
      if (buffer.length === 0) {
        clearInterval(spinnerInterval);
        process.stdout.write('\r' + ' '.repeat(30) + '\r');
      }

      buffer += partial;

      // Show streaming with word count
      const words = buffer.split(/\s+/).length;
      const status = `[${words} words] `;

      // Clear previous line and write new content
      process.stdout.write('\r' + ' '.repeat(lastLineLength) + '\r');
      const currentLine = status + buffer.split('\n').pop();
      process.stdout.write(currentLine);
      lastLineLength = currentLine.length;
    },
    async (complete) => {
      clearInterval(spinnerInterval);
      console.log('\n\n✓ Streaming complete');
    },
  );
}

async function compareProviderSpeeds() {
  console.log('=== Provider Streaming Speed Comparison ===\n');

  const providers = [
    { name: 'openai', key: 'OPENAI_API_KEY' }, // Uses default model
    { name: 'claude', key: 'ANTHROPIC_API_KEY' }, // Uses default model
    { name: 'gemini', key: 'GOOGLE_API_KEY' }, // Uses default model
  ];

  const prompt = 'Write a brief explanation of what machine learning is.';
  const results = [];

  for (const provider of providers) {
    if (!process.env[provider.key]) {
      console.log(`Skipping ${provider.name} (no API key)\n`);
      continue;
    }

    console.log(`--- ${provider.name.toUpperCase()} (default model) ---`);

    try {
      const service = ChatServiceFactory.createChatService(provider.name, {
        apiKey: process.env[provider.key],
        // Using default models for fair comparison
        maxTokens: 100,
      });

      const startTime = Date.now();
      let firstTokenTime = 0;
      let charCount = 0;

      await service.processChat(
        [{ role: 'user', content: prompt }],
        (partial) => {
          if (charCount === 0) {
            firstTokenTime = Date.now() - startTime;
          }
          charCount += partial.length;
          process.stdout.write(partial);
        },
        async (complete) => {
          const totalTime = Date.now() - startTime;
          results.push({
            provider: provider.name,
            firstToken: firstTokenTime,
            totalTime,
            chars: complete.length,
            speed: ((complete.length / totalTime) * 1000).toFixed(1),
          });
          console.log('\n');
        },
      );
    } catch (error) {
      console.log(`Error: ${error.message}\n`);
    }
  }

  if (results.length > 0) {
    console.log('\n--- Speed Comparison ---');
    console.log('Provider | First Token | Total Time | Speed (chars/sec)');
    console.log('---------|-------------|------------|------------------');
    results.forEach((r) => {
      console.log(
        `${r.provider.padEnd(8)} | ${(r.firstToken + 'ms').padEnd(11)} | ${(r.totalTime + 'ms').padEnd(10)} | ${r.speed}`,
      );
    });
  }
}

async function demonstrateStreamingFormats() {
  console.log('=== Different Streaming Formats ===\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log('Skipping: OpenAI API key required\n');
    return;
  }

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Example 1: Character by character
  console.log('1. Character-by-character display:\n');

  await service.processChat(
    [{ role: 'user', content: 'Count from 1 to 5.' }],
    (partial) => {
      // Simulate typewriter effect
      for (const char of partial) {
        process.stdout.write(char);
      }
    },
    async () => console.log('\n'),
  );

  // Example 2: Word by word
  console.log('\n2. Word-by-word display:\n');

  let wordBuffer = '';
  await service.processChat(
    [{ role: 'user', content: 'List three programming languages.' }],
    (partial) => {
      wordBuffer += partial;
      const words = wordBuffer.split(/(\s+)/);

      // Print complete words
      while (words.length > 1) {
        process.stdout.write(words.shift());
      }
      wordBuffer = words[0] || '';
    },
    async () => {
      if (wordBuffer) process.stdout.write(wordBuffer);
      console.log('\n');
    },
  );

  // Example 3: Line by line
  console.log('\n3. Line-by-line display:\n');

  let lineBuffer = '';
  await service.processChat(
    [{ role: 'user', content: 'Write a haiku about streaming data.' }],
    (partial) => {
      lineBuffer += partial;
      const lines = lineBuffer.split('\n');

      // Print complete lines
      while (lines.length > 1) {
        console.log('> ' + lines.shift());
      }
      lineBuffer = lines[0];
    },
    async () => {
      if (lineBuffer) console.log('> ' + lineBuffer);
      console.log();
    },
  );
}

async function demonstrateStreamingEmotions() {
  console.log('=== Streaming with Emotion Detection ===\n');

  const { textToScreenplay } = require('../../dist/cjs/index.js');

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt =
    'Tell me a story with different emotions. Use [happy], [sad], [excited] tags.';
  console.log(`Prompt: "${prompt}"\n`);

  let fullResponse = '';
  let currentEmotion = 'neutral';

  await service.processChat(
    [
      {
        role: 'system',
        content:
          'Include emotion tags like [happy], [sad], [excited] in your response.',
      },
      { role: 'user', content: prompt },
    ],
    (partial) => {
      fullResponse += partial;

      // Check for emotion changes
      const screenplay = textToScreenplay(fullResponse);
      if (screenplay.emotion && screenplay.emotion !== currentEmotion) {
        currentEmotion = screenplay.emotion;
        process.stdout.write(`\n[Emotion: ${currentEmotion}] `);
      }

      // Remove emotion tags from display
      const cleanPartial = partial.replace(/\[\w+\]/g, '');
      process.stdout.write(cleanPartial);
    },
    async () => {
      console.log(
        '\n\nDetected emotions in story:',
        [...new Set(fullResponse.match(/\[\w+\]/g) || [])].join(', '),
      );
    },
  );
}

async function main() {
  console.log('=== Streaming Response Examples ===\n');
  console.log('This example demonstrates various streaming capabilities.\n');

  if (
    !process.env.OPENAI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.GOOGLE_API_KEY
  ) {
    console.error('❌ Please set at least one API key:');
    console.log('- OPENAI_API_KEY');
    console.log('- ANTHROPIC_API_KEY');
    console.log('- GOOGLE_API_KEY');
    return;
  }

  try {
    if (process.env.OPENAI_API_KEY) {
      await demonstrateBasicStreaming();
      console.log('\n' + '='.repeat(50) + '\n');

      await demonstrateStreamingWithProgress();
      console.log('\n' + '='.repeat(50) + '\n');
    }

    await compareProviderSpeeds();
    console.log('\n' + '='.repeat(50) + '\n');

    if (process.env.OPENAI_API_KEY) {
      await demonstrateStreamingFormats();
      console.log('\n' + '='.repeat(50) + '\n');

      await demonstrateStreamingEmotions();
    }

    console.log('\n=== Streaming Examples Complete ===');
    console.log('\nKey Points:');
    console.log('- Streaming provides real-time feedback');
    console.log('- Different providers have different speeds');
    console.log('- You can process streams in various formats');
    console.log('- Emotion detection works with streaming');
    console.log('- Consider UX when displaying streamed content');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main().catch(console.error);
