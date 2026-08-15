import {
  defineAgentTool,
  type AgentToolExecutionContext,
  type AgentToolSpec,
} from '@aituber-onair/agent';
import {
  DEFAULT_LIMIT,
  aggregateGamePerformance,
  aggregateOverview,
  clampInteger,
  createDateWindow,
} from './data/aggregate.js';
import type {
  CompositeChannelDataSource,
  StrategyRecord,
  StreamRecord,
  StreamingPlatform,
} from './data/types.js';

export const CHANNEL_TOOL_IDS = [
  'channel.getOverview',
  'channel.listStreams',
  'channel.getGamePerformance',
  'channel.getStreamDetail',
  'strategy.getHistory',
] as const;

export type EvidenceSourceType = 'stream' | 'strategy';

interface LedgerEntry {
  readonly evidence: Set<string>;
  readonly gameIds: Set<string>;
  readonly contentTags: Set<string>;
}

export interface EvidenceLedgerSnapshot {
  readonly evidence: ReadonlySet<string>;
  readonly gameIds: ReadonlySet<string>;
  readonly contentTags: ReadonlySet<string>;
}

export interface EvidenceLedger {
  recordStreams(turnId: string, streams: readonly StreamRecord[]): void;
  recordStrategies(turnId: string, strategies: readonly StrategyRecord[]): void;
  snapshot(turnId: string): EvidenceLedgerSnapshot;
  clear(turnId: string): void;
}

export function evidenceKey(
  platform: StreamingPlatform,
  sourceType: EvidenceSourceType,
  sourceId: string
): string {
  return `${platform}:${sourceType}:${sourceId}`;
}

export function createEvidenceLedger(): EvidenceLedger {
  const byTurn = new Map<string, LedgerEntry>();
  const entryFor = (turnId: string): LedgerEntry => {
    const current = byTurn.get(turnId);
    if (current) return current;
    const created = {
      evidence: new Set<string>(),
      gameIds: new Set<string>(),
      contentTags: new Set<string>(),
    };
    byTurn.set(turnId, created);
    return created;
  };
  return {
    recordStreams(turnId, streams) {
      const entry = entryFor(turnId);
      for (const stream of streams) {
        entry.evidence.add(evidenceKey(stream.platform, 'stream', stream.id));
        entry.gameIds.add(stream.game.id);
        for (const tag of stream.content.tags) entry.contentTags.add(tag);
      }
    },
    recordStrategies(turnId, strategies) {
      const entry = entryFor(turnId);
      for (const strategy of strategies) {
        entry.evidence.add(
          evidenceKey(strategy.platform, 'strategy', strategy.id)
        );
      }
    },
    snapshot(turnId) {
      const entry = byTurn.get(turnId);
      return {
        evidence: new Set(entry?.evidence ?? []),
        gameIds: new Set(entry?.gameIds ?? []),
        contentTags: new Set(entry?.contentTags ?? []),
      };
    },
    clear(turnId) {
      byTurn.delete(turnId);
    },
  };
}

type PlatformInput = { readonly platform?: StreamingPlatform };
type WindowInput = PlatformInput & {
  readonly days?: number;
  readonly limit?: number;
};

export function defineChannelTools(
  dataSource: CompositeChannelDataSource,
  ledger: EvidenceLedger
): readonly AgentToolSpec[] {
  const readWindow = (input: WindowInput) => {
    const window = createDateWindow(dataSource.referenceDate, input.days);
    const limit = clampInteger(input.limit, DEFAULT_LIMIT, 1, 50);
    return { ...window, limit };
  };
  const recordStreams = (
    context: AgentToolExecutionContext,
    streams: readonly StreamRecord[]
  ) => ledger.recordStreams(context.turnId, streams);

  return [
    defineAgentTool({
      id: 'channel.getOverview',
      definition: {
        name: 'channel.getOverview',
        description:
          'Get platform-by-platform channel summaries. Omit platform to receive separate YouTube and Twitch results; metrics are never combined across platforms. days defaults to 90 and is clamped to 1-365.',
        parameters: windowSchema(false),
      },
      risk: 'read',
      async execute(input: WindowInput, context) {
        const window = readWindow({ ...input, limit: 50 });
        const platforms = selectPlatforms(dataSource, input.platform);
        const byPlatform: Record<string, unknown> = {};
        const allStreams: StreamRecord[] = [];
        for (const platform of platforms) {
          const streams = await dataSource.listStreams({
            platform,
            since: window.since,
            until: window.until,
            limit: window.limit,
          });
          allStreams.push(...streams);
          byPlatform[platform] = aggregateOverview(platform, streams);
        }
        recordStreams(context, allStreams);
        return {
          window,
          byPlatform,
          comparable: {
            averageConcurrentViewers: Object.fromEntries(
              platforms.map((platform) => [
                platform,
                (byPlatform[platform] as ReturnType<typeof aggregateOverview>)
                  .metrics.averageConcurrentViewers,
              ])
            ),
          },
          notComparable: [
            'youtube.subscribersGained vs twitch.followersGained',
            'youtube.averageViewDurationSeconds vs twitch unavailable metric',
          ],
        };
      },
    }),
    defineAgentTool({
      id: 'channel.listStreams',
      definition: {
        name: 'channel.listStreams',
        description:
          'List recent streams with normalized metadata and metric provenance. days defaults to 90; limit defaults to 20.',
        parameters: windowSchema(true),
      },
      risk: 'read',
      async execute(input: WindowInput, context) {
        const window = readWindow(input);
        const streams = await dataSource.listStreams({
          ...(input.platform ? { platform: input.platform } : {}),
          since: window.since,
          until: window.until,
          limit: window.limit,
        });
        recordStreams(context, streams);
        return { window, streams };
      },
    }),
    defineAgentTool({
      id: 'channel.getGamePerformance',
      definition: {
        name: 'channel.getGamePerformance',
        description:
          'Aggregate game performance separately for each platform. No cross-platform growth metrics are combined. days defaults to 90.',
        parameters: windowSchema(false),
      },
      risk: 'read',
      async execute(input: WindowInput, context) {
        const window = readWindow({ ...input, limit: 50 });
        const streams = await dataSource.listStreams({
          ...(input.platform ? { platform: input.platform } : {}),
          since: window.since,
          until: window.until,
          limit: window.limit,
        });
        recordStreams(context, streams);
        return {
          window,
          byPlatformAndGame: aggregateGamePerformance(streams),
        };
      },
    }),
    defineAgentTool({
      id: 'channel.getStreamDetail',
      definition: {
        name: 'channel.getStreamDetail',
        description:
          'Get multiple stream details from one platform in a single call. Unknown IDs are reported explicitly.',
        parameters: {
          type: 'object',
          properties: {
            platform: {
              type: 'string',
              enum: ['youtube', 'twitch'],
              description: 'Platform that owns all requested stream IDs.',
            },
            streamIds: {
              type: 'array',
              description: 'One or more platform-local stream IDs.',
              items: { type: 'string' },
            },
          },
          required: ['platform', 'streamIds'],
          additionalProperties: false,
        },
      },
      risk: 'read',
      async execute(
        input: {
          readonly platform: StreamingPlatform;
          readonly streamIds: readonly string[];
        },
        context
      ) {
        const ids = [...new Set(input.streamIds.map((id) => id.trim()))].filter(
          Boolean
        );
        if (ids.length === 0 || ids.length > 10) {
          throw new Error('streamIds must contain between 1 and 10 IDs.');
        }
        const streams = await dataSource.getStreams(input.platform, ids);
        recordStreams(context, streams);
        const found = new Set(streams.map((stream) => stream.id));
        return {
          platform: input.platform,
          streams,
          unknownStreamIds: ids.filter((id) => !found.has(id)),
        };
      },
    }),
    defineAgentTool({
      id: 'strategy.getHistory',
      definition: {
        name: 'strategy.getHistory',
        description:
          'Get prior strategy hypotheses and their supported, refuted, or mixed outcomes.',
        parameters: platformSchema(),
      },
      risk: 'read',
      async execute(input: PlatformInput, context) {
        const strategies = await dataSource.listStrategies(input.platform);
        ledger.recordStrategies(context.turnId, strategies);
        return { strategies };
      },
    }),
  ];
}

function selectPlatforms(
  dataSource: CompositeChannelDataSource,
  platform?: StreamingPlatform
): readonly StreamingPlatform[] {
  return platform ? [platform] : dataSource.platforms;
}

function platformSchema() {
  return {
    type: 'object' as const,
    properties: {
      platform: {
        type: 'string',
        enum: ['youtube', 'twitch'],
        description:
          'Optional platform filter. Omit it to receive separate results for both platforms.',
      },
    },
    additionalProperties: false,
  };
}

function windowSchema(includeLimit: boolean) {
  return {
    type: 'object' as const,
    properties: {
      ...platformSchema().properties,
      days: {
        type: 'integer',
        description: 'Lookback days. Defaults to 90; handler clamps to 1-365.',
      },
      ...(includeLimit
        ? {
            limit: {
              type: 'integer',
              description:
                'Maximum streams returned. Defaults to 20; handler clamps to 1-50.',
            },
          }
        : {}),
    },
    additionalProperties: false,
  };
}
