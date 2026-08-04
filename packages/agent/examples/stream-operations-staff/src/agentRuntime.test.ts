import { describe, expect, it, vi } from 'vitest';
import { createStreamOperationsStaffRuntime } from './agentRuntime';
import type { StreamSseEnvelope } from './protocol';

class FakeEventSource {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  emit(envelope: StreamSseEnvelope): void {
    this.onmessage?.({
      data: JSON.stringify(envelope),
    } as MessageEvent<string>);
  }

  close(): void {
    this.closed = true;
  }
}

function createHarness() {
  const source = new FakeEventSource();
  const requests: { readonly path: string; readonly init?: RequestInit }[] = [];
  const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    requests.push({ path, init });
    if (path === '/api/state') {
      return Response.json({
        backendSessionId: 'thread-1',
        pendingApprovals: [],
        resumed: true,
        turnActive: false,
      });
    }
    return Response.json({ accepted: true }, { status: 202 });
  });
  const runtime = createStreamOperationsStaffRuntime({
    fetch: fetchMock as unknown as typeof fetch,
    createEventSource: () => source,
    createOperationId: () => 'operation-1',
  });
  return { fetchMock, requests, runtime, source };
}

describe('stream operations server client', () => {
  it('initializes from server state and publishes SSE state changes', async () => {
    const { runtime, source } = createHarness();
    const states: boolean[] = [];
    runtime.subscribeState((state) => states.push(state.turnActive));

    await expect(runtime.initialize()).resolves.toEqual({
      backendSessionId: 'thread-1',
      resumed: true,
    });
    source.emit({
      kind: 'state',
      state: {
        backendSessionId: 'thread-1',
        pendingApprovals: [],
        resumed: true,
        turnActive: true,
      },
    });

    expect(states).toEqual([false, true]);
    await runtime.close();
  });

  it('correlates streamed Agent events with a comment operation', async () => {
    const { requests, runtime, source } = createHarness();
    const operation = runtime.analyzeComments([{ id: 'c01' }, { id: 'c02' }]);
    await vi.waitFor(() => expect(requests).toHaveLength(1));

    const requestBody = JSON.parse(String(requests[0].init?.body));
    expect(requestBody).toEqual({
      operationId: 'operation-1',
      commentIds: ['c01', 'c02'],
    });
    source.emit({
      kind: 'agent-event',
      operationId: 'operation-1',
      event: {
        id: 'event-1',
        type: 'turn.started',
        timestamp: '2026-08-05T00:00:00.000Z',
        agentId: 'miko',
        sessionId: 'stream',
        turnId: 'turn-1',
      },
    });
    source.emit({
      kind: 'operation-completed',
      operationId: 'operation-1',
      analysis: {
        analyzedCommentCount: 2,
        selectedCommentIds: ['c02'],
        safetyReports: [],
      },
    });

    await expect(operation).resolves.toMatchObject({
      events: [{ type: 'turn.started' }],
      analysis: { analyzedCommentCount: 2 },
    });
    await runtime.close();
  });

  it('propagates a server-side schema validation error', async () => {
    const { requests, runtime, source } = createHarness();
    const operation = runtime.createPostStreamReport();
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    source.emit({
      kind: 'turn-error',
      operationId: 'operation-1',
      message: 'Codex output failed JSON Schema validation.',
    });

    await expect(operation).rejects.toThrow('JSON Schema validation');
    await runtime.close();
  });

  it('rejects an operation if SSE never delivers a terminal event', async () => {
    vi.useFakeTimers();
    try {
      const source = new FakeEventSource();
      const runtime = createStreamOperationsStaffRuntime({
        fetch: vi.fn(async () =>
          Response.json({ accepted: true }, { status: 202 })
        ) as unknown as typeof fetch,
        createEventSource: () => source,
        createOperationId: () => 'operation-timeout',
        operationTimeoutMs: 100,
      });

      const operation = runtime.createPostStreamReport();
      const rejection = expect(operation).rejects.toThrow('timed out');
      await vi.advanceTimersByTimeAsync(100);

      await rejection;
      await runtime.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends only one-request approval decisions', async () => {
    const { requests, runtime } = createHarness();

    await runtime.resolveApproval('approval-1', 'allow-once');

    expect(requests[0].path).toBe('/api/approvals');
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      requestId: 'approval-1',
      decision: 'allow-once',
    });
    await runtime.close();
  });
});
