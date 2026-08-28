import type { AddressInfo } from 'node:net';
import { createAgent } from '@aituber-onair/agent';
import type {
  AgentBackend,
  AgentApprovalDecision,
  AgentBackendApprovalResult,
  AgentBackendEvent,
  AgentBackendSession,
  AgentBackendSessionInput,
  AgentRunInput,
} from '@aituber-onair/agent';
import { afterEach, describe, expect, it } from 'vitest';
import { createWorkspaceServer } from '../src/app.js';

type Scenario = (
  input: AgentRunInput,
  session: MockBackendSession
) => AsyncGenerator<AgentBackendEvent>;

class MockBackendSession implements AgentBackendSession {
  readonly approvalResults: AgentBackendApprovalResult[] = [];
  interruptCalls = 0;
  private readonly queuedApprovalResults: AgentBackendApprovalResult[] = [];
  private approvalWaiters: ((result: AgentBackendApprovalResult) => void)[] =
    [];
  private queuedInterrupts = 0;
  private interruptWaiters: (() => void)[] = [];

  constructor(private readonly scenario: Scenario) {}

  runStream(input: AgentRunInput): AsyncIterable<AgentBackendEvent> {
    return this.scenario(input, this);
  }

  async submitApprovalResult(result: AgentBackendApprovalResult) {
    this.approvalResults.push(result);
    const waiter = this.approvalWaiters.shift();
    if (waiter) waiter(result);
    else this.queuedApprovalResults.push(result);
  }

  nextApprovalResult(): Promise<AgentBackendApprovalResult> {
    const queued = this.queuedApprovalResults.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((resolve) => {
      this.approvalWaiters.push(resolve);
    });
  }

  async interrupt() {
    this.interruptCalls += 1;
    const waiter = this.interruptWaiters.shift();
    if (waiter) waiter();
    else this.queuedInterrupts += 1;
  }

  nextInterrupt(): Promise<void> {
    if (this.queuedInterrupts > 0) {
      this.queuedInterrupts -= 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.interruptWaiters.push(resolve);
    });
  }

  async close() {}
}

function createMockBackend(
  scenario: Scenario,
  onStart: (session: MockBackendSession) => void
): AgentBackend {
  return {
    name: 'mock-backend',
    backendCapabilities: {
      text: true,
      streaming: true,
      tools: false,
      interruption: true,
      sessionResume: false,
      approvals: true,
      detailedEvents: true,
    },
    async startSession(_input: AgentBackendSessionInput) {
      const session = new MockBackendSession(scenario);
      onStart(session);
      return session;
    },
  };
}

interface RunningServer {
  baseUrl: string;
  backendSession: MockBackendSession;
  close: () => Promise<void>;
}

const running: RunningServer[] = [];

afterEach(async () => {
  while (running.length > 0) {
    await running.pop()?.close();
  }
});

async function startServer(scenario: Scenario): Promise<RunningServer> {
  let backendSession: MockBackendSession | undefined;
  const agent = createAgent({
    id: 'test-staff',
    brief: 'You are test staff.',
    backend: createMockBackend(scenario, (session) => {
      backendSession = session;
    }),
    limits: { approvalTimeoutMs: 5_000 },
  });
  const session = await agent.startSession({
    purpose: 'test',
    audience: 'owner',
    inputTrust: 'trusted',
  });
  const server = createWorkspaceServer({
    session,
    publicDir: new URL('../public', import.meta.url).pathname,
    info: {
      workspaceDir: '/tmp/workspace',
      sandbox: 'read-only',
      resumed: false,
    },
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  if (!backendSession) throw new Error('Mock backend Session did not start.');
  const handle: RunningServer = {
    baseUrl: `http://127.0.0.1:${port}`,
    backendSession,
    close: async () => {
      const serverClosed = new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections?.();
      });
      await serverClosed;
      await session.close();
      await agent.close();
    },
  };
  running.push(handle);
  return handle;
}

async function postJson(
  baseUrl: string,
  path: string,
  body: unknown
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: baseUrl,
      'sec-fetch-site': 'same-origin',
    },
    body: JSON.stringify(body),
  });
}

async function collectSse(
  baseUrl: string,
  isDone: (envelopes: Record<string, unknown>[]) => boolean,
  timeoutMs = 5_000
): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const envelopes: Record<string, unknown>[] = [];
  try {
    const response = await fetch(`${baseUrl}/api/events`, {
      signal: controller.signal,
    });
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      let separator = buffered.indexOf('\n\n');
      while (separator !== -1) {
        const frame = buffered.slice(0, separator);
        buffered = buffered.slice(separator + 2);
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data: '))
          .map((line) => line.slice(6))
          .join('\n');
        if (data) envelopes.push(JSON.parse(data));
        if (isDone(envelopes)) return envelopes;
        separator = buffered.indexOf('\n\n');
      }
    }
    return envelopes;
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

function agentEventTypes(envelopes: Record<string, unknown>[]): string[] {
  return envelopes
    .filter((envelope) => envelope.kind === 'agent-event')
    .map((envelope) => (envelope.event as { type: string }).type);
}

describe('codex-workspace-server app', () => {
  it('reports idle state and workspace info', async () => {
    const { baseUrl } = await startServer(async function* () {
      yield { type: 'completed', message: 'unused' };
    });
    const state = await (await fetch(`${baseUrl}/api/state`)).json();
    expect(state).toMatchObject({
      turnActive: false,
      sandbox: 'read-only',
      resumed: false,
      pendingApprovals: [],
    });
  });

  it('streams a full Turn as SSE agent events', async () => {
    const { baseUrl } = await startServer(async function* () {
      yield { type: 'message.delta', text: 'All ' };
      yield { type: 'message.delta', text: 'clear.' };
      yield { type: 'message.completed', text: 'All clear.' };
      yield { type: 'completed', message: 'All clear.' };
    });

    const collecting = collectSse(baseUrl, (envelopes) =>
      agentEventTypes(envelopes).includes('turn.completed')
    );
    const accepted = await postJson(baseUrl, '/api/run', {
      instruction: 'Check the workspace.',
    });
    expect(accepted.status).toBe(202);

    const envelopes = await collecting;
    const types = agentEventTypes(envelopes);
    expect(types).toContain('turn.started');
    expect(types).toContain('message.delta');
    expect(types).toContain('message.completed');
    expect(types.at(-1)).toBe('turn.completed');
  });

  it('rejects a second Turn while one is running', async () => {
    let releaseTurn = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseTurn = resolve;
    });
    const { baseUrl } = await startServer(async function* () {
      await gate;
      yield { type: 'message.completed', text: 'done' };
      yield { type: 'completed', message: 'done' };
    });

    expect(
      (await postJson(baseUrl, '/api/run', { instruction: 'first' })).status
    ).toBe(202);
    expect(
      (await postJson(baseUrl, '/api/run', { instruction: 'second' })).status
    ).toBe(409);
    releaseTurn();
    await collectSse(baseUrl, (envelopes) =>
      agentEventTypes(envelopes).includes('turn.completed')
    );
  });

  it.each<AgentApprovalDecision>(['allow-once', 'deny'])(
    'routes the browser %s approval decision to the backend',
    async (decision) => {
      const { baseUrl, backendSession } = await startServer(
        async function* (_input, session) {
          yield {
            type: 'approval.requested',
            approvalId: 'codex-approval-1',
            toolCallId: 'call-1',
            toolId: 'codex.file-change',
            risk: 'write',
            arguments: { path: 'SUMMARY.md' },
            reason: 'Codex wants to create a file.',
          };
          const result = await session.nextApprovalResult();
          yield {
            type: 'message.completed',
            text: `decision: ${result.decision}`,
          };
          yield { type: 'completed', message: `decision: ${result.decision}` };
        }
      );

      const collecting = collectSse(baseUrl, (envelopes) =>
        agentEventTypes(envelopes).includes('turn.completed')
      );
      await postJson(baseUrl, '/api/run', { instruction: 'Create a summary.' });

      const withApproval = await collectSse(baseUrl, (envelopes) =>
        agentEventTypes(envelopes).includes('approval.requested')
      );
      const approvalEvent = withApproval
        .filter((envelope) => envelope.kind === 'agent-event')
        .map((envelope) => envelope.event as Record<string, unknown>)
        .find((event) => event.type === 'approval.requested') as {
        request: { id: string };
      };

      const resolved = await postJson(baseUrl, '/api/approvals', {
        requestId: approvalEvent.request.id,
        decision,
      });
      expect(resolved.status).toBe(200);

      const envelopes = await collecting;
      const finalMessage = envelopes
        .filter((envelope) => envelope.kind === 'agent-event')
        .map((envelope) => envelope.event as Record<string, unknown>)
        .find((event) => event.type === 'message.completed') as {
        text: string;
      };
      expect(finalMessage.text).toBe(`decision: ${decision}`);
      expect(backendSession.approvalResults).toEqual([
        { approvalId: 'codex-approval-1', decision },
      ]);
    }
  );

  it('interrupts an active Turn through the backend', async () => {
    const { baseUrl, backendSession } = await startServer(
      async function* (_input, session) {
        await session.nextInterrupt();
        yield {
          type: 'message.completed',
          text: 'This message must not complete the interrupted Turn.',
        };
        yield { type: 'completed', message: 'unreachable' };
      }
    );

    const collecting = collectSse(baseUrl, (envelopes) =>
      agentEventTypes(envelopes).includes('turn.interrupted')
    );
    await postJson(baseUrl, '/api/run', { instruction: 'Wait for interrupt.' });
    const interrupted = await fetch(`${baseUrl}/api/interrupt`, {
      method: 'POST',
      headers: { origin: baseUrl, 'sec-fetch-site': 'same-origin' },
    });
    expect(interrupted.status).toBe(200);

    const envelopes = await collecting;
    expect(agentEventTypes(envelopes)).toContain('turn.interrupted');
    expect(backendSession.interruptCalls).toBe(1);
  });

  it('rejects unknown approval IDs and bad decisions', async () => {
    const { baseUrl } = await startServer(async function* () {
      yield { type: 'completed', message: 'unused' };
    });
    expect(
      (
        await postJson(baseUrl, '/api/approvals', {
          requestId: 'missing',
          decision: 'allow-once',
        })
      ).status
    ).toBe(404);
    expect(
      (
        await postJson(baseUrl, '/api/approvals', {
          requestId: 'missing',
          decision: 'allow-forever',
        })
      ).status
    ).toBe(400);
  });

  it('rejects cross-origin and non-JSON control requests', async () => {
    const { baseUrl } = await startServer(async function* () {
      yield { type: 'completed', message: 'must not run' };
    });

    const crossOrigin = await fetch(`${baseUrl}/api/run`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://attacker.example',
        'sec-fetch-site': 'cross-site',
      },
      body: JSON.stringify({ instruction: 'Run an attacker instruction.' }),
    });
    expect(crossOrigin.status).toBe(403);

    const simpleRequest = await fetch(`${baseUrl}/api/run`, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        origin: baseUrl,
        'sec-fetch-site': 'same-origin',
      },
      body: JSON.stringify({ instruction: 'Use a simple content type.' }),
    });
    expect(simpleRequest.status).toBe(415);

    const crossOriginInterrupt = await fetch(`${baseUrl}/api/interrupt`, {
      method: 'POST',
      headers: {
        origin: 'https://attacker.example',
        'sec-fetch-site': 'cross-site',
      },
    });
    expect(crossOriginInterrupt.status).toBe(403);
  });
});
