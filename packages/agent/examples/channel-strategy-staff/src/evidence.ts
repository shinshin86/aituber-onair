import type { GamePerformance } from './data/aggregate.js';
import type {
  StrategyRecord,
  StreamRecord,
  StreamingPlatform,
} from './data/types.js';

export type EvidenceSourceType = 'stream' | 'strategy';

export interface EvidenceLedgerSnapshot {
  readonly evidence: ReadonlySet<string>;
  readonly gameIds: ReadonlySet<string>;
  readonly contentTags: ReadonlySet<string>;
}

export interface EvidenceDataset {
  readonly streams: readonly StreamRecord[];
  readonly games: readonly GamePerformance[];
  readonly strategies: readonly StrategyRecord[];
}

export function evidenceKey(
  platform: StreamingPlatform,
  sourceType: EvidenceSourceType,
  sourceId: string
): string {
  return `${platform}:${sourceType}:${sourceId}`;
}

/**
 * Builds the proposal allow-list from the host-normalized dataset. Unlike the
 * former Tool ledger, this proves that an ID exists in the current dataset,
 * not that Codex read that record during this Turn.
 */
export function createEvidenceSnapshot(
  dataset: EvidenceDataset
): EvidenceLedgerSnapshot {
  const evidence = new Set<string>();
  const gameIds = new Set<string>();
  const contentTags = new Set<string>();

  for (const stream of dataset.streams) {
    evidence.add(evidenceKey(stream.platform, 'stream', stream.id));
    gameIds.add(stream.game.id);
    for (const tag of stream.content.tags) contentTags.add(tag);
  }
  for (const game of dataset.games) {
    gameIds.add(game.gameId);
    for (const tag of game.contentTags) contentTags.add(tag);
  }
  for (const strategy of dataset.strategies) {
    evidence.add(evidenceKey(strategy.platform, 'strategy', strategy.id));
  }

  return { evidence, gameIds, contentTags };
}
