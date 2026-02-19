#!/usr/bin/env node

const {
  ChatServiceFactory,
  ChatServiceHttpClient,
  runOnceText,
} = require('../../dist/cjs/index.js');

const DEFAULTS = {
  endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
  apiKey: 'test-key',
  model: 'mock-chat-model',
  stream: true,
  errorModel: 'mock-400',
};

class SkipTestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SkipTestError';
  }
}

function parseArgs(argv) {
  const parsed = {};

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const withoutPrefix = arg.slice(2);
    const [key, ...rest] = withoutPrefix.split('=');
    if (!key) continue;

    const value = rest.length > 0 ? rest.join('=') : 'true';
    parsed[key] = value;
  }

  return parsed;
}

function parseBoolean(value, fallback) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return fallback;
}

function getConfig() {
  const args = parseArgs(process.argv.slice(2));

  const endpoint =
    args.endpoint || process.env.COMPAT_ENDPOINT || DEFAULTS.endpoint;
  const apiKey = args.apiKey || process.env.COMPAT_API_KEY || DEFAULTS.apiKey;
  const model = args.model || process.env.COMPAT_MODEL || DEFAULTS.model;
  const errorModel =
    args.errorModel || process.env.COMPAT_ERROR_MODEL || DEFAULTS.errorModel;

  const stream = parseBoolean(
    args.stream || process.env.COMPAT_STREAM,
    DEFAULTS.stream,
  );

  return {
    endpoint,
    apiKey,
    model,
    stream,
    errorModel,
  };
}

function createService(config, overrides = {}) {
  return ChatServiceFactory.createChatService('openai-compatible', {
    apiKey: config.apiKey,
    model: overrides.model || config.model,
    endpoint: config.endpoint,
  });
}

function textFromBlocks(blocks) {
  return blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function shortText(text, maxLength = 80) {
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

async function runProbe() {
  const config = getConfig();

  console.log('OpenAI Compatible Probe');
  console.log(`endpoint: ${config.endpoint}`);
  console.log(`model: ${config.model}`);
  console.log(`stream test: ${config.stream ? 'enabled' : 'disabled'}`);
  console.log('');

  const results = [];

  async function runTest(id, name, fn) {
    const startedAt = Date.now();

    try {
      const detail = await fn();
      const durationMs = Date.now() - startedAt;
      results.push({ id, name, status: 'PASS', durationMs, detail });
      console.log(`[PASS] ${id} ${name} (${durationMs}ms)`);
      if (detail) {
        console.log(`       ${detail}`);
      }
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      if (error instanceof SkipTestError) {
        results.push({
          id,
          name,
          status: 'SKIP',
          durationMs,
          detail: error.message,
        });
        console.log(`[SKIP] ${id} ${name} (${durationMs}ms)`);
        console.log(`       ${error.message}`);
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      results.push({ id, name, status: 'FAIL', durationMs, detail: message });
      console.log(`[FAIL] ${id} ${name} (${durationMs}ms)`);
      console.log(`       ${message}`);
    }
  }

  await runTest('T1', 'Non-stream short response', async () => {
    const service = createService(config);
    const text = await runOnceText(service, [
      {
        role: 'user',
        content: 'Reply with a short response in one sentence.',
      },
    ]);

    if (!text.trim()) {
      throw new Error('Response text is empty.');
    }
    if (text.length > 400) {
      throw new Error(`Response is too long. got=${text.length} chars`);
    }

    return `text=${shortText(text)}`;
  });

  await runTest('T2', 'Streaming completion (SSE)', async () => {
    if (!config.stream) {
      throw new SkipTestError('Streaming probe is disabled by --stream=false');
    }

    const service = createService(config);
    let partial = '';

    const completion = await service.chatOnce(
      [
        {
          role: 'user',
          content: 'Give one short sentence about OpenAI-compatible chat APIs.',
        },
      ],
      true,
      (chunk) => {
        partial += chunk;
      },
    );

    const full = textFromBlocks(completion.blocks);

    if (!partial.trim()) {
      throw new Error('No streaming delta text was received.');
    }
    if (!full.trim()) {
      throw new Error('Streaming completion text is empty.');
    }

    return `partial=${partial.length} chars, full=${full.length} chars`;
  });

  await runTest('T3', 'Conversation history reference', async () => {
    const service = createService(config);
    const text = await runOnceText(service, [
      {
        role: 'user',
        content: 'Remember this code: BLUE-42. Reply exactly "remembered".',
      },
      {
        role: 'assistant',
        content: 'remembered',
      },
      {
        role: 'user',
        content: 'What code did I ask you to remember? Reply with code only.',
      },
    ]);

    if (!/blue-42/i.test(text)) {
      throw new Error(`Conversation context was not referenced. got: ${text}`);
    }

    return `text=${shortText(text)}`;
  });

  await runTest('T4', 'Long input response', async () => {
    const service = createService(config);
    const longBody =
      'OpenAI-compatible APIs should preserve behavior across providers. '.repeat(
        70,
      );

    const text = await runOnceText(service, [
      {
        role: 'user',
        content: `${longBody}\n\nSummarize this in one sentence.`,
      },
    ]);

    if (!text.trim()) {
      throw new Error('Response for long input is empty.');
    }

    return `input=${longBody.length} chars, output=${text.length} chars`;
  });

  await runTest('T5', 'Intentional 4xx error handling', async () => {
    const service = createService(config, { model: config.errorModel });

    try {
      await runOnceText(service, [
        {
          role: 'user',
          content: 'This request should fail with a 4xx error.',
        },
      ]);
      throw new Error(
        `Expected 4xx error, but request succeeded. model=${config.errorModel}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/HTTP 4\d\d|HTTP 401|HTTP 403|HTTP 404/.test(message)) {
        throw new Error(`Expected 4xx error, got: ${message}`);
      }
      return `captured=${shortText(message)}`;
    }
  });

  await runTest('T6', 'Timeout handling (simulated)', async () => {
    const nativeFetch = (url, init) => fetch(url, init);

    ChatServiceHttpClient.setFetch(async () => {
      const timeoutError = new Error('simulated timeout');
      timeoutError.name = 'AbortError';
      throw timeoutError;
    });

    const service = createService(config);

    try {
      await runOnceText(service, [
        {
          role: 'user',
          content: 'This request should trigger timeout handling.',
        },
      ]);
      throw new Error('Expected timeout error, but request succeeded.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/timeout/i.test(message)) {
        throw new Error(`Expected timeout error, got: ${message}`);
      }
      return `captured=${shortText(message)}`;
    } finally {
      ChatServiceHttpClient.setFetch(nativeFetch);
    }
  });

  const passCount = results.filter((result) => result.status === 'PASS').length;
  const failCount = results.filter((result) => result.status === 'FAIL').length;
  const skipCount = results.filter((result) => result.status === 'SKIP').length;

  console.log('');
  console.log('Summary');
  console.log(`PASS: ${passCount}`);
  console.log(`FAIL: ${failCount}`);
  console.log(`SKIP: ${skipCount}`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

runProbe().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : error;
  console.error('[probe:error]', message);
  process.exit(1);
});
