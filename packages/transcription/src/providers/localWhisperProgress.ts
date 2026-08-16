import type { TranscriptionProgress } from '../types';

const DOWNLOAD_STATUSES = new Set(['initiate', 'download', 'progress', 'done']);

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizedRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function normalizeLocalWhisperDownloadProgress(
  data: unknown
): TranscriptionProgress | null {
  if (typeof data !== 'object' || data === null) return null;

  const record = data as Record<string, unknown>;
  if (
    typeof record.status !== 'string' ||
    !DOWNLOAD_STATUSES.has(record.status)
  ) {
    return null;
  }

  const file =
    typeof record.file === 'string' && record.file ? record.file : undefined;
  const rawLoaded = finiteNumber(record.loaded);
  const loadedBytes =
    rawLoaded !== undefined && rawLoaded >= 0 ? rawLoaded : undefined;
  const rawTotal = finiteNumber(record.total);
  const totalBytes =
    rawTotal !== undefined && rawTotal > 0 ? rawTotal : undefined;
  const rawProgress = finiteNumber(record.progress);
  const progress =
    totalBytes === undefined
      ? undefined
      : rawProgress !== undefined
        ? normalizedRatio(rawProgress / 100)
        : loadedBytes !== undefined
          ? normalizedRatio(loadedBytes / totalBytes)
          : undefined;

  return {
    phase: 'download',
    ...(file ? { file } : {}),
    ...(loadedBytes !== undefined ? { loadedBytes } : {}),
    ...(totalBytes !== undefined ? { totalBytes } : {}),
    ...(progress !== undefined ? { progress } : {}),
  };
}
