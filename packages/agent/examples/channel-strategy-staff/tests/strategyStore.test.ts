import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appendProposal,
  readProposalHistory,
  recordOutcome,
} from '../server/strategyStore.js';
import { getFixtureStrategies } from '../src/data/fixtures.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }))
  );
});

describe('channel strategy proposal store', () => {
  it('atomically round-trips appended proposals and recorded outcomes', async () => {
    const root = await temporaryDirectory();
    const filePath = join(root, 'proposals.json');

    const appended = await appendProposal(filePath, proposalInput());
    const updated = await recordOutcome(
      filePath,
      appended.id,
      'supported',
      'The target metrics improved.'
    );

    expect(await readProposalHistory(filePath)).toEqual([updated]);
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual([updated]);
    expect(
      (await readdir(root)).filter((name) => name.endsWith('.tmp'))
    ).toEqual([]);
  });

  it('treats a missing or corrupt file as empty history', async () => {
    const root = await temporaryDirectory();
    const filePath = join(root, 'proposals.json');

    expect(await readProposalHistory(filePath)).toEqual([]);
    await writeFile(filePath, '{not-json');
    expect(await readProposalHistory(filePath)).toEqual([]);
  });

  it('allocates sequential agent IDs without colliding with fixture IDs', async () => {
    const root = await temporaryDirectory();
    const filePath = join(root, 'proposals.json');

    const first = await appendProposal(filePath, proposalInput());
    const second = await appendProposal(filePath, {
      ...proposalInput(),
      hypothesis: 'Try a different follow-up format.',
    });

    expect([first.id, second.id]).toEqual(['agent-001', 'agent-002']);
    expect(getFixtureStrategies().map((strategy) => strategy.id)).not.toContain(
      first.id
    );
  });
});

function proposalInput() {
  return {
    platform: 'youtube' as const,
    hypothesis: 'A clear exploration goal improves retention.',
    targetStreamIds: [],
    result: 'pending' as const,
    finding: 'Unverified proposal for minecraft in challenge format.',
    source: 'agent' as const,
    proposedAt: '2026-08-15T00:00:00.000Z',
  };
}

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'channel-staff-proposals-'));
  temporaryDirectories.push(path);
  return path;
}
