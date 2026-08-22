export const MIN_TTS_KEEP_ALIVE_MINUTES = 5;
export const DEFAULT_TTS_KEEP_ALIVE_MINUTES = 5;

export function normalizeTtsKeepAliveMinutes(
  value: number | undefined,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_TTS_KEEP_ALIVE_MINUTES;
  }
  return Math.max(MIN_TTS_KEEP_ALIVE_MINUTES, Math.floor(value));
}

export function getTtsSettingsEndpoint(speechEndpoint: string): string {
  const url = new URL(speechEndpoint);
  url.pathname = `${url.pathname
    .replace(/\/$/, '')
    .replace(/\/v1(?:\/.*)?$/, '')}/v1/settings`;
  url.search = '';
  return url.toString();
}

export async function syncTtsKeepAlive(
  speechEndpoint: string,
  minutes: number,
  apiKey = '',
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const normalizedMinutes = normalizeTtsKeepAliveMinutes(minutes);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetcher(getTtsSettingsEndpoint(speechEndpoint), {
    method: 'POST',
    headers,
    body: JSON.stringify({ keep_alive_seconds: normalizedMinutes * 60 }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}
