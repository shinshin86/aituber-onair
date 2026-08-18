import { describe, expect, it } from 'vitest';
import {
  createFixtureCompositeDataSource,
  withStrategyHistory,
} from '../src/data/dataSource.js';
import type { StrategyRecord } from '../src/data/types.js';

const agentProposal: StrategyRecord = {
  id: 'agent-001',
  platform: 'youtube',
  hypothesis: 'Test the Agent proposal.',
  targetStreamIds: [],
  result: 'pending',
  finding: 'The proposal has not been tested yet.',
  source: 'agent',
  proposedAt: '2026-08-15T00:00:00.000Z',
};

describe('channel strategy data source history', () => {
  it('returns fixture strategies and persistent Agent proposals together', async () => {
    const source = withStrategyHistory(
      createFixtureCompositeDataSource(),
      async () => [agentProposal]
    );

    const all = await source.listStrategies();
    const youtube = await source.listStrategies('youtube');
    const twitch = await source.listStrategies('twitch');

    expect(all.map((strategy) => strategy.id)).toEqual([
      'strategy-001',
      'strategy-002',
      'strategy-003',
      'agent-001',
    ]);
    expect(youtube.map((strategy) => strategy.id)).toContain('agent-001');
    expect(twitch.map((strategy) => strategy.id)).not.toContain('agent-001');
  });
});
