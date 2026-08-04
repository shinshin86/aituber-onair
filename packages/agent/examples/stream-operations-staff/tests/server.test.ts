import type { AddressInfo } from 'node:net';
import type { AgentEvent } from '@aituber-onair/agent';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStreamOperationsServer } from '../server/app.js';
import type { StreamOperationsController } from '../server/controller.js';

interface RunningServer {
  readonly baseUrl: string;
  readonly close: () => Promise<void>;
}

interface SseFrame {
  readonly id?: number;
  readonly envelope: Record<string, unknown>;
}

const running: RunningServer[] = [];

afterEach(async () => {
  while (running.length > 0) await running.pop()?.close();
});

async function startServer(
  overrides: Partial<StreamOperationsController> = {}
): Promise<{
  readonly baseUrl: string;
  readonly controller: StreamOperationsController;
}> {
  const controller: StreamOperationsController = {
    backendSessionId: 'thread-test',
    resumed: false,
    async analyzeCommentIds(commentIds, onEvent) {
      onEvent(createEvent('turn.started'));
      return {
        analysis: {
          analyzedCommentCount: commentIds.length,
          selectedCommentIds: commentIds.slice(-1),
          safetyReports: [],
        },
      };
    },
    async createPostStreamReport(onEvent) {
      onEvent(createEvent('turn.started'));
      return {};
    },
    async resolveApproval() {},
    async interrupt() {},
    reset() {},
    async close() {},
    ...overrides,
  };
  const server = createStreamOperationsServer({
    controller,
    publicDir: new URL('../public', import.meta.url).pathname,
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const handle: RunningServer = {
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () => {
      const closed = new Promise<void>((resolve) =>
        server.close(() => resolve())
      );
      server.closeAllConnections?.();
      await closed;
      await controller.close();
    },
  };
  running.push(handle);
  return { baseUrl: handle.baseUrl, controller };
}

function createEvent(type: 'turn.started'): AgentEvent {
  return {
    id: `event-${type}`,
    type,
    timestamp: '2026-08-05T00:00:00.000Z',
    agentId: 'miko',
    sessionId: 'stream',
    turnId: 'turn-1',
  };
}

async function postJson(
  baseUrl: string,
  path: string,
  body: unknown,
  origin = baseUrl
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
      'sec-fetch-site': origin === baseUrl ? 'same-origin' : 'cross-site',
    },
    body: JSON.stringify(body),
  });
}

async function collectSse(
  baseUrl: string,
  isDone: (frames: readonly SseFrame[]) => boolean,
  lastEventId?: number
): Promise<SseFrame[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  const frames: SseFrame[] = [];
  try {
    const response = await fetch(`${baseUrl}/api/events`, {
      signal: controller.signal,
      ...(lastEventId
        ? { headers: { 'last-event-id': String(lastEventId) } }
        : {}),
    });
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return frames;
      buffered += decoder.decode(value, { stream: true });
      let separator = buffered.indexOf('\n\n');
      while (separator !== -1) {
        const frameText = buffered.slice(0, separator);
        buffered = buffered.slice(separator + 2);
        const lines = frameText.split('\n');
        const idLine = lines.find((line) => line.startsWith('id: '));
        const data = lines
          .filter((line) => line.startsWith('data: '))
          .map((line) => line.slice(6))
          .join('\n');
        if (data) {
          frames.push({
            ...(idLine ? { id: Number(idLine.slice(4)) } : {}),
            envelope: JSON.parse(data),
          });
        }
        if (isDone(frames)) return frames;
        separator = buffered.indexOf('\n\n');
      }
    }
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

describe('stream operations HTTP server', () => {
  it('streams an operation and replays missed envelopes by Last-Event-ID', async () => {
    const { baseUrl } = await startServer();
    const collecting = collectSse(baseUrl, (frames) =>
      frames.some((frame) => frame.envelope.kind === 'operation-completed')
    );

    const response = await postJson(baseUrl, '/api/comments', {
      operationId: 'operation-1',
      commentIds: ['c01', 'c02'],
    });
    expect(response.status).toBe(202);
    const frames = await collecting;
    expect(frames.some((frame) => frame.envelope.kind === 'agent-event')).toBe(
      true
    );
    const firstReplayableId = frames.find((frame) => frame.id)?.id;
    expect(firstReplayableId).toBeDefined();

    const replayed = await collectSse(
      baseUrl,
      (next) =>
        next.some((frame) => frame.envelope.kind === 'operation-completed'),
      firstReplayableId
    );
    expect(
      replayed.every((frame) => frame.id === undefined || frame.id > 1)
    ).toBe(true);
    expect(
      replayed.some((frame) => frame.envelope.kind === 'operation-completed')
    ).toBe(true);
  });

  it('routes allow-once approval and interrupt controls', async () => {
    let releaseApproval: (() => void) | undefined;
    const approvalGate = new Promise<void>((resolve) => {
      releaseApproval = resolve;
    });
    const resolveApproval = vi.fn(async () => releaseApproval?.());
    const interrupt = vi.fn(async () => undefined);
    const { baseUrl } = await startServer({
      resolveApproval,
      interrupt,
      async analyzeCommentIds(_commentIds, onEvent) {
        onEvent({
          id: 'event-approval',
          type: 'approval.requested',
          timestamp: '2026-08-05T00:00:00.000Z',
          agentId: 'miko',
          sessionId: 'stream',
          turnId: 'turn-1',
          request: {
            id: 'approval-1',
            agentId: 'miko',
            sessionId: 'stream',
            turnId: 'turn-1',
            toolCallId: 'call-1',
            toolId: 'codex.command-execution',
            risk: 'external',
            arguments: { command: 'example' },
            reason: 'Codex requested a command.',
          },
        });
        await approvalGate;
        return {};
      },
    });
    const pending = collectSse(baseUrl, (frames) =>
      frames.some(
        (frame) =>
          frame.envelope.kind === 'agent-event' &&
          (frame.envelope.event as { type?: string }).type ===
            'approval.requested'
      )
    );
    await postJson(baseUrl, '/api/comments', {
      operationId: 'operation-approval',
      commentIds: ['c01'],
    });
    await pending;

    expect(
      (
        await postJson(baseUrl, '/api/approvals', {
          requestId: 'approval-1',
          decision: 'allow-once',
        })
      ).status
    ).toBe(200);
    expect(resolveApproval).toHaveBeenCalledWith('approval-1', 'allow-once');
    expect(
      (
        await fetch(`${baseUrl}/api/interrupt`, {
          method: 'POST',
          headers: { origin: baseUrl, 'sec-fetch-site': 'same-origin' },
        })
      ).status
    ).toBe(200);
    expect(interrupt).toHaveBeenCalledOnce();
  });

  it('interrupts an active Turn before resetting fixture state', async () => {
    let releaseTurn: (() => void) | undefined;
    const turnGate = new Promise<void>((resolve) => {
      releaseTurn = resolve;
    });
    const interrupt = vi.fn(async () => releaseTurn?.());
    const reset = vi.fn();
    const { baseUrl } = await startServer({
      interrupt,
      reset,
      async analyzeCommentIds() {
        await turnGate;
        return {};
      },
    });
    await postJson(baseUrl, '/api/comments', {
      operationId: 'operation-reset',
      commentIds: ['c01'],
    });

    const response = await postJson(baseUrl, '/api/reset', {});

    expect(response.status).toBe(200);
    expect(interrupt).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });

  it('emits schema failures as turn-error envelopes', async () => {
    const { baseUrl } = await startServer({
      async analyzeCommentIds() {
        throw new Error('Codex output failed JSON Schema validation.');
      },
    });
    const collecting = collectSse(baseUrl, (frames) =>
      frames.some((frame) => frame.envelope.kind === 'turn-error')
    );

    await postJson(baseUrl, '/api/comments', {
      operationId: 'operation-error',
      commentIds: ['c01', 'c02'],
    });

    const frames = await collecting;
    expect(frames).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          envelope: expect.objectContaining({
            kind: 'turn-error',
            operationId: 'operation-error',
            message: expect.stringContaining('JSON Schema validation'),
          }),
        }),
      ])
    );
  });

  it('rejects cross-origin and non-JSON mutations', async () => {
    const { baseUrl } = await startServer();

    expect(
      (
        await postJson(
          baseUrl,
          '/api/comments',
          { operationId: 'operation-1', commentIds: ['c01'] },
          'https://attacker.example'
        )
      ).status
    ).toBe(403);
    expect(
      (
        await fetch(`${baseUrl}/api/comments`, {
          method: 'POST',
          headers: {
            'content-type': 'text/plain',
            origin: baseUrl,
            'sec-fetch-site': 'same-origin',
          },
          body: '{}',
        })
      ).status
    ).toBe(415);
  });

  it('does not serve files outside the built dashboard directory', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/..%2Fpackage.json`);

    expect(response.status).toBe(404);
  });
});
