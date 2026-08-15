import { describe, expect, it } from 'vitest';
import { buildDashboard } from '../server/controller.js';
import { createFixtureCompositeDataSource } from '../src/data/dataSource.js';
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
});
