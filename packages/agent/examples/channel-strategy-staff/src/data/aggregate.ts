import type {
  MetricKey,
  MetricValue,
  StreamRecord,
  StreamingPlatform,
} from './types.js';

export const DEFAULT_DAYS = 90;
export const DEFAULT_LIMIT = 20;

const METRIC_KEYS: readonly MetricKey[] = [
  'views',
  'averageViewDurationSeconds',
  'averageViewPercentage',
  'subscribersGained',
  'followersGained',
  'averageConcurrentViewers',
  'peakConcurrentViewers',
  'chatMessages',
  'likes',
  'comments',
];

const SUM_METRICS = new Set<MetricKey>([
  'views',
  'subscribersGained',
  'followersGained',
  'chatMessages',
  'likes',
  'comments',
]);

export interface PlatformOverview {
  readonly platform: StreamingPlatform;
  readonly streamCount: number;
  readonly sourceStreamIds: readonly string[];
  readonly metrics: Readonly<Record<MetricKey, MetricValue>>;
  readonly limitations: readonly string[];
}

export interface GamePerformance {
  readonly platform: StreamingPlatform;
  readonly gameId: string;
  readonly gameTitle: string;
  readonly streamCount: number;
  readonly formats: readonly string[];
  readonly contentTags: readonly string[];
  readonly sourceStreamIds: readonly string[];
  readonly metrics: Readonly<Record<MetricKey, MetricValue>>;
  readonly limitations: readonly string[];
}

export function clampInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  return typeof value === 'number' && Number.isInteger(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

export function createDateWindow(
  referenceDate: string,
  daysValue: unknown
): { readonly days: number; readonly since: string; readonly until: string } {
  const days = clampInteger(daysValue, DEFAULT_DAYS, 1, 365);
  const until = new Date(referenceDate);
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - days);
  return { days, since: since.toISOString(), until: until.toISOString() };
}

export function aggregateOverview(
  platform: StreamingPlatform,
  streams: readonly StreamRecord[]
): PlatformOverview {
  return {
    platform,
    streamCount: streams.length,
    sourceStreamIds: streams.map((stream) => stream.id),
    metrics: aggregateMetrics(streams),
    limitations: collectLimitations(streams),
  };
}

export function aggregateGamePerformance(
  streams: readonly StreamRecord[]
): readonly GamePerformance[] {
  const groups = new Map<string, StreamRecord[]>();
  for (const stream of streams) {
    const key = `${stream.platform}:${stream.game.id}`;
    const group = groups.get(key) ?? [];
    group.push(stream);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      const first = group[0];
      return {
        platform: first.platform,
        gameId: first.game.id,
        gameTitle: first.game.title,
        streamCount: group.length,
        formats: [...new Set(group.map((stream) => stream.content.format))],
        contentTags: [
          ...new Set(group.flatMap((stream) => stream.content.tags)),
        ],
        sourceStreamIds: group.map((stream) => stream.id),
        metrics: aggregateMetrics(group),
        limitations: collectLimitations(group),
      };
    })
    .sort((left, right) => {
      if (left.platform !== right.platform) {
        return left.platform.localeCompare(right.platform);
      }
      return right.streamCount - left.streamCount;
    });
}

function aggregateMetrics(
  streams: readonly StreamRecord[]
): Readonly<Record<MetricKey, MetricValue>> {
  return Object.fromEntries(
    METRIC_KEYS.map((key) => [key, aggregateMetric(streams, key)])
  ) as unknown as Readonly<Record<MetricKey, MetricValue>>;
}

function aggregateMetric(
  streams: readonly StreamRecord[],
  key: MetricKey
): MetricValue {
  const availableValues = streams
    .map((stream) => stream.metrics[key])
    .filter(
      (metric): metric is Extract<MetricValue, { status: 'available' }> =>
        metric.status === 'available'
    );
  if (availableValues.length === 0) {
    const unavailable = streams
      .map((stream) => stream.metrics[key])
      .find((metric) => metric.status === 'unavailable');
    return (
      unavailable ?? {
        status: 'unavailable',
        reason: 'not-collected',
        note: 'No streams were available in the selected window.',
      }
    );
  }
  const total = availableValues.reduce((sum, metric) => sum + metric.value, 0);
  return {
    status: 'available',
    value: SUM_METRICS.has(key) ? total : total / availableValues.length,
    source: 'fixture',
    // An aggregate cannot be more reliable than its least reliable input.
    quality: availableValues.some((metric) => metric.quality === 'sampled')
      ? 'sampled'
      : 'derived',
  };
}

function collectLimitations(streams: readonly StreamRecord[]): string[] {
  const limitations = new Set<string>();
  for (const stream of streams) {
    for (const [metricKey, metric] of Object.entries(stream.metrics)) {
      if (metric.status === 'unavailable') {
        limitations.add(`${metricKey}: ${metric.note ?? metric.reason}`);
      }
    }
  }
  return [...limitations];
}
