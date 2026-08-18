import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildDashboard } from '../server/controller.js';
import {
  CHANNEL_DATA_FILES,
  ensureChannelStrategyWorkspace,
  refreshChannelStrategyWorkspace,
  resolveChannelStrategyWorkspaceDir,
} from '../server/workspace.js';
import { createFixtureCompositeDataSource } from '../src/data/dataSource.js';
import { withStrategyHistory } from '../src/data/dataSource.js';
import type { StrategyRecord } from '../src/data/types.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }))
  );
});

describe('channel strategy data workspace', () => {
  it('atomically regenerates AGENTS.md and all four normalized JSON files', async () => {
    const root = await temporaryDirectory();
    const workspace = join(root, 'workspace');
    const dashboard = await buildDashboard(createFixtureCompositeDataSource());

    await refreshChannelStrategyWorkspace(workspace, dashboard);
    await refreshChannelStrategyWorkspace(workspace, dashboard);

    expect((await lstat(workspace)).isDirectory()).toBe(true);
    expect(await readFile(join(workspace, 'AGENTS.md'), 'utf8')).toContain(
      'Return exactly one JSON object'
    );
    for (const relativePath of CHANNEL_DATA_FILES) {
      const parsed = JSON.parse(
        await readFile(join(workspace, relativePath), 'utf8')
      ) as Record<string, unknown>;
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.referenceDate).toBe(dashboard.referenceDate);
    }
    expect((await readdir(join(workspace, 'data'))).sort()).toEqual([
      'games.json',
      'overview.json',
      'strategies.json',
      'streams.json',
    ]);
  });

  it('uses the example-local workspace by default', () => {
    expect(
      resolveChannelStrategyWorkspaceDir(undefined, '/path/to/example')
    ).toBe(resolve('/path/to/example/workspace'));
    expect(
      resolveChannelStrategyWorkspaceDir(
        '/path/to/external-workspace',
        '/path/to/example'
      )
    ).toBe(resolve('/path/to/external-workspace'));
  });

  it('writes Agent proposal history into strategies.json and AGENTS.md', async () => {
    const root = await temporaryDirectory();
    const workspace = join(root, 'workspace');
    const agentProposal: StrategyRecord = {
      id: 'agent-001',
      platform: 'youtube',
      hypothesis: 'Review a saved Agent hypothesis.',
      targetStreamIds: [],
      result: 'pending',
      finding: 'The proposal has not been tested yet.',
      source: 'agent',
      proposedAt: '2026-08-15T00:00:00.000Z',
    };
    const dataSource = withStrategyHistory(
      createFixtureCompositeDataSource(),
      async () => [agentProposal]
    );

    await refreshChannelStrategyWorkspace(
      workspace,
      await buildDashboard(dataSource)
    );

    const strategiesFile = JSON.parse(
      await readFile(join(workspace, 'data/strategies.json'), 'utf8')
    ) as { readonly strategies: readonly StrategyRecord[] };
    expect(strategiesFile.strategies.at(-1)).toEqual(agentProposal);
    expect(await readFile(join(workspace, 'AGENTS.md'), 'utf8')).toContain(
      'your own earlier proposals'
    );
  });

  it('rejects a symbolic-link workspace', async () => {
    const root = await temporaryDirectory();
    const target = join(root, 'target');
    const workspace = join(root, 'workspace');
    await ensureChannelStrategyWorkspace(target);
    await symlink(target, workspace);

    await expect(ensureChannelStrategyWorkspace(workspace)).rejects.toThrow(
      /symbolic link/
    );
  });
});

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'channel-staff-workspace-'));
  temporaryDirectories.push(path);
  return path;
}
