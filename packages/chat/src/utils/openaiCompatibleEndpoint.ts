/** A local server with an OpenAI-compatible Chat Completions endpoint. */
export type OpenAICompatibleLocalPresetId =
  | 'ollama'
  | 'lmStudio'
  | 'llamaCpp'
  | 'vllm';

export interface OpenAICompatibleLocalPreset {
  id: OpenAICompatibleLocalPresetId;
  label: string;
  baseUrl: string;
  docsUrl: string;
  corsHint?: string;
}

/** Default local URLs. Change the port when your server uses a custom one. */
export const OPENAI_COMPATIBLE_LOCAL_PRESETS: readonly OpenAICompatibleLocalPreset[] =
  [
    {
      id: 'ollama',
      label: 'Ollama',
      baseUrl: 'http://localhost:11434/v1',
      docsUrl: 'https://docs.ollama.com/api/openai-compatibility',
      corsHint: 'Set OLLAMA_ORIGINS to allow additional browser origins.',
    },
    {
      id: 'lmStudio',
      label: 'LM Studio',
      baseUrl: 'http://localhost:1234/v1',
      docsUrl: 'https://lmstudio.ai/docs/developer/openai-compat',
      corsHint:
        'Start the server with lms server start --cors for browser access.',
    },
    {
      id: 'llamaCpp',
      label: 'llama.cpp',
      baseUrl: 'http://127.0.0.1:8080/v1',
      docsUrl:
        'https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md',
      corsHint:
        'All origins are allowed by default; use --cors-origins to restrict them.',
    },
    {
      id: 'vllm',
      label: 'vLLM',
      baseUrl: 'http://localhost:8000/v1',
      docsUrl:
        'https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/',
      corsHint:
        'All origins are allowed by default; use --allowed-origins to restrict them.',
    },
  ];

export type OpenAICompatibleEndpointErrorCode =
  | 'invalid-url'
  | 'network'
  | 'aborted'
  | 'timeout'
  | 'http'
  | 'invalid-response';

/** Error returned by endpoint resolution and model discovery. */
export class OpenAICompatibleEndpointError extends Error {
  readonly code: OpenAICompatibleEndpointErrorCode;
  readonly status?: number;

  constructor(
    code: OpenAICompatibleEndpointErrorCode,
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = 'OpenAICompatibleEndpointError';
    this.code = code;
    this.status = status;
  }
}

export interface ResolvedOpenAICompatibleEndpoint {
  baseUrl: string;
  chatCompletionsUrl: string;
  modelsUrl: string;
}

/**
 * Accepts an origin, API base URL, or full Chat Completions URL.
 * Query strings and fragments are rejected rather than discarded.
 */
export function resolveOpenAICompatibleEndpoint(
  input: string,
): ResolvedOpenAICompatibleEndpoint {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new OpenAICompatibleEndpointError(
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
    throw new OpenAICompatibleEndpointError(
      'invalid-url',
      'Use an HTTP or HTTPS endpoint URL without credentials, a query, or a fragment.',
    );
  }

  const path = url.pathname.replace(/\/+$/, '');
  if (path.endsWith('/api/chat') || path.endsWith('/api/generate')) {
    throw new OpenAICompatibleEndpointError(
      'invalid-url',
      "This looks like Ollama's native API URL. Use the OpenAI-compatible base URL instead, e.g. http://localhost:11434/v1.",
    );
  }
  const basePath =
    !path || path === '/'
      ? '/v1'
      : path.endsWith('/chat/completions')
        ? path.slice(0, -'/chat/completions'.length)
        : path;

  const baseUrl = `${url.origin}${basePath}`;
  return {
    baseUrl,
    chatCompletionsUrl: `${baseUrl}/chat/completions`,
    modelsUrl: `${baseUrl}/models`,
  };
}

export interface ListOpenAICompatibleModelsOptions {
  endpoint: string;
  apiKey?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

/**
 * Lists model IDs from GET /models, preserving server order.
 * @throws {RangeError} If timeoutMs is not a positive finite number.
 */
export async function listOpenAICompatibleModels(
  options: ListOpenAICompatibleModelsOptions,
): Promise<string[]> {
  const { modelsUrl } = resolveOpenAICompatibleEndpoint(options.endpoint);
  const timeoutMs = options.timeoutMs ?? 8000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('timeoutMs must be a positive finite number.');
  }

  if (options.signal?.aborted) {
    throw new OpenAICompatibleEndpointError(
      'aborted',
      'The models request was aborted by the caller.',
    );
  }

  const controller = new AbortController();
  let abortCause: 'caller' | 'timeout' | undefined;
  const onAbort = () => {
    if (!abortCause) abortCause = 'caller';
    controller.abort();
  };
  options.signal?.addEventListener('abort', onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  const timeout = setTimeout(() => {
    if (!abortCause) abortCause = 'timeout';
    controller.abort();
  }, timeoutMs);

  try {
    const headers: Record<string, string> = {};
    if (options.apiKey?.trim()) {
      headers.Authorization = `Bearer ${options.apiKey.trim()}`;
    }
    const response = await (options.fetch ?? fetch)(modelsUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    if (abortCause) {
      throw new OpenAICompatibleEndpointError(
        'aborted',
        'The models request was aborted by the caller.',
      );
    }
    if (!response.ok) {
      throw new OpenAICompatibleEndpointError(
        'http',
        `Model listing failed with HTTP ${response.status}.`,
        response.status,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new OpenAICompatibleEndpointError(
        'invalid-response',
        'The models endpoint did not return valid JSON.',
      );
    }
    if (
      !body ||
      typeof body !== 'object' ||
      !('data' in body) ||
      !Array.isArray(body.data) ||
      !body.data.every(
        (model: unknown) =>
          model &&
          typeof model === 'object' &&
          'id' in model &&
          typeof model.id === 'string',
      )
    ) {
      throw new OpenAICompatibleEndpointError(
        'invalid-response',
        'The models response must contain data with model IDs.',
      );
    }
    if (abortCause) {
      throw new OpenAICompatibleEndpointError(
        'aborted',
        'The models request was aborted by the caller.',
      );
    }
    return [...new Set(body.data.map((model: { id: string }) => model.id))];
  } catch (error) {
    if (abortCause === 'caller') {
      throw new OpenAICompatibleEndpointError(
        'aborted',
        'The models request was aborted by the caller.',
      );
    }
    if (abortCause === 'timeout') {
      throw new OpenAICompatibleEndpointError(
        'timeout',
        `The models request timed out after ${timeoutMs} ms.`,
      );
    }
    if (error instanceof OpenAICompatibleEndpointError) throw error;
    throw new OpenAICompatibleEndpointError(
      'network',
      'Could not reach the models endpoint. In a browser, this is usually a CORS restriction or the server is not running.',
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

export type OpenAICompatibleConnectionResult =
  | { ok: true; latencyMs: number; models: string[]; modelFound?: boolean }
  | { ok: false; error: OpenAICompatibleEndpointError };

/**
 * Tests GET /models without generating tokens.
 * @throws {RangeError} If timeoutMs is not a positive finite number.
 */
export async function testOpenAICompatibleConnection(
  options: ListOpenAICompatibleModelsOptions & { model?: string },
): Promise<OpenAICompatibleConnectionResult> {
  const startedAt = Date.now();
  try {
    const models = await listOpenAICompatibleModels(options);
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      models,
      ...(options.model !== undefined
        ? { modelFound: models.includes(options.model) }
        : {}),
    };
  } catch (error) {
    if (error instanceof RangeError) throw error;
    return {
      ok: false,
      error:
        error instanceof OpenAICompatibleEndpointError
          ? error
          : new OpenAICompatibleEndpointError(
              'network',
              'Could not reach the models endpoint. In a browser, this is usually a CORS restriction or the server is not running.',
            ),
    };
  }
}
