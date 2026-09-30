import type { VoiceEngineVoice } from '../types/capabilities';

export type OpenAICompatibleSpeechEndpointErrorCode =
  | 'invalid-url'
  | 'network'
  | 'aborted'
  | 'timeout'
  | 'http'
  | 'invalid-response';

/** Error returned by OpenAI-compatible speech endpoint helpers. */
export class OpenAICompatibleSpeechEndpointError extends Error {
  readonly code: OpenAICompatibleSpeechEndpointErrorCode;
  readonly status?: number;
  /** Response body text for HTTP errors, when the server returned one. */
  readonly detail?: string;

  constructor(
    code: OpenAICompatibleSpeechEndpointErrorCode,
    message: string,
    status?: number,
    detail?: string,
  ) {
    super(message);
    this.name = 'OpenAICompatibleSpeechEndpointError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export interface ResolvedOpenAICompatibleSpeechEndpoint {
  /** API base URL, e.g. http://localhost:8880/v1 */
  baseUrl: string;
  /** POST target for speech synthesis (`{baseUrl}/audio/speech`). */
  speechUrl: string;
  /** Standard OpenAI model listing endpoint (`{baseUrl}/models`). */
  modelsUrl: string;
  /** Non-standard voice listing endpoints tried in order. */
  voicesUrls: string[];
  /** Server root, where some servers describe themselves. */
  serverInfoUrl: string;
}

/**
 * Accepts an origin, API base URL, or full `/audio/speech` URL.
 * Query strings and fragments are rejected rather than discarded.
 */
export function resolveOpenAICompatibleSpeechEndpoint(
  input: string,
): ResolvedOpenAICompatibleSpeechEndpoint {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new OpenAICompatibleSpeechEndpointError(
      'invalid-url',
      'Enter a valid HTTP or HTTPS endpoint URL.',
    );
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new OpenAICompatibleSpeechEndpointError(
      'invalid-url',
      'Use an HTTP or HTTPS endpoint URL without credentials, a query, or a fragment.',
    );
  }

  const path = url.pathname.replace(/\/+$/, '');
  const basePath = !path
    ? '/v1'
    : path.endsWith('/audio/speech')
      ? path.slice(0, -'/audio/speech'.length)
      : path;
  const baseUrl = `${url.origin}${basePath}`;
  const rootPath = basePath.endsWith('/v1')
    ? basePath.slice(0, -'/v1'.length)
    : basePath;

  return {
    baseUrl,
    speechUrl: `${baseUrl}/audio/speech`,
    modelsUrl: `${baseUrl}/models`,
    voicesUrls: [`${baseUrl}/audio/voices`, `${baseUrl}/voices`],
    serverInfoUrl: `${url.origin}${rootPath}/`,
  };
}

export interface OpenAICompatibleSpeechRequestOptions {
  /** Origin, API base URL, or full `/audio/speech` URL. */
  endpoint: string;
  apiKey?: string;
  /** Request timeout in milliseconds (default: 8000). */
  timeoutMs?: number;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

const NETWORK_ERROR_MESSAGE =
  'Could not reach the speech server. In a browser, this is usually a CORS restriction or the server is not running.';

function validateTimeout(timeoutMs: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('timeoutMs must be a positive finite number.');
  }
}

/**
 * Runs one request with caller abort and timeout mapped to typed errors.
 * `read` consumes the body inside the same abort scope.
 */
async function requestEndpoint<T>(
  url: string,
  init: RequestInit,
  options: OpenAICompatibleSpeechRequestOptions,
  timeoutMs: number,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const abortedError = () =>
    new OpenAICompatibleSpeechEndpointError(
      'aborted',
      'The request was aborted by the caller.',
    );
  if (options.signal?.aborted) throw abortedError();

  const controller = new AbortController();
  let abortCause: 'caller' | 'timeout' | undefined;
  const onAbort = () => {
    if (!abortCause) abortCause = 'caller';
    controller.abort();
  };
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timeout = setTimeout(() => {
    if (!abortCause) abortCause = 'timeout';
    controller.abort();
  }, timeoutMs);

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (options.apiKey?.trim()) {
    headers.Authorization = `Bearer ${options.apiKey.trim()}`;
  }

  try {
    const response = await (options.fetch ?? fetch)(url, {
      ...init,
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new OpenAICompatibleSpeechEndpointError(
        'http',
        detail
          ? `Request failed with HTTP ${response.status}: ${detail}`
          : `Request failed with HTTP ${response.status}.`,
        response.status,
        detail || undefined,
      );
    }
    const result = await read(response);
    if (abortCause) throw abortedError();
    return result;
  } catch (error) {
    if (abortCause === 'caller') throw abortedError();
    if (abortCause === 'timeout') {
      throw new OpenAICompatibleSpeechEndpointError(
        'timeout',
        `The request timed out after ${timeoutMs} ms.`,
      );
    }
    if (error instanceof OpenAICompatibleSpeechEndpointError) throw error;
    throw new OpenAICompatibleSpeechEndpointError(
      'network',
      NETWORK_ERROR_MESSAGE,
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new OpenAICompatibleSpeechEndpointError(
      'invalid-response',
      'The endpoint did not return valid JSON.',
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Lists model IDs from the standard GET /models endpoint, preserving server order.
 * @throws {RangeError} If timeoutMs is not a positive finite number.
 */
export async function listOpenAICompatibleSpeechModels(
  options: OpenAICompatibleSpeechRequestOptions,
): Promise<string[]> {
  const { modelsUrl } = resolveOpenAICompatibleSpeechEndpoint(options.endpoint);
  const timeoutMs = options.timeoutMs ?? 8000;
  validateTimeout(timeoutMs);

  const body = await requestEndpoint(
    modelsUrl,
    { method: 'GET' },
    options,
    timeoutMs,
    readJson,
  );
  if (
    !isRecord(body) ||
    !Array.isArray(body.data) ||
    !body.data.every(
      (model: unknown) => isRecord(model) && typeof model.id === 'string',
    )
  ) {
    throw new OpenAICompatibleSpeechEndpointError(
      'invalid-response',
      'The models response must contain data with model IDs.',
    );
  }
  return [...new Set(body.data.map((model) => (model as { id: string }).id))];
}

export interface OpenAICompatibleSpeechVoiceList {
  voices: VoiceEngineVoice[];
  /** Server default voice, when the server reports one. */
  defaultVoice?: string;
  /** The endpoint that answered. */
  url: string;
}

function parseVoiceList(
  body: unknown,
): Omit<OpenAICompatibleSpeechVoiceList, 'url'> | null {
  const items = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.data)
      ? body.data
      : isRecord(body) && Array.isArray(body.voices)
        ? body.voices
        : null;
  if (!items) return null;

  const voices: VoiceEngineVoice[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      voices.push({ id: item, label: item });
      continue;
    }
    if (!isRecord(item) || typeof item.id !== 'string') return null;
    const label = typeof item.name === 'string' ? item.name : item.id;
    voices.push({
      id: item.id,
      label,
      ...(typeof item.description === 'string'
        ? { metadata: { description: item.description } }
        : {}),
    });
  }

  const defaultVoice =
    isRecord(body) && typeof body.default_voice === 'string'
      ? body.default_voice
      : undefined;
  return { voices, ...(defaultVoice ? { defaultVoice } : {}) };
}

/**
 * Best-effort voice discovery. OpenAI's API has no voice listing endpoint,
 * so this tries the common non-standard ones (`/audio/voices`, `/voices`)
 * and returns `null` when none of them answers with a recognizable list.
 * @throws {OpenAICompatibleSpeechEndpointError} Only for invalid URLs or caller aborts.
 * @throws {RangeError} If timeoutMs is not a positive finite number.
 */
export async function listOpenAICompatibleSpeechVoices(
  options: OpenAICompatibleSpeechRequestOptions,
): Promise<OpenAICompatibleSpeechVoiceList | null> {
  const { voicesUrls } = resolveOpenAICompatibleSpeechEndpoint(
    options.endpoint,
  );
  const timeoutMs = options.timeoutMs ?? 8000;
  validateTimeout(timeoutMs);

  for (const url of voicesUrls) {
    try {
      const body = await requestEndpoint(
        url,
        { method: 'GET' },
        options,
        timeoutMs,
        readJson,
      );
      const parsed = parseVoiceList(body);
      if (parsed) return { ...parsed, url };
    } catch (error) {
      if (
        error instanceof OpenAICompatibleSpeechEndpointError &&
        error.code === 'aborted'
      ) {
        throw error;
      }
    }
  }
  return null;
}

export interface OpenAICompatibleSpeechServerInfo {
  /** Engine name reported by the server. */
  engine: string;
  model?: string;
  defaultVoice?: string;
}

/**
 * Best-effort server self-description from GET on the server root.
 * Returns `null` unless the root answers with JSON containing a string
 * `engine` field (for example `{ "engine": "...", "model": "..." }`).
 * @throws {OpenAICompatibleSpeechEndpointError} Only for invalid URLs or caller aborts.
 * @throws {RangeError} If timeoutMs is not a positive finite number.
 */
export async function getOpenAICompatibleSpeechServerInfo(
  options: OpenAICompatibleSpeechRequestOptions,
): Promise<OpenAICompatibleSpeechServerInfo | null> {
  const { serverInfoUrl } = resolveOpenAICompatibleSpeechEndpoint(
    options.endpoint,
  );
  const timeoutMs = options.timeoutMs ?? 8000;
  validateTimeout(timeoutMs);

  let body: unknown;
  try {
    body = await requestEndpoint(
      serverInfoUrl,
      { method: 'GET' },
      options,
      timeoutMs,
      readJson,
    );
  } catch (error) {
    if (
      error instanceof OpenAICompatibleSpeechEndpointError &&
      error.code === 'aborted'
    ) {
      throw error;
    }
    return null;
  }
  if (!isRecord(body) || typeof body.engine !== 'string' || !body.engine) {
    return null;
  }
  return {
    engine: body.engine,
    ...(typeof body.model === 'string' ? { model: body.model } : {}),
    ...(typeof body.default_voice === 'string'
      ? { defaultVoice: body.default_voice }
      : {}),
  };
}

export interface TestOpenAICompatibleSpeechOptions
  extends OpenAICompatibleSpeechRequestOptions {
  model: string;
  voice?: string;
  instructions?: string;
  responseFormat?: string;
  speed?: number;
  /** Text to synthesize (default: a short Japanese sentence). */
  text?: string;
}

export type OpenAICompatibleSpeechTestResult =
  | {
      ok: true;
      latencyMs: number;
      audio: ArrayBuffer;
      contentType?: string;
    }
  | { ok: false; error: OpenAICompatibleSpeechEndpointError };

/**
 * Synthesizes one short sentence to verify the whole speech request,
 * including model, voice, and instructions. The returned audio can be played
 * to confirm the result by ear.
 * @throws {RangeError} If timeoutMs is not a positive finite number.
 */
export async function testOpenAICompatibleSpeech(
  options: TestOpenAICompatibleSpeechOptions,
): Promise<OpenAICompatibleSpeechTestResult> {
  // Speech synthesis is slower than listing; cold local models need more time.
  const timeoutMs = options.timeoutMs ?? 60_000;
  validateTimeout(timeoutMs);
  const startedAt = Date.now();

  try {
    const { speechUrl } = resolveOpenAICompatibleSpeechEndpoint(
      options.endpoint,
    );
    const body: Record<string, string | number> = {
      model: options.model.trim(),
      input: options.text?.trim() || 'こんにちは、音声合成のテストです。',
    };
    if (options.voice?.trim()) body.voice = options.voice.trim();
    if (options.instructions?.trim()) {
      body.instructions = options.instructions.trim();
    }
    if (options.responseFormat?.trim()) {
      body.response_format = options.responseFormat.trim();
    }
    if (options.speed !== undefined) body.speed = options.speed;

    const { audio, contentType } = await requestEndpoint(
      speechUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      options,
      timeoutMs,
      async (response) => {
        const contentType = response.headers.get('content-type') ?? undefined;
        if (contentType?.includes('application/json')) {
          throw new OpenAICompatibleSpeechEndpointError(
            'invalid-response',
            `The speech endpoint returned JSON instead of audio: ${await response.text().catch(() => '')}`,
          );
        }
        const audio = await response.arrayBuffer();
        if (audio.byteLength === 0) {
          throw new OpenAICompatibleSpeechEndpointError(
            'invalid-response',
            'The speech endpoint returned an empty response.',
          );
        }
        return { audio, contentType };
      },
    );
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      audio,
      ...(contentType ? { contentType } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof OpenAICompatibleSpeechEndpointError
          ? error
          : new OpenAICompatibleSpeechEndpointError(
              'network',
              NETWORK_ERROR_MESSAGE,
            ),
    };
  }
}
