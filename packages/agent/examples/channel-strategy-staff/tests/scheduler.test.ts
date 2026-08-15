import type { AgentRunResult } from '@aituber-onair/agent';
import { describe, expect, it } from 'vitest';
import { createChannelStrategyServer } from '../server/app.js';
import type { ChannelStrategyController } from '../server/controller.js';
import type { ChannelDashboard } from '../src/protocol.js';

const dashboard: ChannelDashboard = {
  referenceDate: '2026-08-01T00:00:00.000Z',
  since: '2026-05-03T00:00:00.000Z',
  days: 90,
  platforms: [],
  streams: [],
  games: [],
  strategies: [],
};

function createStubController(): {
  readonly controller: ChannelStrategyController;
  readonly runs: string[];
} {
  const runs: string[] = [];
  const controller: ChannelStrategyController = {
    dashboard,
    async runStrategy() {
      runs.push('run');
      return {
        turnId: `turn-${runs.length}`,
        message: 'ok',
        artifacts: [],
      } satisfies AgentRunResult;
    },
    async close() {
      // The stub owns no Agent.
    },
  };
  return { controller, runs };
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('host scheduler', () => {
  it('runs Turns without any client request', async () => {
    const { controller, runs } = createStubController();
    const server = createChannelStrategyServer({
      controller,
      publicDir: '.',
      mode: 'demo',
      model: 'fixture-demo',
      budget: { maxToolCallsPerTurn: 14, maxToolRounds: 8 },
      autoRunIntervalMs: 40,
      autoRunStartDelayMs: 10,
    });

    try {
      await delay(160);
      expect(runs.length).toBeGreaterThanOrEqual(2);
    } finally {
      server.close();
    }
  });

  it('stays idle when the host disables the schedule', async () => {
    const { controller, runs } = createStubController();
    const server = createChannelStrategyServer({
      controller,
      publicDir: '.',
      mode: 'demo',
      model: 'fixture-demo',
      budget: { maxToolCallsPerTurn: 14, maxToolRounds: 8 },
      autoRunIntervalMs: 0,
      autoRunStartDelayMs: 10,
    });

    try {
      await delay(80);
      expect(runs).toHaveLength(0);
    } finally {
      server.close();
    }
  });
});
