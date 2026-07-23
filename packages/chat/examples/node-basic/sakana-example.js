#!/usr/bin/env node

const {
  ChatServiceFactory,
  MODEL_FUGU,
  MODEL_FUGU_ULTRA,
  MODEL_FUGU_ULTRA_20260615,
} = require('../../dist/cjs/index.js');

const SUPPORTED_MODELS = [
  MODEL_FUGU,
  MODEL_FUGU_ULTRA,
  MODEL_FUGU_ULTRA_20260615,
];

const args = new Set(process.argv.slice(2));
const runAllModels = args.has('--all');

const apiKey = process.env.FUGU_API_KEY;
const baseUrl = process.env.FUGU_BASE_URL;
const requestedModel = process.env.FUGU_MODEL || MODEL_FUGU;
const models = runAllModels ? SUPPORTED_MODELS : [requestedModel];

const messages = [
  {
    role: 'system',
    content:
      'You are a concise assistant for an AI character streaming app. Reply in one short sentence.',
  },
  {
    role: 'user',
    content: 'Say hello and mention that Fugu is connected.',
  },
];

function getResponseLengthForModel(model) {
  return model === MODEL_FUGU ? 'veryShort' : 'medium';
}

async function runModel(model) {
  if (!SUPPORTED_MODELS.includes(model)) {
    throw new Error(
      `Unsupported model "${model}". Use one of: ${SUPPORTED_MODELS.join(
        ', ',
      )}`,
    );
  }

  const responseLength = getResponseLengthForModel(model);
  const service = ChatServiceFactory.createChatService('sakana', {
    apiKey,
    model,
    baseUrl,
    responseLength,
  });

  console.log(`\n=== Sakana AI: ${service.getModel()} ===\n`);
  console.log(`Response length preset: ${responseLength}\n`);

  let streamed = '';
  await service.processChat(
    messages,
    (partial) => {
      streamed += partial;
      process.stdout.write(partial);
    },
    async (complete) => {
      console.log('\n');
      console.log(`Completed: ${complete.length} chars`);
    },
  );

  if (!streamed) {
    console.log('No streaming text was received.');
  }
}

async function main() {
  if (!apiKey) {
    console.error('Please set FUGU_API_KEY.');
    console.error('Example: export FUGU_API_KEY="xxx..."');
    process.exitCode = 1;
    return;
  }

  for (const model of models) {
    await runModel(model);
  }
}

main().catch((error) => {
  console.error('\nError:', error.message);
  process.exitCode = 1;
});
