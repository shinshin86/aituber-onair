import { createAgent } from '../src/index.js';
import {
  AgentApprovalDeniedError,
  AgentApprovalTimeoutError,
  AgentInterruptedError,
} from '../src/errors.js';
import type {
  AgentBackendEvent,
  AgentEvent,
  AgentToolSpec,
} from '../src/types.js';
import { MockBackend, type MockBackendSession } from './helpers/mockBackend.js';

const approvalTool: AgentToolSpec = {
  id: 'report.publish',
  definition: {
    name: 'report_publish',
    description: 'Publish an approved report',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        token: { type: 'string' },
      },
      required: ['title', 'token'],
      additionalProperties: false,
    },
  },
  risk: 'external',
  sensitiveFields: ['token'],
  execute: vi.fn(async () => ({ published: true })),
};

describe('Agent approval flow', () => {
  beforeEach(() => {
    vi.mocked(approvalTool.execute).mockClear();
  });

  it('pauses execution until the host allows one request', async () => {
    const { backend, session } = await createApprovalSession();
    const events: AgentEvent[] = [];
    const running = consume(
      session.runStream({ instruction: 'Publish the report.' }),
      events
    );
    await waitUntil(() => findApproval(events) !== undefined);

    const approval = findApproval(events);
    await session.resolveApproval(approval?.request.id as string, 'allow-once');
    await running;

    expect(approval).toMatchObject({
      request: {
        toolId: 'report.publish',
        risk: 'external',
        arguments: { title: 'Summary', token: '[REDACTED]' },
      },
    });
    expect(approvalTool.execute).toHaveBeenCalledOnce();
    expect(backend.sessions[0].toolResults[0]).toMatchObject({
      type: 'success',
    });
    expect(
      events.find((event) => event.type === 'approval.resolved')
    ).toMatchObject({
      decision: 'allow-once',
    });
  });

  it('never executes a Tool after host denial', async () => {
    const { session } = await createApprovalSession();
    const events: AgentEvent[] = [];
    const running = consume(
      session.runStream({ instruction: 'Publish the report.' }),
      events
    );
    const rejected = expect(running).rejects.toThrow(AgentApprovalDeniedError);
    await waitUntil(() => findApproval(events) !== undefined);

    await session.resolveApproval(
      findApproval(events)?.request.id as string,
      'deny'
    );

    await rejected;
    expect(approvalTool.execute).not.toHaveBeenCalled();
  });

  it('times out approval without executing the Tool', async () => {
    vi.useFakeTimers();
    try {
      const { session } = await createApprovalSession({
        approvalTimeoutMs: 40,
      });
      const running = session.run({ instruction: 'Publish the report.' });
      const rejected = expect(running).rejects.toThrow(
        AgentApprovalTimeoutError
      );

      await vi.advanceTimersByTimeAsync(40);

      await rejected;
      expect(approvalTool.execute).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('denies pending approval when the Session closes', async () => {
    const { session } = await createApprovalSession();
    const events: AgentEvent[] = [];
    const running = consume(
      session.runStream({ instruction: 'Publish the report.' }),
      events
    );
    const rejected = expect(running).rejects.toThrow(AgentInterruptedError);
    await waitUntil(() => findApproval(events) !== undefined);

    await session.close();

    await rejected;
    expect(approvalTool.execute).not.toHaveBeenCalled();
    expect(
      events.find((event) => event.type === 'approval.resolved')
    ).toMatchObject({
      decision: 'deny',
    });
  });

  it('records denial when the caller aborts pending approval', async () => {
    const { session } = await createApprovalSession();
    const controller = new AbortController();
    const events: AgentEvent[] = [];
    const running = consume(
      session.runStream(
        { instruction: 'Publish the report.' },
        { signal: controller.signal }
      ),
      events
    );
    const rejected = expect(running).rejects.toThrow(AgentInterruptedError);
    await waitUntil(() => findApproval(events) !== undefined);

    controller.abort();

    await rejected;
    expect(approvalTool.execute).not.toHaveBeenCalled();
    expect(
      events.find((event) => event.type === 'approval.resolved')
    ).toMatchObject({ decision: 'deny' });
  });

  it('does not start the handler when abort races with approval resolution', async () => {
    const { session } = await createApprovalSession();
    const controller = new AbortController();
    const events: AgentEvent[] = [];
    const running = consume(
      session.runStream(
        { instruction: 'Publish the report.' },
        { signal: controller.signal }
      ),
      events
    );
    const rejected = expect(running).rejects.toThrow(AgentInterruptedError);
    await waitUntil(() => findApproval(events) !== undefined);

    const resolving = session.resolveApproval(
      findApproval(events)?.request.id as string,
      'allow-once'
    );
    controller.abort();
    await resolving;

    await rejected;
    expect(approvalTool.execute).not.toHaveBeenCalled();
  });
});

async function createApprovalSession(
  limits: { approvalTimeoutMs?: number } = {}
) {
  const backend = new MockBackend(approvalStream, { tools: true });
  const agent = createAgent({
    id: 'miko',
    brief: 'You are Miko, AI operations staff.',
    backend,
    tools: [approvalTool],
    policy: {
      defaultDecision: 'allow',
      requireApproval: { riskAtLeast: 'external' },
    },
    limits,
  });
  const session = await agent.startSession({
    purpose: 'operations',
    audience: 'operator',
    inputTrust: 'trusted',
    allowedTools: ['report.publish'],
  });
  return { backend, session };
}

async function* approvalStream(
  _input: unknown,
  _options: unknown,
  session: MockBackendSession
): AsyncIterable<AgentBackendEvent> {
  yield {
    type: 'tool.requested',
    toolCallId: 'publish-1',
    toolName: 'report_publish',
    arguments: { title: 'Summary', token: 'secret-token' },
  };
  await waitUntil(() => session.toolResults.length === 1);
  yield { type: 'completed', message: 'Published' };
}

function findApproval(events: readonly AgentEvent[]) {
  return events.find((event) => event.type === 'approval.requested');
}

async function consume(
  stream: AsyncIterable<AgentEvent>,
  events: AgentEvent[]
): Promise<void> {
  for await (const event of stream) events.push(event);
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error('Condition was not reached');
}
