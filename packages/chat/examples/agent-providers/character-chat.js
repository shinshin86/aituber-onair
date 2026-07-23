#!/usr/bin/env node
/**
 * Lightweight AI character chat CLI using the experimental Codex SDK provider.
 *
 * Prerequisites:
 * - Build @aituber-onair/chat first.
 * - Install @openai/codex-sdk in the local project.
 * - Authenticate Codex in your local environment.
 */
const readline = require('node:readline/promises');

const DEFAULT_CHARACTER_NAME = 'ミコ';
const MAX_HISTORY_MESSAGES = 12;

function parseArgs(argv) {
  const parsed = { positional: [] };

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      parsed.positional.push(arg);
      continue;
    }

    const withoutPrefix = arg.slice(2);
    const [key, ...rest] = withoutPrefix.split('=');
    if (!key) continue;
    parsed[key] = rest.length > 0 ? rest.join('=') : 'true';
  }

  return parsed;
}

function usage() {
  console.log('Codex Character Chat');
  console.log('(experimental CLI AI character chat using @openai/codex-sdk)');
  console.log('');
  console.log('Usage:');
  console.log(
    '  node packages/chat/examples/agent-providers/character-chat.js',
  );
  console.log(
    '  node packages/chat/examples/agent-providers/character-chat.js --once="こんにちは"',
  );
  console.log(
    '  node packages/chat/examples/agent-providers/character-chat.js "短く自己紹介して"',
  );
  console.log('');
  console.log('Options:');
  console.log('  --name="ミコ"');
  console.log('  --systemPrompt="You are ..."');
  console.log('  --model="<codex model id>"');
  console.log('  --workingDirectory="/path/to/project"');
  console.log('  --skipGitRepoCheck=false');
  console.log('  --responseLength="short"');
  console.log('  --help');
  console.log('');
  console.log('Environment variables:');
  console.log('  CODEX_CHARACTER_NAME');
  console.log('  CODEX_CHARACTER_SYSTEM_PROMPT');
  console.log('  CODEX_SDK_MODEL');
  console.log('  CODEX_WORKING_DIRECTORY');
  console.log('  CODEX_SKIP_GIT_REPO_CHECK');
  console.log('  CODEX_RESPONSE_LENGTH');
}

function parseBoolean(value, fallback) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function defaultSystemPrompt(characterName) {
  return [
    `You are ${characterName}, an AI character for a live chat experience.`,
    'Reply in Japanese unless the user asks for another language.',
    'Keep replies warm, concise, and conversational.',
    'Ask a short follow-up question when it helps the conversation continue.',
    'This example is text-only, so do not claim to control voice, images, or a visible avatar.',
  ].join(' ');
}

function buildConfig() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true') {
    usage();
    process.exit(0);
  }

  const characterName =
    args.name || process.env.CODEX_CHARACTER_NAME || DEFAULT_CHARACTER_NAME;
  const systemPrompt =
    args.systemPrompt ||
    process.env.CODEX_CHARACTER_SYSTEM_PROMPT ||
    defaultSystemPrompt(characterName);
  const oneShotPrompt = args.once || args.positional.join(' ').trim();

  return {
    characterName,
    systemPrompt,
    oneShotPrompt,
    model: args.model || process.env.CODEX_SDK_MODEL,
    responseLength:
      args.responseLength || process.env.CODEX_RESPONSE_LENGTH || 'short',
    workingDirectory:
      args.workingDirectory ||
      process.env.CODEX_WORKING_DIRECTORY ||
      process.cwd(),
    skipGitRepoCheck: parseBoolean(
      args.skipGitRepoCheck || process.env.CODEX_SKIP_GIT_REPO_CHECK,
      true,
    ),
  };
}

function loadAgentFactory() {
  try {
    return require('../../dist/cjs/agent.js');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      'Failed to load @aituber-onair/chat/agent. Build the chat package first with `npm -w @aituber-onair/chat run build`.\n\n' +
        detail,
    );
  }
}

function createInitialHistory(systemPrompt) {
  return [{ role: 'system', content: systemPrompt }];
}

function trimHistory(messages) {
  const [systemMessage, ...rest] = messages;
  return [systemMessage, ...rest.slice(-MAX_HISTORY_MESSAGES)];
}

function extractText(result) {
  return result.blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function sendMessage(service, history, characterName, input) {
  history.push({ role: 'user', content: input });

  let streamed = '';
  process.stdout.write(`${characterName}> `);

  try {
    const result = await service.chatOnce(history, true, (chunk) => {
      streamed += chunk;
      process.stdout.write(chunk);
    });

    const text = extractText(result);
    if (!streamed.trim() && text) {
      streamed = text;
      process.stdout.write(text);
    }

    process.stdout.write('\n');
    history.push({ role: 'assistant', content: streamed || text });
    return trimHistory(history);
  } catch (error) {
    history.pop();
    process.stdout.write('\n');
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[error] ${message}`);
    return history;
  }
}

async function main() {
  const config = buildConfig();
  const { createAgentChatService } = loadAgentFactory();
  const service = createAgentChatService('codex-sdk', {
    model: config.model,
    responseLength: config.responseLength,
    workingDirectory: config.workingDirectory,
    skipGitRepoCheck: config.skipGitRepoCheck,
  });

  let history = createInitialHistory(config.systemPrompt);

  // When no model is configured, the Codex SDK falls back to the model
  // selected by your local Codex CLI/account, so the actual name is not known
  // on the client side. Only show a concrete model name when it was set
  // explicitly; otherwise make it clear the SDK default is used.
  const modelLabel = config.model
    ? service.getModel()
    : 'Codex CLI default (set --model or CODEX_SDK_MODEL to override)';

  console.log('=== Codex Character Chat ===');
  console.log(`character: ${config.characterName}`);
  console.log(`provider: codex-sdk`);
  console.log(`model: ${modelLabel}`);
  console.log(`workingDirectory: ${config.workingDirectory}`);
  console.log('');

  if (config.oneShotPrompt) {
    await sendMessage(
      service,
      history,
      config.characterName,
      config.oneShotPrompt,
    );
    return;
  }

  console.log('Type /exit to quit. Type /reset to clear conversation history.');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const input = (await rl.question('you> ')).trim();

    if (!input) continue;
    if (input === '/exit' || input === '/quit') break;

    if (input === '/reset') {
      history = createInitialHistory(config.systemPrompt);
      console.log('Conversation history was reset.');
      continue;
    }

    history = await sendMessage(service, history, config.characterName, input);
  }

  rl.close();
  console.log('bye');
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : error;
  console.error(message);
  process.exit(1);
});
