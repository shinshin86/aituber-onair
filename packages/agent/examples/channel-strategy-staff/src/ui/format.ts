import type { MetricValue, StreamingPlatform } from '../data/types';

export type MetricFormat = 'count' | 'duration' | 'percent';

export const PLATFORM_LABELS: Record<StreamingPlatform, string> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
};

/** Growth is a different unit on each platform and is never summed. */
export const GROWTH_METRIC = {
  youtube: { key: 'subscribersGained', label: '登録者' },
  twitch: { key: 'followersGained', label: 'フォロワー' },
} as const;

const QUALITY_LABELS = {
  official: '実測',
  sampled: '推計',
  derived: '集計',
} as const;

export function metricNumber(value: MetricValue | undefined): number {
  return value?.status === 'available' ? value.value : 0;
}

export function isAvailable(value: MetricValue | undefined): boolean {
  return value?.status === 'available';
}

export function formatMetric(
  value: MetricValue | undefined,
  format: MetricFormat = 'count'
): string {
  if (!value || value.status === 'unavailable') return '—';
  return formatNumberAs(value.value, format);
}

export function formatNumberAs(value: number, format: MetricFormat): string {
  if (format === 'duration') return formatDuration(value);
  if (format === 'percent') return `${Math.round(value)}%`;
  return formatNumber(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

export function qualityLabel(value: MetricValue | undefined): string {
  if (!value) return '—';
  return value.status === 'available'
    ? QUALITY_LABELS[value.quality]
    : '取得不可';
}

export function metricNote(value: MetricValue | undefined): string {
  if (!value) return '';
  if (value.status === 'unavailable') return value.note ?? value.reason;
  return `${QUALITY_LABELS[value.quality]} / source: ${value.source}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function formatFullDate(value: string | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
