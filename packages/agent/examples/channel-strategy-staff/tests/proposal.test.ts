import { describe, expect, it } from 'vitest';
import {
  getFixtureStrategies,
  getFixtureStreams,
} from '../src/data/fixtures.js';
import {
  parseAndValidateProposal,
  type ChannelStrategyProposal,
} from '../src/proposal.js';
import { createEvidenceLedger } from '../src/tools.js';

const proposal: ChannelStrategyProposal = {
  schemaVersion: 1,
  summary: 'Run an evidence-backed Minecraft stream.',
  recommendation: {
    platform: 'youtube',
    gameId: 'minecraft',
    format: 'viewer-participation',
    contentTags: ['exploration'],
  },
  observedFacts: [
    {
      statement: 'The fixture contains a strong Minecraft stream.',
      evidence: [
        {
          platform: 'youtube',
          sourceType: 'stream',
          sourceId: 'yt-mc-viewer-01',
        },
      ],
    },
  ],
  inferences: [{ statement: 'Test the format again.', basedOn: [0] }],
  risks: ['The result may not repeat.'],
  limitations: ['Fixture data is synthetic.'],
  experiment: {
    hypothesis: 'Retention will improve.',
    successMetrics: [
      {
        metric: 'averageViewDurationSeconds',
        direction: 'increase',
        targetPercent: 5,
      },
    ],
  },
};

describe('proposal validation', () => {
  it('accepts only evidence, games, and tags observed through Tools', () => {
    const ledger = createEvidenceLedger();
    ledger.recordStreams('turn-1', getFixtureStreams());
    ledger.recordStrategies('turn-1', getFixtureStrategies());

    expect(
      parseAndValidateProposal(
        JSON.stringify(proposal),
        ledger.snapshot('turn-1')
      )
    ).toEqual(proposal);
  });

  it('rejects evidence not returned by a Tool', () => {
    const ledger = createEvidenceLedger();
    ledger.recordStreams('turn-1', [getFixtureStreams('youtube')[0]]);
    const invalid = {
      ...proposal,
      observedFacts: [
        {
          statement: 'Invented evidence.',
          evidence: [
            {
              platform: 'youtube',
              sourceType: 'stream',
              sourceId: 'unknown-stream',
            },
          ],
        },
      ],
    };

    expect(() =>
      parseAndValidateProposal(
        JSON.stringify(invalid),
        ledger.snapshot('turn-1')
      )
    ).toThrow(/not returned by a Tool/);
  });

  it('clears the Turn ledger without affecting another Turn', () => {
    const ledger = createEvidenceLedger();
    ledger.recordStreams('turn-1', getFixtureStreams());
    ledger.recordStreams('turn-2', [getFixtureStreams('twitch')[0]]);
    ledger.clear('turn-1');

    expect(ledger.snapshot('turn-1').evidence.size).toBe(0);
    expect(ledger.snapshot('turn-2').evidence.size).toBe(1);
  });
});
