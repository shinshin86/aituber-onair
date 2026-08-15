import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { StrategyRecord } from '../data/types';
import { StrategyList } from './Panels';

const strategies: readonly StrategyRecord[] = [
  {
    id: 'agent-001',
    platform: 'youtube',
    hypothesis: 'Pending Agent proposal.',
    targetStreamIds: [],
    result: 'pending',
    finding: 'The proposal has not been tested yet.',
    source: 'agent',
    proposedAt: '2026-08-15T00:00:00.000Z',
  },
  {
    id: 'agent-002',
    platform: 'twitch',
    hypothesis: 'Resolved Agent proposal.',
    targetStreamIds: [],
    result: 'supported',
    finding: 'The target was reached.',
    source: 'agent',
    proposedAt: '2026-08-14T00:00:00.000Z',
  },
  {
    id: 'strategy-001',
    platform: 'youtube',
    hypothesis: 'Fixture proposal.',
    targetStreamIds: ['yt-mc-viewer-01'],
    result: 'refuted',
    finding: 'The fixture result is immutable.',
    source: 'fixture',
  },
];

describe('StrategyList', () => {
  it('shows pending status and an outcome form only for pending Agent proposals', () => {
    const markup = renderToStaticMarkup(
      <StrategyList
        strategies={strategies}
        onSelectStream={() => undefined}
        onRecordOutcome={async () => undefined}
      />
    );

    expect(markup).toContain('未検証');
    expect(markup).toContain('Agent の提案');
    expect(markup).toContain('提案日時:');
    expect(markup.match(/<form/g)).toHaveLength(1);
    expect(markup).toContain('agent-001 の結果を記録');
    expect(markup).not.toContain('agent-002 の結果を記録');
    expect(markup).not.toContain('strategy-001 の結果を記録');
  });
});
