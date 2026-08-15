import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createChannelStrategyServer } from '../server/app.js';
import {
  type ChannelStrategyController,
  createChannelStrategyController,
} from '../server/controller.js';
import { createStubCodexBackend } from '../server/stubCodexBackend.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }))
  );
});

describe('channel strategy proposal outcome API', () => {
  it('records an outcome and exposes the updated dashboard state', async () => {
    const controller = await createController();
    await controller.runStrategy(() => undefined);
    const { server, baseUrl } = await startServer(controller);
    try {
      const response = await postOutcome(baseUrl, 'agent-001', {
        result: 'supported',
        finding: 'Average view duration exceeded the target.',
      });
      expect(response.status).toBe(200);

      const state = (await (await fetch(`${baseUrl}/api/state`)).json()) as {
        readonly dashboard: typeof controller.dashboard;
      };
      expect(
        state.dashboard.strategies.find(
          (strategy) => strategy.id === 'agent-001'
        )
      ).toMatchObject({
        result: 'supported',
        finding: 'Average view duration exceeded the target.',
      });
    } finally {
      await closeServer(server);
      await controller.close();
    }
  });

  it('rejects unknown IDs, invalid results, and empty findings', async () => {
    const controller = await createController();
    await controller.runStrategy(() => undefined);
    const { server, baseUrl } = await startServer(controller);
    try {
      expect(
        (
          await postOutcome(baseUrl, 'agent-999', {
            result: 'supported',
            finding: 'A valid finding.',
          })
        ).status
      ).toBe(404);
      expect(
        (
          await postOutcome(baseUrl, 'agent-001', {
            result: 'pending',
            finding: 'A valid finding.',
          })
        ).status
      ).toBe(400);
      expect(
        (
          await postOutcome(baseUrl, 'agent-001', {
            result: 'mixed',
            finding: '   ',
          })
        ).status
      ).toBe(400);
    } finally {
      await closeServer(server);
      await controller.close();
    }
  });

  it('rejects outcome updates for fixture strategies', async () => {
    const controller = await createController();
    const { server, baseUrl } = await startServer(controller);
    try {
      const response = await postOutcome(baseUrl, 'strategy-001', {
        result: 'refuted',
        finding: 'Fixture data must remain immutable.',
      });
      expect(response.status).toBe(400);
    } finally {
      await closeServer(server);
      await controller.close();
    }
  });
});

async function createController(): Promise<ChannelStrategyController> {
  const root = await temporaryDirectory();
  return createChannelStrategyController({
    backend: createStubCodexBackend({ defaultDelayMs: 0 }),
    workspaceDir: join(root, 'workspace'),
  });
}

async function startServer(controller: ChannelStrategyController) {
  const server = createChannelStrategyServer({
    controller,
    publicDir: '.',
    mode: 'demo',
    model: 'fixture-codex',
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

function postOutcome(
  baseUrl: string,
  id: string,
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(`${baseUrl}/api/proposals/${id}/outcome`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function closeServer(
  server: ReturnType<typeof createChannelStrategyServer>
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'channel-staff-server-'));
  temporaryDirectories.push(path);
  return path;
}
