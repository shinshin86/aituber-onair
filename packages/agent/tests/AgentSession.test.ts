import { createAgent } from '../src/index.js';
import {
  AgentBackendProtocolError,
  AgentInterruptedError,
  AgentSessionClosedError,
  AgentTimeoutError,
  AgentTurnInProgressError,
} from '../src/errors.js';
import type { AgentBackendEvent, AgentEvent } from '../src/types.js';
import {
  MockBackend,
  completedTextStream,
  waitForAbort,
} from './helpers/mockBackend.js';

const agentDefinition = {
  id: 'miko',
  brief: 'You are Miko, calm AI staff.',
};

describe('AgentSession', () => {
  it('uses one pipeline for run() and ordered streaming events', async () => {
    const backend = new MockBackend(() =>
      completedTextStream('Backend response')
    );
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);

    const events = await collectEvents(
      session.runStream({ instruction: 'First turn' })
    );
    const result = await session.run({ instruction: 'Second turn' });

    expect(events.map((event) => event.type)).toEqual([
      'session.started',
      'turn.started',
      'message.delta',
      'message.delta',
      'message.completed',
      'turn.completed',
    ]);
    const turnEvents = events.filter((event) => event.turnId);
    expect(new Set(turnEvents.map((event) => event.turnId))).toHaveLength(1);
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(
      events.every((event) => !Number.isNaN(Date.parse(event.timestamp)))
    ).toBe(true);

    const completed = events.at(-1);
    expect(completed?.type).toBe('turn.completed');
    if (completed?.type === 'turn.completed') {
      expect(completed.result).toMatchObject({
        message: 'Backend response',
        artifacts: [],
        usage: { totalTokens: 15 },
        backendMetadata: { model: 'mock-model' },
      });
    }
    expect(result.message).toBe('Backend response');
    expect(backend.sessions[0].runInputs).toHaveLength(2);
  });

  it('emits one failed terminal event and preserves backend causes', async () => {
    const cause = new Error('provider failed');
    const backend = new MockBackend(async function* () {
      yield { type: 'message.delta', text: 'partial' };
      throw cause;
    });
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);
    const events: AgentEvent[] = [];

    await expect(
      consume(session.runStream({ instruction: 'Fail' }), events)
    ).rejects.toMatchObject({
      code: 'AGENT_BACKEND_ERROR',
      cause,
    });
    expect(events.filter(isTerminalEvent)).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({
      type: 'turn.failed',
      error: { code: 'AGENT_BACKEND_ERROR' },
    });
  });

  it('rejects a second concurrent Turn', async () => {
    const backend = new MockBackend((_input, options) =>
      pendingStream(options?.signal)
    );
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);
    const first = session.runStream({ instruction: 'First' });

    expect(() => session.runStream({ instruction: 'Second' })).toThrow(
      AgentTurnInProgressError
    );

    const consuming = collectEvents(first);
    await waitUntil(() => backend.sessions[0].runInputs.length === 1);
    await session.interrupt();
    await expect(consuming).rejects.toThrow(AgentInterruptedError);
  });

  it('interrupts an active Turn and closes its event queue', async () => {
    const backend = new MockBackend((_input, options) =>
      pendingStream(options?.signal)
    );
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);
    const events: AgentEvent[] = [];
    const consuming = consume(
      session.runStream({ instruction: 'Keep working' }),
      events
    );
    await waitUntil(() => backend.sessions[0].runInputs.length === 1);

    await session.interrupt();

    await expect(consuming).rejects.toThrow(AgentInterruptedError);
    expect(backend.sessions[0].interruptCalls).toBe(1);
    expect(events.filter(isTerminalEvent)).toHaveLength(1);
    expect(events.at(-1)?.type).toBe('turn.interrupted');
  });

  it('reports unsupported native interruption without stopping the Turn', async () => {
    const backend = new MockBackend(
      (_input, options) => pendingStream(options?.signal),
      { interruption: false }
    );
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);
    const consuming = collectEvents(
      session.runStream({ instruction: 'Keep running' })
    );
    const interrupted = expect(consuming).rejects.toThrow(
      AgentInterruptedError
    );
    await waitUntil(() => backend.sessions[0].runInputs.length === 1);

    await expect(session.interrupt()).rejects.toThrow('interruption');
    expect(backend.sessions[0].interruptCalls).toBe(0);
    await session.close();
    await interrupted;
  });

  it('maps a caller AbortSignal to an interrupted Turn', async () => {
    const backend = new MockBackend((_input, options) =>
      pendingStream(options?.signal)
    );
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);
    const controller = new AbortController();
    const events: AgentEvent[] = [];
    const consuming = consume(
      session.runStream(
        { instruction: 'Abort me' },
        { signal: controller.signal }
      ),
      events
    );
    await waitUntil(() => backend.sessions[0].runInputs.length === 1);

    controller.abort();

    await expect(consuming).rejects.toThrow(AgentInterruptedError);
    expect(events.at(-1)?.type).toBe('turn.interrupted');
  });

  it('fails a Turn when its timeout expires', async () => {
    vi.useFakeTimers();
    try {
      const backend = new MockBackend((_input, options) =>
        pendingStream(options?.signal)
      );
      const agent = createAgent({ ...agentDefinition, backend });
      const session = await startSession(agent);
      const events: AgentEvent[] = [];
      const consuming = consume(
        session.runStream({ instruction: 'Time out' }, { timeoutMs: 50 }),
        events
      );
      const rejection = expect(consuming).rejects.toThrow(AgentTimeoutError);

      await vi.advanceTimersByTimeAsync(50);

      await rejection;
      expect(events.at(-1)).toMatchObject({
        type: 'turn.failed',
        error: { code: 'AGENT_TIMEOUT' },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('interrupts the Turn and emits session.closed when closed mid-run', async () => {
    const backend = new MockBackend((_input, options) =>
      pendingStream(options?.signal)
    );
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);
    const events: AgentEvent[] = [];
    const consuming = consume(
      session.runStream({ instruction: 'Close me' }),
      events
    );
    await waitUntil(() => backend.sessions[0].runInputs.length === 1);

    await session.close();

    await expect(consuming).rejects.toThrow(AgentInterruptedError);
    expect(events.filter(isTerminalEvent)).toHaveLength(1);
    expect(events.at(-1)?.type).toBe('session.closed');
    expect(backend.sessions[0].closeCalls).toBe(1);
    await expect(session.run({ instruction: 'Too late' })).rejects.toThrow(
      AgentSessionClosedError
    );
  });

  it('aborts backend work when the stream consumer exits early', async () => {
    let backendFinished = false;
    const backend = new MockBackend((_input, options, backendSession) => {
      if (backendSession.runInputs.length > 1) return completedTextStream();
      return (async function* () {
        try {
          yield { type: 'message.delta', text: 'first' };
          await waitForAbort(options?.signal as AbortSignal);
        } finally {
          backendFinished = true;
        }
      })();
    });
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);

    for await (const event of session.runStream({ instruction: 'Start' })) {
      if (event.type === 'message.delta') break;
    }
    await waitUntil(() => backendFinished);

    const result = await session.run({ instruction: 'Next turn' });
    expect(result.message).toBe('Hello from the backend');
  });

  it('fails when a backend finishes without a completed event', async () => {
    const backend = new MockBackend(async function* () {
      yield { type: 'message.completed', text: 'orphaned' };
    });
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);

    await expect(session.run({ instruction: 'Incomplete' })).rejects.toThrow(
      AgentBackendProtocolError
    );
  });

  it('treats the backend completed event as terminal', async () => {
    let backendCleanedUp = false;
    const backend = new MockBackend(async function* () {
      try {
        yield { type: 'completed', message: 'Done' };
        await new Promise<never>(() => undefined);
      } finally {
        backendCleanedUp = true;
      }
    });
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await startSession(agent);

    await expect(session.run({ instruction: 'Finish' })).resolves.toMatchObject(
      {
        message: 'Done',
      }
    );
    await waitUntil(() => backendCleanedUp);
  });
});

async function startSession(agent: ReturnType<typeof createAgent>) {
  return agent.startSession({
    purpose: 'operations',
    audience: 'operator',
    inputTrust: 'trusted',
  });
}

async function* pendingStream(
  signal?: AbortSignal
): AsyncIterable<AgentBackendEvent> {
  yield { type: 'message.delta', text: 'working' };
  await waitForAbort(signal as AbortSignal);
}

async function consume(
  stream: AsyncIterable<AgentEvent>,
  events: AgentEvent[]
): Promise<void> {
  for await (const event of stream) events.push(event);
}

async function collectEvents<T>(events: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}

function isTerminalEvent(event: AgentEvent): boolean {
  return (
    event.type === 'turn.completed' ||
    event.type === 'turn.interrupted' ||
    event.type === 'turn.failed'
  );
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error('Condition was not reached');
}
