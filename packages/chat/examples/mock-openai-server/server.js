#!/usr/bin/env node

const http = require('node:http');

const DEFAULT_PORT = 18080;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_API_KEY = 'test-key';
const DEFAULT_ERROR_MODEL = 'mock-400';

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

function toText(content) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block && block.type === 'text') {
          return block.text || '';
        }
        if (block && block.type === 'input_text') {
          return block.text || '';
        }
        return '';
      })
      .join(' ')
      .trim();
  }

  return '';
}

function getLastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') {
      return toText(messages[i].content);
    }
  }
  return '';
}

function findRememberedCode(messages) {
  for (const message of messages) {
    if (message?.role !== 'user') continue;
    const text = toText(message.content);
    const matched = text.match(/Remember this code:\s*([A-Za-z0-9_-]+)/i);
    if (matched) {
      return matched[1];
    }
  }
  return 'UNKNOWN';
}

function buildAssistantText(messages) {
  const lastUserText = getLastUserText(messages);

  if (/Return only this token exactly:\s*PONG/i.test(lastUserText)) {
    return 'PONG';
  }

  if (/What code did I ask you to remember\?/i.test(lastUserText)) {
    return findRememberedCode(messages);
  }

  if (/Summarize this in one sentence\./i.test(lastUserText)) {
    return 'It repeatedly explains preserving behavior across OpenAI-compatible APIs.';
  }

  if (/OpenAI-compatible chat APIs/i.test(lastUserText)) {
    return 'They can share one client when endpoint and schema compatibility hold.';
  }

  if (!lastUserText) {
    return 'Mock response';
  }

  return `Mock response: ${lastUserText.slice(0, 60)}`;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });

  res.end(body);
}

function sendSse(res, model, text) {
  const now = Math.floor(Date.now() / 1000);
  const chunks = text.match(/.{1,16}/g) || [text];

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });

  let index = 0;

  const timer = setInterval(() => {
    if (index < chunks.length) {
      const payload = {
        id: 'chatcmpl-mock',
        object: 'chat.completion.chunk',
        created: now,
        model,
        choices: [
          {
            index: 0,
            delta: {
              content: chunks[index],
            },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      index += 1;
      return;
    }

    const donePayload = {
      id: 'chatcmpl-mock',
      object: 'chat.completion.chunk',
      created: now,
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
    };

    res.write(`data: ${JSON.stringify(donePayload)}\n\n`);
    res.write('data: [DONE]\n\n');

    clearInterval(timer);
    res.end();
  }, 20);
}

function validateAuthorization(headers, expectedApiKey) {
  const auth = headers.authorization || '';
  const expected = `Bearer ${expectedApiKey}`;
  return auth === expected;
}

async function createServer() {
  const args = parseArgs(process.argv.slice(2));
  const port = Number(
    args.port || process.env.MOCK_OPENAI_PORT || DEFAULT_PORT,
  );
  const host = args.host || process.env.MOCK_OPENAI_HOST || DEFAULT_HOST;
  const apiKey =
    args.apiKey || process.env.MOCK_OPENAI_API_KEY || DEFAULT_API_KEY;
  const requireAuth = String(
    args.requireAuth || process.env.MOCK_OPENAI_REQUIRE_AUTH || 'true',
  ).toLowerCase();
  const errorModel =
    args.errorModel ||
    process.env.MOCK_OPENAI_ERROR_MODEL ||
    DEFAULT_ERROR_MODEL;

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      res.end();
      return;
    }

    if (req.url === '/health' && req.method === 'GET') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url !== '/v1/chat/completions' || req.method !== 'POST') {
      sendJson(res, 404, {
        error: {
          type: 'invalid_request_error',
          message: 'Not found',
        },
      });
      return;
    }

    if (
      requireAuth !== 'false' &&
      !validateAuthorization(req.headers, apiKey)
    ) {
      sendJson(res, 401, {
        error: {
          type: 'authentication_error',
          message: 'Invalid API key',
        },
      });
      return;
    }

    let payload;
    try {
      payload = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, {
        error: {
          type: 'invalid_request_error',
          message: 'Request body must be valid JSON.',
        },
      });
      return;
    }

    const model = payload.model;
    const messages = Array.isArray(payload.messages) ? payload.messages : [];

    if (!model || typeof model !== 'string') {
      sendJson(res, 400, {
        error: {
          type: 'invalid_request_error',
          message: 'model is required',
        },
      });
      return;
    }

    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      sendJson(res, 400, {
        error: {
          type: 'invalid_request_error',
          message: 'messages must be a non-empty array',
        },
      });
      return;
    }

    if (model === errorModel) {
      sendJson(res, 400, {
        error: {
          type: 'invalid_request_error',
          message: `Forced 400 for model ${errorModel}`,
        },
      });
      return;
    }

    const text = buildAssistantText(messages);

    if (payload.stream) {
      sendSse(res, model, text);
      return;
    }

    const response = {
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };

    sendJson(res, 200, response);
  });

  server.listen(port, host, () => {
    console.log(
      `[mock-openai-server] listening on http://${host}:${port}/v1/chat/completions`,
    );
    console.log(
      `[mock-openai-server] health endpoint: http://${host}:${port}/health`,
    );
  });
}

createServer().catch((error) => {
  console.error('[mock-openai-server:error]', error);
  process.exit(1);
});
