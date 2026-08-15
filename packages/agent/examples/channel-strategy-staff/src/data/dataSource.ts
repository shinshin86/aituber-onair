import {
  FIXTURE_REFERENCE_DATE,
  getFixtureStrategies,
  getFixtureStreams,
} from './fixtures.js';
import type {
  ChannelDataSource,
  CompositeChannelDataSource,
  MetricKey,
  StrategyRecord,
  StreamQuery,
  StreamRecord,
  StreamingPlatform,
} from './types.js';

const YOUTUBE_METRICS: readonly MetricKey[] = [
  'views',
  'averageViewDurationSeconds',
  'averageViewPercentage',
  'subscribersGained',
  'averageConcurrentViewers',
  'peakConcurrentViewers',
  'chatMessages',
  'likes',
  'comments',
];

const TWITCH_METRICS: readonly MetricKey[] = [
  'views',
  'followersGained',
  'averageConcurrentViewers',
  'peakConcurrentViewers',
  'chatMessages',
];

export function createFixtureChannelDataSource(
  platform: StreamingPlatform
): ChannelDataSource {
  const sourceStreams = getFixtureStreams(platform);
  const sourceStrategies = getFixtureStrategies(platform);
  return {
    platform,
    availableMetrics: platform === 'youtube' ? YOUTUBE_METRICS : TWITCH_METRICS,
    async listStreams(query) {
      return filterAndSortStreams(sourceStreams, query);
    },
    async getStreams(streamIds) {
      const requested = new Set(streamIds);
      return sourceStreams.filter((stream) => requested.has(stream.id));
    },
    async listStrategies() {
      return sourceStrategies;
    },
  };
}

export function createFixtureCompositeDataSource(
  referenceDate = FIXTURE_REFERENCE_DATE
): CompositeChannelDataSource {
  return createCompositeChannelDataSource({
    referenceDate,
    sources: [
      createFixtureChannelDataSource('youtube'),
      createFixtureChannelDataSource('twitch'),
    ],
  });
}

/** Adds host-persisted Agent proposals to the same strategy history. */
export function withStrategyHistory(
  dataSource: CompositeChannelDataSource,
  loadHistory: () => Promise<readonly StrategyRecord[]>
): CompositeChannelDataSource {
  return {
    referenceDate: dataSource.referenceDate,
    platforms: dataSource.platforms,
    listStreams: (query) => dataSource.listStreams(query),
    getStreams: (platform, streamIds) =>
      dataSource.getStreams(platform, streamIds),
    async listStrategies(platform) {
      const [baseStrategies, proposalHistory] = await Promise.all([
        dataSource.listStrategies(platform),
        loadHistory(),
      ]);
      return [
        ...baseStrategies,
        ...proposalHistory.filter(
          (strategy) => !platform || strategy.platform === platform
        ),
      ];
    },
  };
}

export function createCompositeChannelDataSource(input: {
  readonly referenceDate: string;
  readonly sources: readonly ChannelDataSource[];
}): CompositeChannelDataSource {
  assertIsoDate(input.referenceDate, 'referenceDate');
  const sources = new Map(
    input.sources.map((source) => [source.platform, source])
  );
  if (sources.size !== input.sources.length) {
    throw new Error('Only one ChannelDataSource per platform is allowed.');
  }

  const getSource = (platform: StreamingPlatform): ChannelDataSource => {
    const source = sources.get(platform);
    if (!source) throw new Error(`Data source is unavailable for ${platform}.`);
    return source;
  };

  return {
    referenceDate: input.referenceDate,
    platforms: [...sources.keys()],
    async listStreams(query) {
      assertIsoDate(query.since, 'since');
      assertIsoDate(query.until, 'until');
      if (query.platform) return getSource(query.platform).listStreams(query);
      const results = await Promise.all(
        [...sources.values()].map((source) =>
          source.listStreams({ ...query, platform: source.platform })
        )
      );
      return results
        .flat()
        .sort((left, right) =>
          right.publishedAt.localeCompare(left.publishedAt)
        )
        .slice(0, query.limit);
    },
    getStreams(platform, streamIds) {
      return getSource(platform).getStreams(streamIds);
    },
    async listStrategies(platform) {
      if (platform) return getSource(platform).listStrategies();
      const results = await Promise.all(
        [...sources.values()].map((source) => source.listStrategies())
      );
      return results.flat();
    },
  };
}

function filterAndSortStreams(
  source: readonly StreamRecord[],
  query: StreamQuery
): readonly StreamRecord[] {
  return source
    .filter(
      (stream) =>
        stream.publishedAt >= query.since && stream.publishedAt <= query.until
    )
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .slice(0, query.limit);
}

function assertIsoDate(value: string, name: string): void {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new Error(`${name} must be a valid ISO date.`);
  }
}

export type { StrategyRecord, StreamRecord };
