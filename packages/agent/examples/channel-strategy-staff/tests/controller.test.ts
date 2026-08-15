import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentEvent } from '@aituber-onair/agent';
import { afterEach, describe, expect, it } from 'vitest';
import { createChannelStrategyController } from '../server/controller.js';
import {
  readStoredSession,
  writeStoredSession,
} from '../server/sessionStore.js';
import { readProposalHistory } from '../server/strategyStore.js';
import {
  createStubCodexBackend,
  DEMO_PROPOSAL,
} from '../server/stubCodexBackend.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }))
  );
});

describe('channel strategy controller', () => {
  it('exposes the fixture window written to the Codex workspace', async () => {
    const backend = createStubCodexBackend();
    const controller = await createController(backend);
    try {
      const { dashboard } = controller;

      expect(dashboard.days).toBe(90);
      expect(dashboard.streams).toHaveLength(12);
      expect(dashboard.platforms.map((entry) => entry.platform)).toEqual([
        'youtube',
        'twitch',
      ]);
      expect(dashboard.strategies.map((entry) => entry.result)).toEqual([
        'supported',
        'refuted',
        'mixed',
      ]);
      expect(dashboard.platforms[0].metrics.followersGained.status).toBe(
        'unavailable'
      );
      expect(backend.receivedInputs[0].tools).toEqual([]);
    } finally {
      await controller.close();
    }
  });

  it('accepts the last of multiple completed messages and attaches the proposal', async () => {
    const backend = createStubCodexBackend({
      turns: [
        {
          messages: [
            'I will inspect the normalized files.',
            'The comparison is complete.',
            JSON.stringify(DEMO_PROPOSAL),
          ],
          finalMessage: JSON.stringify(DEMO_PROPOSAL),
          delayMs: 0,
        },
      ],
    });
    const controller = await createController(backend);
    const events: AgentEvent[] = [];
    try {
      const result = await controller.runStrategy((event) =>
        events.push(event)
      );

      expect(
        events.filter((event) => event.type === 'message.completed')
      ).toHaveLength(3);
      expect(result.artifacts.map((artifact) => artifact.type)).toEqual([
        'codex.plan',
        'codex.command-execution',
        'channel-strategy-proposal',
      ]);
      expect(events.at(-1)?.type).toBe('turn.completed');
    } finally {
      await controller.close();
    }
  });

  it('fails the Turn when the final completed message is invalid JSON', async () => {
    const backend = createStubCodexBackend({
      turns: [
        {
          messages: ['Investigating.', 'not-json'],
          finalMessage: 'not-json',
          delayMs: 0,
        },
      ],
    });
    const controller = await createController(backend);
    const events: AgentEvent[] = [];
    try {
      await expect(
        controller.runStrategy((event) => events.push(event))
      ).rejects.toThrow(/hook.*output/i);
      expect(events.some((event) => event.type === 'turn.failed')).toBe(true);
    } finally {
      await controller.close();
    }
  });

  it('appends one pending proposal only after a successful Turn', async () => {
    const root = await temporaryDirectory();
    const workspaceDir = join(root, 'workspace');
    const controller = await createChannelStrategyController({
      backend: createStubCodexBackend({ defaultDelayMs: 0 }),
      workspaceDir,
    });
    try {
      await controller.runStrategy(() => undefined);

      const history = await readProposalHistory(
        join(root, 'channel-strategy-proposals.json')
      );
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        id: 'agent-001',
        platform: DEMO_PROPOSAL.recommendation.platform,
        hypothesis: DEMO_PROPOSAL.experiment.hypothesis,
        targetStreamIds: [],
        result: 'pending',
        source: 'agent',
      });
      expect(history[0].finding).toContain('minecraft');
      expect(Number.isNaN(Date.parse(history[0].proposedAt ?? ''))).toBe(false);
      expect(controller.dashboard.strategies.at(-1)?.id).toBe('agent-001');
    } finally {
      await controller.close();
    }
  });

  it('does not append a proposal when the Turn fails validation', async () => {
    const root = await temporaryDirectory();
    const controller = await createChannelStrategyController({
      backend: createStubCodexBackend({
        turns: [{ finalMessage: 'not-json', delayMs: 0 }],
      }),
      workspaceDir: join(root, 'workspace'),
    });
    try {
      await expect(controller.runStrategy(() => undefined)).rejects.toThrow(
        /hook.*output/i
      );
      expect(
        await readProposalHistory(join(root, 'channel-strategy-proposals.json'))
      ).toEqual([]);
    } finally {
      await controller.close();
    }
  });

  it('accepts an Agent proposal ID as evidence on the next Turn', async () => {
    const root = await temporaryDirectory();
    const followUpProposal = {
      ...DEMO_PROPOSAL,
      summary: 'Use the prior Agent proposal as feedback for the next test.',
      observedFacts: [
        {
          statement: 'The previous Agent proposal is still pending.',
          evidence: [
            {
              platform: 'youtube' as const,
              sourceType: 'strategy' as const,
              sourceId: 'agent-001',
            },
          ],
        },
      ],
      inferences: [
        {
          statement: 'Test a different format while that result is pending.',
          basedOn: [0],
        },
      ],
      experiment: {
        ...DEMO_PROPOSAL.experiment,
        hypothesis: 'A follow-up format avoids repeating the pending proposal.',
      },
    };
    const backend = createStubCodexBackend({
      turns: [
        { finalMessage: JSON.stringify(DEMO_PROPOSAL), delayMs: 0 },
        { finalMessage: JSON.stringify(followUpProposal), delayMs: 0 },
      ],
    });
    const controller = await createChannelStrategyController({
      backend,
      workspaceDir: join(root, 'workspace'),
    });
    try {
      await controller.runStrategy(() => undefined);
      await expect(
        controller.runStrategy(() => undefined)
      ).resolves.toBeDefined();

      const history = await readProposalHistory(
        join(root, 'channel-strategy-proposals.json')
      );
      expect(history.map((strategy) => strategy.id)).toEqual([
        'agent-001',
        'agent-002',
      ]);
      expect(history[1].hypothesis).toBe(
        followUpProposal.experiment.hypothesis
      );
    } finally {
      await controller.close();
    }
  });

  it('interrupts an active Codex-shaped Turn', async () => {
    const backend = createStubCodexBackend({ defaultDelayMs: 1_000 });
    const controller = await createController(backend);
    let notifyStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    const events: AgentEvent[] = [];
    try {
      const run = controller
        .runStrategy((event) => {
          events.push(event);
          if (event.type === 'turn.started') notifyStarted?.();
        })
        .catch((error: unknown) => error);
      await started;

      await controller.interrupt();
      const error = await run;

      expect(error).toMatchObject({ code: 'AGENT_INTERRUPTED' });
      expect(events.some((event) => event.type === 'turn.interrupted')).toBe(
        true
      );
    } finally {
      await controller.close();
    }
  });

  it('persists a backend Session ID and resumes it after restart', async () => {
    const root = await temporaryDirectory();
    const workspaceDir = join(root, 'workspace');
    const sessionFile = join(root, 'session.json');
    const firstBackend = createStubCodexBackend();
    const first = await createChannelStrategyController({
      backend: firstBackend,
      workspaceDir,
      persistSession: (stored) => writeStoredSession(sessionFile, stored),
    });
    const firstId = first.backendSessionId;
    await first.runStrategy(() => undefined);
    expect(first.threadTurnCount).toBe(1);
    await first.close();

    const storedSession = await readStoredSession(sessionFile);
    const secondBackend = createStubCodexBackend();
    const second = await createChannelStrategyController({
      backend: secondBackend,
      workspaceDir,
      storedSession,
      persistSession: (stored) => writeStoredSession(sessionFile, stored),
    });
    try {
      expect(firstId).toBeTruthy();
      expect(second.resumed).toBe(true);
      expect(second.backendSessionId).toBe(firstId);
      expect(second.threadTurnCount).toBe(1);
      expect(secondBackend.resumedSessionIds).toEqual([firstId]);
    } finally {
      await second.close();
    }
  });

  it('closes and resumes the saved thread after consecutive failures', async () => {
    const backend = createStubCodexBackend({
      turns: [
        { fail: new Error('failure 1') },
        { fail: new Error('failure 2') },
        { fail: new Error('failure 3') },
      ],
    });
    const controller = await createController(backend, {
      selfHealFailureThreshold: 3,
    });
    const sessionId = controller.backendSessionId;
    try {
      for (let index = 1; index <= 3; index += 1) {
        await expect(controller.runStrategy(() => undefined)).rejects.toThrow(
          /failed during the Agent Turn/
        );
      }

      expect(backend.sessionCloseCount.value).toBe(1);
      expect(backend.resumedSessionIds).toEqual([sessionId]);
      expect(controller.backendSessionId).toBe(sessionId);
    } finally {
      await controller.close();
    }
  });
});

async function createController(
  backend: ReturnType<typeof createStubCodexBackend>,
  options: { readonly selfHealFailureThreshold?: number } = {}
) {
  const root = await temporaryDirectory();
  return createChannelStrategyController({
    backend,
    workspaceDir: join(root, 'workspace'),
    ...options,
  });
}

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'channel-staff-controller-'));
  temporaryDirectories.push(path);
  return path;
}
