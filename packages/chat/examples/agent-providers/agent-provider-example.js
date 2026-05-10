#!/usr/bin/env node
/**
 * agent provider example.
 *
 * Prerequisites:
 * - Build @aituber-onair/chat first.
 * - Install the agent SDK package required by the selected provider.
 * - Authenticate the selected SDK in your local environment.
 */
const { createAgentChatService } = require('../../dist/cjs/agent.js');

const providerAliases = {
  codex: 'codex-sdk',
  'codex-sdk': 'codex-sdk',
  copilot: 'copilot-sdk',
  'copilot-sdk': 'copilot-sdk',
};

const providerInput = process.argv[2];
const provider = providerAliases[providerInput];
const prompt =
  process.argv.slice(3).join(' ').trim() ||
  'Say hello from the selected SDK provider in one concise sentence.';

if (!provider) {
  console.log('Usage:');
  console.log('  node agent-provider-example.js codex "Say hello"');
  console.log('  node agent-provider-example.js copilot "Say hello"');
  process.exit(1);
}

function buildOptions(providerName) {
  if (providerName === 'copilot-sdk') {
    const options = {
      model: process.env.COPILOT_SDK_MODEL || 'gpt-4.1',
      responseLength: 'short',
    };

    if (process.env.COPILOT_SDK_APPROVE_ALL_PERMISSIONS === '1') {
      options.onPermissionRequest = () => ({ kind: 'approve-once' });
    }

    return options;
  }

  return {
    model: process.env.CODEX_SDK_MODEL,
    responseLength: 'short',
    workingDirectory: process.cwd(),
    skipGitRepoCheck: true,
  };
}

async function main() {
  const service = createAgentChatService(provider, buildOptions(provider));

  console.log('=== AITuber OnAir Chat - Agent Provider ===\n');
  console.log(`provider: ${provider}`);
  console.log(`model: ${service.getModel()}`);
  console.log(`prompt: ${prompt}\n`);

  const result = await service.chatOnce(
    [
      {
        role: 'system',
        content: 'You are a concise assistant.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    true,
    (partial) => process.stdout.write(partial),
  );

  const text = result.blocks
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('');

  if (!text) {
    console.log('\nNo text response was returned.');
  }

  console.log('\n\nDone.');
}

main().catch((error) => {
  console.error('\nagent provider example failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
