#!/usr/bin/env node

const readline = require('node:readline');
const { ChatServiceFactory } = require('../../dist/cjs/index.js');

function parseArgs(argv) {
  const parsed = {};

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const withoutPrefix = arg.slice(2);
    const [key, ...rest] = withoutPrefix.split('=');
    if (!key) continue;
    parsed[key] = rest.length > 0 ? rest.join('=') : 'true';
  }

  return parsed;
}

function usage() {
  console.log('Local LLM CLI');
  console.log('(for OpenAI-compatible local/self-hosted endpoints)');
  console.log('');
  console.log('Usage:');
  console.log('  node packages/chat/examples/local-llm-cli/index.js \\');
  console.log('    --endpoint="http://127.0.0.1:11434/v1/chat/completions" \\');
  console.log('    --model="your-model" [--apiKey="optional-key"]');
  console.log('    [--systemPrompt="..."] [--stream=false]');
  console.log('');
  console.log('Recommended environment variables:');
  console.log('  LOCAL_LLM_ENDPOINT');
  console.log('  LOCAL_LLM_MODEL');
  console.log('  LOCAL_LLM_API_KEY (optional)');
  console.log('  LOCAL_LLM_SYSTEM_PROMPT (optional)');
  console.log('  LOCAL_LLM_STREAM (optional, true/false)');
  console.log('');
  console.log('Legacy aliases are also supported:');
  console.log(
    '  OPENAI_COMPAT_ENDPOINT / OPENAI_COMPAT_MODEL / OPENAI_COMPAT_API_KEY',
  );
}

function buildConfig() {
  const args = parseArgs(process.argv.slice(2));

  const endpoint =
    args.endpoint ||
    process.env.LOCAL_LLM_ENDPOINT ||
    process.env.OPENAI_COMPAT_ENDPOINT;
  const model =
    args.model ||
    process.env.LOCAL_LLM_MODEL ||
    process.env.OPENAI_COMPAT_MODEL;
  const apiKey =
    args.apiKey ||
    process.env.LOCAL_LLM_API_KEY ||
    process.env.OPENAI_COMPAT_API_KEY ||
    'dummy-key';
  const hasSystemPromptArg = Object.prototype.hasOwnProperty.call(
    args,
    'systemPrompt',
  );
  const systemPromptFromEnv =
    process.env.LOCAL_LLM_SYSTEM_PROMPT ??
    process.env.OPENAI_COMPAT_SYSTEM_PROMPT;
  const systemPrompt = hasSystemPromptArg
    ? args.systemPrompt
    : (systemPromptFromEnv ?? '');
  const stream = parseBoolean(
    args.stream || process.env.LOCAL_LLM_STREAM,
    true,
  );

  return {
    endpoint,
    model,
    apiKey,
    systemPrompt,
    stream,
  };
}

function parseBoolean(value, fallback) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

async function run() {
  const config = buildConfig();
  if (!config.endpoint || !config.model) {
    usage();
    process.exit(1);
  }

  const service = ChatServiceFactory.createChatService('openai-compatible', {
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    model: config.model,
  });

  const history = [];
  if (config.systemPrompt) {
    history.push({ role: 'system', content: config.systemPrompt });
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  console.log('Connected');
  console.log(`endpoint: ${config.endpoint}`);
  console.log(`model: ${config.model}`);
  console.log('Type /exit to quit.');
  console.log('');
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === '/exit') {
      rl.close();
      return;
    }

    history.push({ role: 'user', content: input });

    let streamed = '';
    process.stdout.write('assistant> ');

    try {
      const result = await service.chatOnce(history, config.stream, (chunk) => {
        streamed += chunk;
        process.stdout.write(chunk);
      });

      if (!streamed.trim()) {
        const fallback = result.blocks
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('');
        process.stdout.write(fallback);
        streamed = fallback;
      }

      process.stdout.write('\n');
      history.push({ role: 'assistant', content: streamed });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stdout.write(`\n[error] ${message}\n`);
      if (error && typeof error === 'object' && 'body' in error && error.body) {
        process.stdout.write(`[error body] ${String(error.body)}\n`);
      }
      history.pop();
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('bye');
  });
}

run().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : error;
  console.error(message);
  process.exit(1);
});
