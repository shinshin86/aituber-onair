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
