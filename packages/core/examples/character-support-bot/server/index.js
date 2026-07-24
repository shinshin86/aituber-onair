#!/usr/bin/env node

import http from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockWav } from './mock-audio.js';
import {
  buildSystemPrompt,
  DEFAULT_PERSONA,
  resolvePersona,
} from './system-prompt.js';

const require = createRequire(import.meta.url);
const { ChatServiceFactory } = require('@aituber-onair/chat');

const HOST = '127.0.0.1';
const PORT = Number(process.env.CHARACTER_SUPPORT_BOT_PORT || 8788);
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_MESSAGE_COUNT = 40;
const MAX_MESSAGE_CHARS = 20_000;
const SERVER_DIR = fileURLToPath(new URL('.', import.meta.url));
const EXAMPLE_DIR = resolve(SERVER_DIR, '..');
const DIST_DIR = join(EXAMPLE_DIR, 'dist');
const DATA_DIR = join(SERVER_DIR, 'data');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
const SETTINGS_TEMP_FILE = join(DATA_DIR, 'settings.json.tmp');
const KNOWLEDGE_FILE = join(SERVER_DIR, 'core-package-knowledge.md');
const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const DEFAULT_COMPATIBLE_CHAT_ENDPOINT =
  'http://127.0.0.1:18080/v1/chat/completions';
const DEFAULT_COMPATIBLE_TTS_ENDPOINT = 'http://127.0.0.1:8880/v1/audio/speech';
const EXCLUDED_SERVER_PROVIDERS = new Set([
  'codex-sdk',
  'claude-agent-sdk',
  'copilot-sdk',
  'gemini-nano',
]);

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-Compatible',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
  claude: 'Claude',
  zai: 'Z.ai',
  xai: 'xAI',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  sakana: 'Sakana AI',
  plamo: 'PLaMo',
};

const TTS_PROVIDERS = [
  {
    provider: 'openai',
    label: 'OpenAI',
    models: ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'],
    voices: [
      'alloy',
      'ash',
      'ballad',
      'coral',
      'echo',
      'fable',
      'nova',
      'onyx',
      'sage',
      'shimmer',
    ],
    defaultModel: 'gpt-4o-mini-tts',
    defaultVoice: 'coral',
    requiresApiKey: true,
    supportsCustomEndpoint: false,
  },
  {
    provider: 'openai-compatible',
    label: 'OpenAI-Compatible',
    models: [],
    voices: [],
    defaultModel: 'tts-1',
    defaultVoice: '',
    requiresApiKey: false,
    supportsCustomEndpoint: true,
  },
  {
    provider: 'mock',
    label: 'Built-in mock (development)',
    models: ['mock-tts'],
    voices: ['miko'],
    defaultModel: 'mock-tts',
    defaultVoice: 'miko',
    requiresApiKey: false,
    supportsCustomEndpoint: false,
    developmentOnly: true,
  },
];

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
  ['.purupuru', 'application/zip'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

const packageKnowledge = await readFile(KNOWLEDGE_FILE, 'utf8');

const getProviderIds = () =>
  ChatServiceFactory.getAvailableProviders().filter(
    (provider) => !EXCLUDED_SERVER_PROVIDERS.has(provider),
  );

const getDefaultModel = (provider) => {
  const models = ChatServiceFactory.getSupportedModels(provider);
  return (
    ChatServiceFactory.getProviderCapabilities(provider)?.defaultModel ??
    models[0] ??
    ''
  );
};

const formatProviderLabel = (provider) =>
  PROVIDER_LABELS[provider] ??
  provider
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getLlmProviderRecords = () =>
  getProviderIds().map((provider) => {
    const models = ChatServiceFactory.getSupportedModels(provider);
    return {
      provider,
      label: formatProviderLabel(provider),
      models,
      defaultModel: getDefaultModel(provider),
      requiresApiKey: provider !== 'openai-compatible',
      supportsCustomEndpoint: provider === 'openai-compatible',
    };
  });

const getTtsProvider = (provider) =>
  TTS_PROVIDERS.find((candidate) => candidate.provider === provider);

const createDefaultSettings = () => ({
  llm: {
    provider: 'openai',
    model: getDefaultModel('openai'),
    apiKey: '',
    endpoint: DEFAULT_COMPATIBLE_CHAT_ENDPOINT,
    persona: DEFAULT_PERSONA,
  },
  tts: {
    provider: 'openai',
    model: 'gpt-4o-mini-tts',
    voice: 'coral',
    apiKey: '',
    endpoint: DEFAULT_COMPATIBLE_TTS_ENDPOINT,
    speed: 1,
  },
});

const normalizeHttpUrl = (value, fallback) => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol)
      ? url.toString()
      : fallback;
  } catch {
    return fallback;
  }
};

const clampSpeed = (value) => {
  const speed = Number(value);
  return Number.isFinite(speed) ? Math.min(4, Math.max(0.25, speed)) : 1;
};

const normalizeStoredSettings = (candidate) => {
  const defaults = createDefaultSettings();
  const llmCandidate = candidate?.llm;
  const ttsCandidate = candidate?.tts;
  const llmProvider = getProviderIds().includes(llmCandidate?.provider)
    ? llmCandidate.provider
    : defaults.llm.provider;
  const llmModels = ChatServiceFactory.getSupportedModels(llmProvider);
  const candidateLlmModel =
    typeof llmCandidate?.model === 'string' ? llmCandidate.model.trim() : '';
  const llmModel =
    llmProvider === 'openai-compatible'
      ? candidateLlmModel || getDefaultModel(llmProvider)
      : llmModels.includes(candidateLlmModel)
        ? candidateLlmModel
        : getDefaultModel(llmProvider);
  const ttsProvider =
    getTtsProvider(ttsCandidate?.provider) ?? getTtsProvider('openai');
  const candidateTtsModel =
    typeof ttsCandidate?.model === 'string' ? ttsCandidate.model.trim() : '';
  const ttsModel =
    ttsProvider.models.length === 0 ||
    ttsProvider.models.includes(candidateTtsModel)
      ? candidateTtsModel || ttsProvider.defaultModel
      : ttsProvider.defaultModel;

  return {
    llm: {
      provider: llmProvider,
      model: llmModel,
      apiKey:
        typeof llmCandidate?.apiKey === 'string'
          ? llmCandidate.apiKey.trim()
          : '',
      endpoint: normalizeHttpUrl(llmCandidate?.endpoint, defaults.llm.endpoint),
      persona: resolvePersona(llmCandidate?.persona),
    },
    tts: {
      provider: ttsProvider.provider,
      model: ttsModel,
      voice:
        typeof ttsCandidate?.voice === 'string'
          ? ttsCandidate.voice.trim()
          : ttsProvider.defaultVoice,
      apiKey:
        typeof ttsCandidate?.apiKey === 'string'
          ? ttsCandidate.apiKey.trim()
          : '',
      endpoint: normalizeHttpUrl(ttsCandidate?.endpoint, defaults.tts.endpoint),
      speed: clampSpeed(ttsCandidate?.speed),
    },
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
    return createDefaultSettings();
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

const isLlmConfigured = (candidate) => {
  if (!getProviderIds().includes(candidate.provider) || !candidate.model) {
    return false;
  }
  return candidate.provider === 'openai-compatible'
    ? Boolean(candidate.endpoint)
    : Boolean(candidate.apiKey);
};

const isTtsConfigured = (candidate) => {
  const provider = getTtsProvider(candidate.provider);
  if (!provider || !candidate.model) return false;
  if (provider.provider === 'mock') return true;
  if (provider.supportsCustomEndpoint && !candidate.endpoint) return false;
  return !provider.requiresApiKey || Boolean(candidate.apiKey);
};

const maskApiKey = (apiKey) => {
  if (!apiKey) return '';
  if (apiKey.length <= 4) return '••••';
  return `${apiKey.slice(0, Math.min(3, apiKey.length - 4))}…${apiKey.slice(-4)}`;
};

const adminSettingsResponse = () => ({
  llm: {
    provider: settings.llm.provider,
    model: settings.llm.model,
    apiKey: maskApiKey(settings.llm.apiKey),
    hasApiKey: Boolean(settings.llm.apiKey),
    endpoint: settings.llm.endpoint,
    persona: settings.llm.persona,
  },
  tts: {
    provider: settings.tts.provider,
    model: settings.tts.model,
    voice: settings.tts.voice,
    apiKey: maskApiKey(settings.tts.apiKey),
    hasApiKey: Boolean(settings.tts.apiKey),
    endpoint: settings.tts.endpoint,
    speed: settings.tts.speed,
  },
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

const assertObjectWithKeys = (value, allowedKeys, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new Error(`${label} contains an unsupported field.`);
  }
};

const validateHttpUrl = (value, label) => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${label} must be a full HTTP(S) URL.`);
  }
};

const validateSettingsPayload = (payload) => {
  assertObjectWithKeys(payload, new Set(['llm', 'tts']), 'Settings');
  assertObjectWithKeys(
    payload.llm,
    new Set(['provider', 'model', 'apiKey', 'endpoint', 'persona']),
    'LLM settings',
  );
  assertObjectWithKeys(
    payload.tts,
    new Set(['provider', 'model', 'voice', 'apiKey', 'endpoint', 'speed']),
    'TTS settings',
  );

  const llmProvider = payload.llm.provider;
  if (
    typeof llmProvider !== 'string' ||
    !getProviderIds().includes(llmProvider)
  ) {
    throw new Error('Select a registered server LLM provider.');
  }
  if (typeof payload.llm.model !== 'string' || !payload.llm.model.trim()) {
    throw new Error('An LLM model is required.');
  }
  const llmModel = payload.llm.model.trim();
  const llmModels = ChatServiceFactory.getSupportedModels(llmProvider);
  if (llmProvider !== 'openai-compatible' && !llmModels.includes(llmModel)) {
    throw new Error('Select a model registered for the LLM provider.');
  }
  for (const key of ['apiKey', 'endpoint', 'persona']) {
    if (
      payload.llm[key] !== undefined &&
      typeof payload.llm[key] !== 'string'
    ) {
      throw new Error(`LLM ${key} must be text.`);
    }
  }
  const llmEndpoint =
    llmProvider === 'openai-compatible'
      ? validateHttpUrl(
          payload.llm.endpoint?.trim() || settings.llm.endpoint,
          'The chat endpoint',
        )
      : settings.llm.endpoint;

  const ttsProvider = getTtsProvider(payload.tts.provider);
  if (!ttsProvider) throw new Error('Select a registered TTS provider.');
  if (typeof payload.tts.model !== 'string' || !payload.tts.model.trim()) {
    throw new Error('A TTS model is required.');
  }
  const ttsModel = payload.tts.model.trim();
  if (ttsProvider.models.length > 0 && !ttsProvider.models.includes(ttsModel)) {
    throw new Error('Select a model registered for the TTS provider.');
  }
  for (const key of ['apiKey', 'endpoint', 'voice']) {
    if (
      payload.tts[key] !== undefined &&
      typeof payload.tts[key] !== 'string'
    ) {
      throw new Error(`TTS ${key} must be text.`);
    }
  }
  const speed = Number(payload.tts.speed);
  if (!Number.isFinite(speed) || speed < 0.25 || speed > 4) {
    throw new Error('TTS speed must be between 0.25 and 4.');
  }
  const ttsEndpoint = ttsProvider.supportsCustomEndpoint
    ? validateHttpUrl(
        payload.tts.endpoint?.trim() || settings.tts.endpoint,
        'The speech endpoint',
      )
    : settings.tts.endpoint;

  const nextSettings = {
    llm: {
      provider: llmProvider,
      model: llmModel,
      apiKey: payload.llm.apiKey?.trim() || settings.llm.apiKey,
      endpoint: llmEndpoint,
      persona: resolvePersona(payload.llm.persona),
    },
    tts: {
      provider: ttsProvider.provider,
      model: ttsModel,
      voice:
        payload.tts.voice?.trim() ||
        ttsProvider.defaultVoice ||
        settings.tts.voice,
      apiKey: payload.tts.apiKey?.trim() || settings.tts.apiKey,
      endpoint: ttsEndpoint,
      speed,
    },
  };

  if (!isLlmConfigured(nextSettings.llm)) {
    throw new Error('The LLM provider requires a server-side API key.');
  }
  if (!isTtsConfigured(nextSettings.tts)) {
    throw new Error('The TTS provider requires a server-side API key.');
  }
  return nextSettings;
};

const validateChatPayload = (payload) => {
  assertObjectWithKeys(
    payload,
    new Set(['model', 'messages', 'stream', 'max_tokens']),
    'Chat request',
  );
  if (payload.stream !== true) {
    throw new Error('This proxy requires an OpenAI-compatible stream.');
  }
  if (
    !Array.isArray(payload.messages) ||
    payload.messages.length === 0 ||
    payload.messages.length > MAX_MESSAGE_COUNT
  ) {
    throw new Error(`messages must contain 1-${MAX_MESSAGE_COUNT} entries.`);
  }

  let totalChars = 0;
  const messages = payload.messages.map((message) => {
    assertObjectWithKeys(
      message,
      new Set(['role', 'content', 'timestamp']),
      'Each chat message',
    );
    if (
      !['system', 'user', 'assistant'].includes(message.role) ||
      typeof message.content !== 'string' ||
      !message.content.trim()
    ) {
      throw new Error('Each chat message needs a supported role and text.');
    }
    const content = message.content.trim();
    totalChars += content.length;
    return { role: message.role, content };
  });

  if (totalChars > MAX_MESSAGE_CHARS) {
    throw new Error('The chat history is too long.');
  }
  const conversation = messages.filter((message) => message.role !== 'system');
  if (conversation.length === 0 || conversation.at(-1)?.role !== 'user') {
    throw new Error('The final non-system message must have the user role.');
  }
  return conversation;
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

const createChatChunk = (model, content, finishReason = null) => ({
  id: 'chatcmpl-character-support',
  object: 'chat.completion.chunk',
  created: Math.floor(Date.now() / 1000),
  model,
  choices: [
    {
      index: 0,
      delta: content ? { content } : {},
      finish_reason: finishReason,
    },
  ],
});

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

  const currentSettings = { ...settings.llm };
  if (!isLlmConfigured(currentSettings)) {
    sendJson(res, 503, { error: 'The language model is not configured.' });
    return;
  }

  let streamStarted = false;
  let completed = false;
  const startStream = () => {
    if (streamStarted) return;
    streamStarted = true;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    });
    res.flushHeaders?.();
  };
  const writeEvent = (payloadValue) => {
    startStream();
    if (!res.destroyed && !res.writableEnded) {
      res.write(`data: ${JSON.stringify(payloadValue)}\n\n`);
    }
  };
  const finishStream = () => {
    if (completed) return;
    completed = true;
    writeEvent(createChatChunk(currentSettings.model, '', 'stop'));
    if (!res.destroyed && !res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
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
        writeEvent(createChatChunk(currentSettings.model, delta));
      },
      async () => {
        finishStream();
      },
    );
    finishStream();
  } catch (error) {
    console.error('Support LLM request failed:', error);
    if (!streamStarted) {
      sendJson(res, 502, {
        error: 'The LLM request failed. Check the server configuration.',
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
};

const validateTtsPayload = (payload) => {
  assertObjectWithKeys(
    payload,
    new Set(['model', 'input', 'voice', 'speed', 'response_format']),
    'Speech request',
  );
  if (typeof payload.input !== 'string' || !payload.input.trim()) {
    throw new Error('Speech input is required.');
  }
  if (payload.input.length > 4000) {
    throw new Error('Speech input is too long.');
  }
  return payload.input.trim();
};

const handleSupportTts = async (req, res) => {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  let input;
  try {
    input = validateTtsPayload(payload);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const currentSettings = { ...settings.tts };
  if (!isTtsConfigured(currentSettings)) {
    sendJson(res, 503, { error: 'Text-to-speech is not configured.' });
    return;
  }

  if (currentSettings.provider === 'mock') {
    const audio = createMockWav(input);
    res.writeHead(200, {
      'Content-Type': 'audio/wav',
      'Content-Length': audio.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(audio);
    return;
  }

  const endpoint =
    currentSettings.provider === 'openai'
      ? OPENAI_TTS_ENDPOINT
      : currentSettings.endpoint;
  const headers = { 'Content-Type': 'application/json' };
  if (currentSettings.apiKey) {
    headers.Authorization = `Bearer ${currentSettings.apiKey}`;
  }
  const upstreamPayload = {
    model: currentSettings.model,
    input,
    speed: currentSettings.speed,
    ...(currentSettings.voice ? { voice: currentSettings.voice } : {}),
  };

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(upstreamPayload),
      signal: AbortSignal.timeout(90_000),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('TTS provider request failed:', upstream.status, detail);
      sendJson(res, 502, {
        error: 'The TTS provider request failed.',
      });
      return;
    }
    const contentLength = Number(upstream.headers.get('content-length') || 0);
    if (contentLength > MAX_AUDIO_BYTES) {
      sendJson(res, 502, { error: 'The TTS response is too large.' });
      return;
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    if (audio.length > MAX_AUDIO_BYTES) {
      sendJson(res, 502, { error: 'The TTS response is too large.' });
      return;
    }
    res.writeHead(200, {
      'Content-Type':
        upstream.headers.get('content-type') || 'application/octet-stream',
      'Content-Length': audio.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(audio);
  } catch (error) {
    console.error('TTS proxy request failed:', error);
    sendJson(res, 502, {
      error: 'The TTS request failed. Check the server configuration.',
    });
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
    const llmConfigured = isLlmConfigured(settings.llm);
    const ttsConfigured = isTtsConfigured(settings.tts);
    sendJson(res, 200, {
      configured: llmConfigured && ttsConfigured,
      llmConfigured,
      ttsConfigured,
    });
    return;
  }

  if (
    url.pathname === '/api/support/chat/completions' &&
    req.method === 'POST'
  ) {
    await handleSupportChat(req, res);
    return;
  }

  if (url.pathname === '/api/support/tts' && req.method === 'POST') {
    await handleSupportTts(req, res);
    return;
  }

  if (url.pathname === '/api/admin/providers' && req.method === 'GET') {
    sendJson(res, 200, {
      llm: getLlmProviderRecords(),
      tts: TTS_PROVIDERS,
    });
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
  console.log(`Character support bot listening on http://${HOST}:${PORT}`);
});
