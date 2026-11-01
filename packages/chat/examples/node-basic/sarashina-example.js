#!/usr/bin/env node

const {
  ChatServiceFactory,
  MODEL_SARASHINA_3_NANO,
  MODEL_SARASHINA_3_2_MINI_THINKING,
  SARASHINA_SUPPORTED_MODELS,
} = require('../../dist/cjs/index.js');

async function main() {
  const apiKey = process.env.SARASHINA_API_KEY;
  if (!apiKey) throw new Error('Please set SARASHINA_API_KEY.');
  const model = process.env.SARASHINA_MODEL || MODEL_SARASHINA_3_NANO;
  if (!SARASHINA_SUPPORTED_MODELS.includes(model)) {
    throw new Error(
      `Choose a chat model: ${SARASHINA_SUPPORTED_MODELS.join(', ')}`,
    );
  }
  const service = ChatServiceFactory.createChatService('sarashina', {
    apiKey,
    model,
    baseUrl: process.env.SARASHINA_BASE_URL,
    responseLength:
      model === MODEL_SARASHINA_3_2_MINI_THINKING ? 'deep' : 'short',
    reasoning_effort: process.env.SARASHINA_REASONING_EFFORT,
  });
  const history = [
    {
      role: 'system',
      content: 'You are a concise assistant. Reply in one short sentence.',
    },
    { role: 'user', content: 'Say hello in Japanese.' },
  ];
  console.log(`Sarashina: ${service.getModel()}`);
  const completion = await service.chatOnce(history, true, (text) =>
    process.stdout.write(text),
  );
  console.log();
  if (process.argv.includes('--continue') && completion.assistant_message) {
    // Keep the opaque encrypted state unchanged; never print or decode it.
    history.push(completion.assistant_message, {
      role: 'user',
      content: 'Now say goodbye in Japanese.',
    });
    await service.chatOnce(history, true, (text) => process.stdout.write(text));
    console.log();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
