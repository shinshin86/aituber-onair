export const DEFAULT_OPENAI_COMPATIBLE_TTS_MODEL =
  'audiocpp-qwen3-tts-0.6b';
export const LEGACY_LLM_TTS_MODEL = 'ssfdre38/gemma4-turbo:latest';

export function createLatestRequestGuard() {
  let latestRequest = 0;

  return {
    begin: () => ++latestRequest,
    invalidate: () => {
      latestRequest += 1;
    },
    isLatest: (request: number) => request === latestRequest,
  };
}

export function getOpenAiModelsEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
  url.pathname = `${url.pathname
    .replace(/\/$/, '')
    .replace(/\/v1(?:\/.*)?$/, '')}/v1/models`;
  url.search = '';
  return url.toString();
}

export function parseOpenAiModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const modelIds = data.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as { id?: unknown }).id === 'string'
    ) {
      return [(item as { id: string }).id];
    }
    return [];
  });

  return [...new Set(modelIds.map((id) => id.trim()).filter(Boolean))];
}

export async function discoverOpenAiCompatibleModels(
  speechEndpoint: string,
  apiKey = '',
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const response = await fetcher(getOpenAiModelsEndpoint(speechEndpoint), {
    headers: apiKey.trim()
      ? { Authorization: `Bearer ${apiKey.trim()}` }
      : undefined,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const models = parseOpenAiModelIds(await response.json());
  if (models.length === 0) {
    throw new Error(
      'La respuesta no contiene modelos en formato OpenAI (/v1/models).',
    );
  }
  return models;
}

export function chooseOpenAiCompatibleTtsModel(
  discoveredModels: string[],
  currentModel: string | undefined,
): string {
  const normalizedCurrent = currentModel?.trim() || '';
  if (discoveredModels.length > 0 && normalizedCurrent === LEGACY_LLM_TTS_MODEL) {
    return discoveredModels[0] || DEFAULT_OPENAI_COMPATIBLE_TTS_MODEL;
  }

  // Si el modelo salvo no está en el catálogo real del servidor (modelo que se
  // retiró del backend, p. ej. 'kokoro' o 'gpt-4o-mini-tts'), cada síntesis
  // fallaría con 400 al instante. Sanar al primer modelo descubierto evita
  // que un valor obsoleto en localStorage rompa el TTS.
  if (
    normalizedCurrent &&
    discoveredModels.some((id) => id === normalizedCurrent)
  ) {
    return normalizedCurrent;
  }

  return (
    discoveredModels[0] ||
    (normalizedCurrent || DEFAULT_OPENAI_COMPATIBLE_TTS_MODEL)
  );
}
