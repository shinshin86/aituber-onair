#!/usr/bin/env node

import http from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSystemPrompt, DEFAULT_PERSONA } from './system-prompt.js';

const require = createRequire(import.meta.url);
const { ChatServiceFactory } = require('@aituber-onair/chat');

const HOST = '127.0.0.1';
const PORT = Number(process.env.SUPPORT_BOT_PORT || 8787);
const MAX_BODY_BYTES = 1024 * 1024;
const SERVER_DIR = fileURLToPath(new URL('.', import.meta.url));
const EXAMPLE_DIR = resolve(SERVER_DIR, '..');
const DIST_DIR = join(EXAMPLE_DIR, 'dist');
const DATA_DIR = join(SERVER_DIR, 'data');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
const SETTINGS_TEMP_FILE = join(DATA_DIR, 'settings.json.tmp');
const KNOWLEDGE_FILE = join(SERVER_DIR, 'chat-package-knowledge.md');
const DEFAULT_OPENAI_COMPATIBLE_ENDPOINT =
  'http://127.0.0.1:18080/v1/chat/completions';
const EXCLUDED_SERVER_PROVIDERS = new Set([
  'codex-sdk',
  'claude-agent-sdk',
  'copilot-sdk',
  'gemini-nano',
]);

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

const DEFAULT_SETTINGS = {
  provider: 'openai',
  model: 'gpt-5.6-terra',
  apiKey: '',
  endpoint: DEFAULT_OPENAI_COMPATIBLE_ENDPOINT,
  persona: DEFAULT_PERSONA,
};

const packageKnowledge = await readFile(KNOWLEDGE_FILE, 'utf8');

const getProviderIds = () =>
  ChatServiceFactory.getAvailableProviders().filter(
    (provider) => !EXCLUDED_SERVER_PROVIDERS.has(provider),
  );

const getProviderRecords = () =>
  getProviderIds().map((provider) => {
    const models = ChatServiceFactory.getSupportedModels(provider);
    const capabilities = ChatServiceFactory.getProviderCapabilities(provider);

    return {
      provider,
      models,
      defaultModel: capabilities?.defaultModel ?? models[0] ?? '',
      requiresApiKey: provider !== 'openai-compatible',
      supportsCustomEndpoint: provider === 'openai-compatible',
    };
  });

const getDefaultModel = (provider) => {
  const models = ChatServiceFactory.getSupportedModels(provider);
  return (
    ChatServiceFactory.getProviderCapabilities(provider)?.defaultModel ??
    models[0] ??
    ''
  );
};

const normalizeStoredSettings = (candidate) => {
  const availableProviders = getProviderIds();
  const provider = availableProviders.includes(candidate?.provider)
    ? candidate.provider
    : DEFAULT_SETTINGS.provider;
  const models = ChatServiceFactory.getSupportedModels(provider);
  const candidateModel =
    typeof candidate?.model === 'string' ? candidate.model.trim() : '';
  const model =
    provider === 'openai-compatible'
      ? candidateModel || getDefaultModel(provider)
      : models.includes(candidateModel)
        ? candidateModel
        : provider === DEFAULT_SETTINGS.provider &&
            models.includes(DEFAULT_SETTINGS.model)
          ? DEFAULT_SETTINGS.model
          : getDefaultModel(provider);

  return {
    provider,
    model,
    apiKey:
      typeof candidate?.apiKey === 'string' ? candidate.apiKey.trim() : '',
    endpoint:
      typeof candidate?.endpoint === 'string' && candidate.endpoint.trim()
        ? candidate.endpoint.trim()
        : DEFAULT_SETTINGS.endpoint,
    persona:
      typeof candidate?.persona === 'string' && candidate.persona.trim()
        ? candidate.persona.trim()
        : DEFAULT_PERSONA,
  };
};

const loadSettings = async () => {
  try {
    return normalizeStoredSettings(
      JSON.parse(await readFile(SETTINGS_FILE, 'utf8')),
    );
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('Support settings could not be loaded; using defaults.');
    }
    return { ...DEFAULT_SETTINGS };
  }
};

let settings = await loadSettings();

const persistSettings = async (nextSettings) => {
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  await writeFile(
    SETTINGS_TEMP_FILE,
    `${JSON.stringify(nextSettings, null, 2)}\n`,
    { mode: 0o600 },
  );
  await rename(SETTINGS_TEMP_FILE, SETTINGS_FILE);
};

const isConfigured = (candidate) => {
  if (!getProviderIds().includes(candidate.provider)) return false;
  if (!candidate.model) return false;

  const models = ChatServiceFactory.getSupportedModels(candidate.provider);
  if (
    candidate.provider !== 'openai-compatible' &&
    !models.includes(candidate.model)
  ) {
    return false;
  }

  if (candidate.provider === 'openai-compatible') {
    return Boolean(candidate.endpoint);
  }

  return Boolean(candidate.apiKey);
};

const maskApiKey = (apiKey) => {
  if (!apiKey) return '';
  if (apiKey.length <= 4) return '••••';
  return `${apiKey.slice(0, Math.min(3, apiKey.length - 4))}…${apiKey.slice(-4)}`;
};

const adminSettingsResponse = () => ({
  provider: settings.provider,
  model: settings.model,
  apiKey: maskApiKey(settings.apiKey),
  hasApiKey: Boolean(settings.apiKey),
  endpoint: settings.endpoint,
  persona: settings.persona,
});

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
};

const readJsonBody = (req) =>
  new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejectBody(new Error('Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch {
        rejectBody(new Error('Request body must be valid JSON.'));
      }
    });

    req.on('error', rejectBody);
  });

const validateChatPayload = (payload) => {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    Object.keys(payload).some((key) => key !== 'messages') ||
    !Array.isArray(payload.messages) ||
    payload.messages.length === 0
  ) {
    throw new Error('messages must be a non-empty array.');
  }

  const messages = payload.messages.map((message) => {
    if (
      !message ||
      typeof message !== 'object' ||
      Array.isArray(message) ||
      Object.keys(message).some((key) => key !== 'role' && key !== 'content') ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string' ||
      !message.content.trim()
    ) {
      throw new Error(
        'Each message must contain only a user/assistant role and text content.',
      );
    }

    return { role: message.role, content: message.content.trim() };
  });

  if (messages.at(-1)?.role !== 'user') {
    throw new Error('The final message must have the user role.');
  }

  return messages;
};

const validateSettingsPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Settings must be a JSON object.');
  }

  const allowedKeys = new Set([
    'provider',
    'model',
    'apiKey',
    'endpoint',
    'persona',
  ]);
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
    throw new Error('Settings contain an unsupported field.');
  }

  if (
    typeof payload.provider !== 'string' ||
    !getProviderIds().includes(payload.provider)
  ) {
    throw new Error('Select a registered server provider.');
  }

  if (typeof payload.model !== 'string' || !payload.model.trim()) {
    throw new Error('Model is required.');
  }

  const provider = payload.provider;
  const model = payload.model.trim();
  const models = ChatServiceFactory.getSupportedModels(provider);
  if (provider !== 'openai-compatible' && !models.includes(model)) {
    throw new Error('Select a model registered for this provider.');
  }

  for (const key of ['apiKey', 'endpoint', 'persona']) {
    if (payload[key] !== undefined && typeof payload[key] !== 'string') {
      throw new Error(`${key} must be text when provided.`);
    }
  }

  const endpoint =
    payload.endpoint?.trim() || settings.endpoint || DEFAULT_SETTINGS.endpoint;
  if (provider === 'openai-compatible') {
    try {
      const parsedEndpoint = new URL(endpoint);
      if (!['http:', 'https:'].includes(parsedEndpoint.protocol)) {
        throw new Error();
      }
    } catch {
      throw new Error('Enter a valid HTTP(S) chat completions endpoint.');
    }
  }

  return {
    provider,
    model,
    apiKey: payload.apiKey?.trim() || settings.apiKey,
    endpoint,
    persona: payload.persona?.trim() || settings.persona || DEFAULT_PERSONA,
  };
};

const createChatService = (currentSettings) => {
  const options = {
    model: currentSettings.model,
    responseLength: 'short',
  };

  if (currentSettings.apiKey) options.apiKey = currentSettings.apiKey;
  if (currentSettings.provider === 'openai') options.gpt5Preset = 'casual';
  if (currentSettings.provider === 'openai-compatible') {
    options.endpoint = currentSettings.endpoint;
  }

  return ChatServiceFactory.createChatService(
    currentSettings.provider,
    options,
  );
};

const handleSupportChat = async (req, res) => {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  let messages;
  try {
    messages = validateChatPayload(payload);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const currentSettings = { ...settings };
  if (!isConfigured(currentSettings)) {
    sendJson(res, 503, { error: 'The support assistant is not configured.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
  });
  res.flushHeaders?.();

  let completed = false;
  let streamedText = '';
  const writeEvent = (event) => {
    if (!res.destroyed && !res.writableEnded) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };

  try {
    const service = createChatService(currentSettings);
    await service.processChat(
      [
        {
          role: 'system',
          content: buildSystemPrompt(currentSettings.persona, packageKnowledge),
        },
        ...messages,
      ],
      (delta) => {
        streamedText += delta;
        writeEvent({ delta });
      },
      async (text) => {
        completed = true;
        writeEvent({ done: true, text });
        res.end();
      },
    );

    if (!completed && !res.writableEnded) {
      writeEvent({ done: true, text: streamedText });
      res.end();
    }
  } catch (error) {
    console.error('Support provider request failed:', error);
    if (!res.writableEnded) {
      writeEvent({
        error: 'The provider request failed. Check the server configuration.',
      });
      res.end();
    }
  }
};

const serveStatic = async (pathname, req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(res, 400, { error: 'Invalid path.' });
    return;
  }

  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const candidate = resolve(DIST_DIR, `.${requestedPath}`);
  const insideDist =
    candidate === DIST_DIR || candidate.startsWith(`${DIST_DIR}${sep}`);

  if (!insideDist) {
    sendJson(res, 404, { error: 'Not found.' });
    return;
  }

  let filePath = candidate;
  try {
    if (!(await stat(filePath)).isFile()) throw new Error('Not a file');
  } catch {
    if (extname(decodedPath)) {
      sendJson(res, 404, { error: 'Not found.' });
      return;
    }
    filePath = join(DIST_DIR, 'index.html');
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type':
        MIME_TYPES.get(extname(filePath).toLowerCase()) ||
        'application/octet-stream',
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    sendJson(res, 404, {
      error: 'Frontend build not found. Run npm run build first.',
    });
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      Allow: 'GET, HEAD, POST, PUT, OPTIONS',
      'Cache-Control': 'no-store',
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/support/status' && req.method === 'GET') {
    sendJson(res, 200, { configured: isConfigured(settings) });
    return;
  }

  if (url.pathname === '/api/support/chat' && req.method === 'POST') {
    await handleSupportChat(req, res);
    return;
  }

  if (url.pathname === '/api/admin/providers' && req.method === 'GET') {
    sendJson(res, 200, { providers: getProviderRecords() });
    return;
  }

  if (url.pathname === '/api/admin/settings' && req.method === 'GET') {
    sendJson(res, 200, adminSettingsResponse());
    return;
  }

  if (url.pathname === '/api/admin/settings' && req.method === 'PUT') {
    try {
      const payload = await readJsonBody(req);
      const nextSettings = validateSettingsPayload(payload);
      await persistSettings(nextSettings);
      settings = nextSettings;
      sendJson(res, 200, adminSettingsResponse());
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    sendJson(res, 404, { error: 'API route not found.' });
    return;
  }

  await serveStatic(url.pathname, req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Support bot server listening on http://${HOST}:${PORT}`);
});
