/**
 * Vision chat example for @aituber-onair/chat
 * Demonstrates image analysis capabilities with vision-enabled models
 */
const { ChatServiceFactory } = require('../../dist/cjs/index.js');
const fs = require('node:fs').promises;
const path = require('node:path');

async function analyzeLocalImage() {
  console.log('=== Local Image Analysis ===\n');

  // Create a simple test image (base64 encoded 1x1 red pixel)
  const testImageBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log('Using model:', service.getVisionModel());
  console.log('Analyzing test image...\n');

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'This is a test image. What color is it?',
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${testImageBase64}`,
            detail: 'low',
          },
        },
      ],
    },
  ];

  await service.processVisionChat(
    messages,
    (partial) => process.stdout.write(partial),
    async () => console.log('\n'),
  );
}

async function analyzeImageWithDetail() {
  console.log('=== Image Detail Levels ===\n');

  // Using a placeholder image URL (you can replace with an actual image)
  const imageUrl =
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg';

  const detailLevels = ['low', 'high', 'auto'];

  for (const provider of ['openai', 'claude']) {
    if (
      !process.env[
        provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'
      ]
    ) {
      console.log(`\nSkipping ${provider} (no API key)\n`);
      continue;
    }

    console.log(`\n--- ${provider.toUpperCase()} Vision ---`);

    const service = ChatServiceFactory.createChatService(provider, {
      apiKey:
        process.env[
          provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'
        ],
    });

    console.log(`Model: ${service.getVisionModel()}\n`);

    for (const detail of detailLevels) {
      if (provider === 'claude' && detail !== 'auto') continue; // Claude doesn't support detail levels

      console.log(`Detail level: ${detail}`);

      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in one sentence.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: detail,
              },
            },
          ],
        },
      ];

      try {
        await service.processVisionChat(
          messages,
          (partial) => process.stdout.write(partial),
          async () => console.log('\n'),
        );
      } catch (error) {
        console.log(`Error: ${error.message}\n`);
      }
    }
  }
}

async function multiImageAnalysis() {
  console.log('=== Multiple Images Analysis ===\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log('Skipping: OpenAI API key required\n');
    return;
  }

  const service = ChatServiceFactory.createChatService('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    responseLength: 'medium',
  });

  // Create two different test images
  const redPixel =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const bluePixel =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Compare these two images. What colors do you see?',
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${redPixel}`,
            detail: 'low',
          },
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${bluePixel}`,
            detail: 'low',
          },
        },
      ],
    },
  ];

  console.log('Analyzing multiple images...\n');

  await service.processVisionChat(
    messages,
    (partial) => process.stdout.write(partial),
    async () => console.log('\n'),
  );
}

async function visionWithContext() {
  console.log('=== Vision with Context ===\n');

  const providers = [
    { name: 'openai', envKey: 'OPENAI_API_KEY' },
    { name: 'claude', envKey: 'ANTHROPIC_API_KEY' },
    { name: 'gemini', envKey: 'GOOGLE_API_KEY' },
  ];

  const imageUrl =
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/402px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg';

  for (const provider of providers) {
    if (!process.env[provider.envKey]) {
      console.log(`\nSkipping ${provider.name} (no API key)`);
      continue;
    }

    console.log(`\n--- ${provider.name.toUpperCase()} ---`);

    try {
      const service = ChatServiceFactory.createChatService(provider.name, {
        apiKey: process.env[provider.envKey],
        responseLength: 'short',
      });

      const messages = [
        {
          role: 'system',
          content: 'You are an art historian. Be concise but insightful.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What makes this painting famous?',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ];

      await service.processVisionChat(
        messages,
        (partial) => process.stdout.write(partial),
        async () => console.log('\n'),
      );
    } catch (error) {
      console.log(`Error: ${error.message}\n`);
    }
  }
}

async function main() {
  console.log('=== Vision Chat Examples ===\n');
  console.log('This example demonstrates image analysis capabilities.\n');

  if (
    !process.env.OPENAI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.GOOGLE_API_KEY
  ) {
    console.error('❌ Please set at least one API key:');
    console.log('- OPENAI_API_KEY for GPT-4 Vision');
    console.log('- ANTHROPIC_API_KEY for Claude 3 Vision');
    console.log('- GOOGLE_API_KEY for Gemini Pro Vision');
    return;
  }

  try {
    await analyzeLocalImage();
    console.log('\n' + '='.repeat(50) + '\n');

    await analyzeImageWithDetail();
    console.log('\n' + '='.repeat(50) + '\n');

    await multiImageAnalysis();
    console.log('\n' + '='.repeat(50) + '\n');

    await visionWithContext();

    console.log('\n=== Vision Examples Complete ===');
    console.log('\nKey Points:');
    console.log('- All major providers support vision capabilities');
    console.log('- Images can be provided as base64 or URLs');
    console.log('- Detail levels affect token usage and accuracy');
    console.log('- Multiple images can be analyzed together');
    console.log('- Context and system prompts work with vision');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main().catch(console.error);
