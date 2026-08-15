import { describe, expect, it } from 'vitest';
import {
  getFixtureStrategies,
  getFixtureStreams,
} from '../src/data/fixtures.js';
import { aggregateGamePerformance } from '../src/data/aggregate.js';
import { createEvidenceSnapshot } from '../src/evidence.js';
import {
  parseAndValidateProposal,
  type ChannelStrategyProposal,
} from '../src/proposal.js';

const fixtureStreams = getFixtureStreams();
const fixtureSnapshot = createEvidenceSnapshot({
  streams: fixtureStreams,
  games: aggregateGamePerformance(fixtureStreams),
  strategies: getFixtureStrategies(),
});

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
  it('accepts only evidence, games, and tags present in the dataset', () => {
    expect(
      parseAndValidateProposal(JSON.stringify(proposal), fixtureSnapshot)
    ).toEqual(proposal);
  });

  it('rejects evidence not present in the dataset', () => {
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
      parseAndValidateProposal(JSON.stringify(invalid), fixtureSnapshot)
    ).toThrow(/not present in the dataset/);
  });
});
