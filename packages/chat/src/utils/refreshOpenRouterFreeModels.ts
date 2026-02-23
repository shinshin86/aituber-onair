import {
  ENDPOINT_OPENROUTER_API,
  isOpenRouterFreeModel,
} from '../constants/openrouter';

const OPENROUTER_MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models';
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MAX_CANDIDATES = 20;
const DEFAULT_MAX_WORKING = 10;

export interface RefreshOpenRouterFreeModelsOptions {
  apiKey: string;
  endpoint?: string;
  modelsEndpoint?: string;
  timeoutMs?: number;
  concurrency?: number;
  maxCandidates?: number;
  maxWorking?: number;
  appName?: string;
  appUrl?: string;
}

export interface RefreshOpenRouterFreeModelsFailure {
  id: string;
  reason: string;
}

export interface RefreshOpenRouterFreeModelsResult {
  working: string[];
  failed: RefreshOpenRouterFreeModelsFailure[];
  fetchedAt: number;
}

interface ProbeResult {
  id: string;
  ok: boolean;
  reason?: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

function normalizeModelIds(modelIds: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const modelId of modelIds) {
    const trimmed = modelId.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const hasAbortController = typeof AbortController !== 'undefined';
  if (!hasAbortController) {
    return fetch(url, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function toHttpFailureReason(response: Response): Promise<string> {
  const status = `HTTP ${response.status} ${response.statusText}`.trim();
  let body = '';
  try {
    body = await response.text();
  } catch {
    return status;
  }

  const compactBody = body.replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!compactBody) {
    return status;
  }
  return `${status}: ${compactBody}`;
}

function extractModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid models response shape');
  }

  const response = payload as {
    data?: Array<{ id?: unknown }>;
    models?: Array<{ id?: unknown }>;
  };

  const modelEntries = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.models)
      ? response.models
      : [];

  if (modelEntries.length === 0) {
    return [];
  }

  const modelIds = modelEntries
    .map((entry) => entry.id)
    .filter((id): id is string => typeof id === 'string');

  return normalizeModelIds(modelIds);
}

async function probeModel({
  modelId,
  apiKey,
  endpoint,
  timeoutMs,
  appName,
  appUrl,
}: {
  modelId: string;
  apiKey: string;
  endpoint: string;
  timeoutMs: number;
  appName?: string;
  appUrl?: string;
}): Promise<ProbeResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (appName) {
    headers['X-Title'] = appName;
  }
  if (appUrl) {
    headers['HTTP-Referer'] = appUrl;
  }

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'Reply only with OK.' }],
          stream: false,
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      return {
        id: modelId,
        ok: false,
        reason: await toHttpFailureReason(response),
      };
    }

    try {
      await response.json();
    } catch (error) {
      return {
        id: modelId,
        ok: false,
        reason: `JSON parse failed: ${toErrorMessage(error)}`,
      };
    }

    return { id: modelId, ok: true };
  } catch (error) {
    return {
      id: modelId,
      ok: false,
      reason: toErrorMessage(error),
    };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const current = nextIndex;
        nextIndex += 1;
        results[current] = await worker(items[current]);
      }
    }),
  );

  return results;
}

/**
 * Fetch currently available OpenRouter free models and probe each model.
 */
export async function refreshOpenRouterFreeModels(
  options: RefreshOpenRouterFreeModelsOptions,
): Promise<RefreshOpenRouterFreeModelsResult> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error('OpenRouter API key is required.');
  }

  const modelsEndpoint = options.modelsEndpoint || OPENROUTER_MODELS_ENDPOINT;
  const endpoint = options.endpoint || ENDPOINT_OPENROUTER_API;
  const timeoutMs = normalizeLimit(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const concurrency = normalizeLimit(options.concurrency, DEFAULT_CONCURRENCY);
  const maxCandidates = normalizeLimit(
    options.maxCandidates,
    DEFAULT_MAX_CANDIDATES,
  );
  const maxWorking = normalizeLimit(options.maxWorking, DEFAULT_MAX_WORKING);

  const modelsResponse = await fetchWithTimeout(
    modelsEndpoint,
    { method: 'GET' },
    timeoutMs,
  );

  if (!modelsResponse.ok) {
    throw new Error(await toHttpFailureReason(modelsResponse));
  }

  let payload: unknown;
  try {
    payload = await modelsResponse.json();
  } catch (error) {
    throw new Error(`JSON parse failed: ${toErrorMessage(error)}`);
  }

  const candidateModelIds = extractModelIds(payload)
    .filter((modelId) => isOpenRouterFreeModel(modelId))
    .slice(0, maxCandidates);

  const probeResults = await runWithConcurrency(
    candidateModelIds,
    concurrency,
    (modelId) =>
      probeModel({
        modelId,
        apiKey,
        endpoint,
        timeoutMs,
        appName: options.appName,
        appUrl: options.appUrl,
      }),
  );

  const working = probeResults
    .filter((result) => result.ok)
    .map((result) => result.id)
    .slice(0, maxWorking);

  const failed = probeResults
    .filter((result) => !result.ok)
    .map((result) => ({
      id: result.id,
      reason: result.reason || 'Unknown error',
    }));

  return {
    working,
    failed,
    fetchedAt: Date.now(),
  };
}
