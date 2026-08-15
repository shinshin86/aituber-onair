import { describe, expect, it } from 'vitest';
import { buildDashboard } from '../server/controller.js';
import { createFixtureCompositeDataSource } from '../src/data/dataSource.js';
import type { StrategyRecord } from '../src/data/types.js';
import { createEvidenceSnapshot, evidenceKey } from '../src/evidence.js';

describe('dataset evidence snapshot', () => {
  it('contains every stream, strategy, game, and tag in the dashboard dataset', async () => {
    const dashboard = await buildDashboard(createFixtureCompositeDataSource());
    const snapshot = createEvidenceSnapshot(dashboard);

    for (const stream of dashboard.streams) {
      expect(
        snapshot.evidence.has(evidenceKey(stream.platform, 'stream', stream.id))
      ).toBe(true);
      expect(snapshot.gameIds.has(stream.game.id)).toBe(true);
      for (const tag of stream.content.tags) {
        expect(snapshot.contentTags.has(tag)).toBe(true);
      }
    }
    for (const strategy of dashboard.strategies) {
      expect(
        snapshot.evidence.has(
          evidenceKey(strategy.platform, 'strategy', strategy.id)
        )
      ).toBe(true);
    }
  });

  it('allows an Agent proposal ID from the current strategy dataset', async () => {
    const dashboard = await buildDashboard(createFixtureCompositeDataSource());
    const agentProposal: StrategyRecord = {
      id: 'agent-001',
      platform: 'youtube',
      hypothesis: 'Saved Agent hypothesis.',
      targetStreamIds: [],
      result: 'pending',
      finding: 'The proposal has not been tested yet.',
      source: 'agent',
      proposedAt: '2026-08-15T00:00:00.000Z',
    };
    const snapshot = createEvidenceSnapshot({
      ...dashboard,
      strategies: [...dashboard.strategies, agentProposal],
    });

    expect(
      snapshot.evidence.has(
        evidenceKey('youtube', 'strategy', agentProposal.id)
      )
    ).toBe(true);
  });
});
