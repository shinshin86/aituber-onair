export type StreamingPlatform = 'youtube' | 'twitch';

export type MetricSource =
  | 'fixture'
  | 'youtube-analytics'
  | 'youtube-data'
  | 'twitch-helix'
  | 'twitch-eventsub'
  | 'twitch-sampled';

export type MetricQuality = 'official' | 'sampled' | 'derived';

export type MetricKey =
  | 'views'
  | 'averageViewDurationSeconds'
  | 'averageViewPercentage'
  | 'subscribersGained'
  | 'followersGained'
  | 'averageConcurrentViewers'
  | 'peakConcurrentViewers'
  | 'chatMessages'
  | 'likes'
  | 'comments';

export type MetricValue =
  | {
      readonly status: 'available';
      readonly value: number;
      readonly source: MetricSource;
      readonly quality: MetricQuality;
    }
  | {
      readonly status: 'unavailable';
      readonly reason: 'not-provided-by-platform' | 'not-collected';
      readonly note?: string;
    };

export interface StreamRecord {
  readonly id: string;
  readonly platform: StreamingPlatform;
  readonly publishedAt: string;
  readonly title: string;
  readonly durationMinutes: number;
  readonly game: {
    readonly id: string;
    readonly title: string;
  };
  readonly content: {
    readonly format: string;
    readonly tags: readonly string[];
  };
  readonly metrics: Readonly<Record<MetricKey, MetricValue>>;
}

export interface StrategyRecord {
  readonly id: string;
  readonly platform: StreamingPlatform;
  readonly hypothesis: string;
  readonly targetStreamIds: readonly string[];
  readonly result: 'supported' | 'refuted' | 'mixed';
  readonly finding: string;
}

export interface StreamQuery {
  readonly platform?: StreamingPlatform;
  readonly since: string;
  readonly until: string;
  readonly limit: number;
}

export interface ChannelDataSource {
  readonly platform: StreamingPlatform;
  readonly availableMetrics: readonly MetricKey[];
  listStreams(query: StreamQuery): Promise<readonly StreamRecord[]>;
  getStreams(streamIds: readonly string[]): Promise<readonly StreamRecord[]>;
  listStrategies(): Promise<readonly StrategyRecord[]>;
}

export interface CompositeChannelDataSource {
  readonly referenceDate: string;
  readonly platforms: readonly StreamingPlatform[];
  listStreams(query: StreamQuery): Promise<readonly StreamRecord[]>;
  getStreams(
    platform: StreamingPlatform,
    streamIds: readonly string[]
  ): Promise<readonly StreamRecord[]>;
  listStrategies(
    platform?: StreamingPlatform
  ): Promise<readonly StrategyRecord[]>;
}
