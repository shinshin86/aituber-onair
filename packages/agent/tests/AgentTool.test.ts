import { createAgent, defineAgentTool } from '../src/index.js';
import {
  AgentBackendProtocolError,
  AgentHookError,
  AgentInterruptedError,
  AgentPolicyDeniedError,
  AgentSchemaKeywordUnsupportedError,
  AgentToolLoopLimitError,
  AgentToolNotFoundError,
  AgentToolExecutionError,
  AgentToolValidationError,
} from '../src/errors.js';
import type {
  AgentBackendEvent,
  AgentEvent,
  AgentHook,
  AgentPolicy,
  AgentToolSpec,
} from '../src/types.js';
import { MockBackend, type MockBackendSession } from './helpers/mockBackend.js';

const agentDefinition = {
  id: 'miko',
  brief: 'You are Miko, calm AI operations staff.',
};

const toolSchema = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['inspect', 'summarize'] },
    credentials: {
      type: 'object',
      properties: {
        token: { type: 'string' },
      },
      required: ['token'],
      additionalProperties: false,
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['action'],
  additionalProperties: false,
} as const;

function createTool(
  execute: AgentToolSpec['execute'] = async () => ({ ok: true }),
  overrides: Partial<AgentToolSpec> = {}
): AgentToolSpec {
  return defineAgentTool({
    id: 'workspace.inspect',
    definition: {
      name: 'workspace_inspect',
      description: 'Inspect a bounded workspace',
      parameters: toolSchema,
    },
    risk: 'read',
    execute,
    ...overrides,
  });
}

describe('Agent Tool runtime', () => {
  it('executes validated input and returns the result to the backend', async () => {
    const execute = vi.fn(async () => ({ files: 3 }));
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', {
        action: 'inspect',
        tags: ['safe'],
      }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
      policy: { defaultDecision: 'allow' },
    });
    const session = await agent.startSession({
      purpose: 'performer',
      audience: 'public',
      inputTrust: 'untrusted',
      allowedTools: ['workspace.inspect'],
    });

    const events = await collectEvents(
      session.runStream({ instruction: 'Inspect the workspace.' })
    );

    expect(execute).toHaveBeenCalledOnce();
    expect(events.map((event) => event.type)).toEqual([
      'session.started',
      'turn.started',
      'tool.requested',
      'tool.started',
      'tool.completed',
      'turn.completed',
    ]);
    expect(backend.sessions[0].toolResults).toEqual([
      {
        type: 'success',
        toolCallId: 'call-1',
        output: { files: 3 },
      },
    ]);
  });

  it('denies Tool execution by default even when the Session can see it', async () => {
    const execute = vi.fn();
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', { action: 'inspect' }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
    });
    const session = await agent.startSession({
      purpose: 'performer',
      audience: 'public',
      inputTrust: 'untrusted',
      allowedTools: ['workspace.inspect'],
    });

    await expect(
      session.run({ instruction: 'Inspect the workspace.' })
    ).rejects.toThrow(AgentPolicyDeniedError);
    await expect(
      session.run({ instruction: 'The backend asks again.' })
    ).rejects.toThrow(AgentPolicyDeniedError);
    expect(execute).not.toHaveBeenCalled();
    expect(backend.sessions[0].toolResults).toEqual([]);
  });

  it('rejects a backend request for a Tool outside the Session allowlist', async () => {
    const execute = vi.fn();
    const backend = new MockBackend(
      singleToolStream('workspace_write', { action: 'inspect' }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
      policy: { defaultDecision: 'allow' },
    });
    const session = await agent.startSession({
      purpose: 'performer',
      audience: 'public',
      inputTrust: 'untrusted',
      allowedTools: ['workspace.inspect'],
    });

    await expect(
      session.run({ instruction: 'Do not expand permissions.' })
    ).rejects.toThrow(AgentToolNotFoundError);
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects invalid nested, enum, array, and additional input before execution', async () => {
    const execute = vi.fn();
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', {
        action: 'delete',
        credentials: { token: 42, extra: true },
        tags: ['safe', 3],
        unexpected: true,
      }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
      policy: { defaultDecision: 'allow' },
    });
    const session = await startToolSession(agent);

    await expect(
      session.run({ instruction: 'Validate before use.' })
    ).rejects.toThrow(AgentToolValidationError);
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects unsupported JSON Schema keywords at registration', () => {
    const backend = new MockBackend(async function* () {}, { tools: true });
    const tool = createTool(undefined, {
      definition: {
        name: 'workspace_inspect',
        description: 'Invalid schema',
        parameters: {
          type: 'object',
          oneOf: [{ type: 'string' }],
        },
      },
    });

    expect(() =>
      createAgent({
        ...agentDefinition,
        backend,
        tools: [tool],
      })
    ).toThrow(AgentSchemaKeywordUnsupportedError);
  });

  it('redacts sensitive arguments in events and policy but not handler input', async () => {
    const handlerInputs: unknown[] = [];
    const policyInputs: unknown[] = [];
    const policy: AgentPolicy = {
      evaluate(context) {
        policyInputs.push(context.arguments);
        return { decision: 'allow' };
      },
    };
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', {
        action: 'inspect',
        credentials: { token: 'secret-value' },
      }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [
        createTool(
          (input) => {
            handlerInputs.push(input);
            return { ok: true };
          },
          { sensitiveFields: ['credentials.token'] }
        ),
      ],
      policy,
    });
    const session = await startToolSession(agent);

    const events = await collectEvents(
      session.runStream({ instruction: 'Inspect safely.' })
    );
    const requested = events.find((event) => event.type === 'tool.requested');

    expect(requested).toMatchObject({
      arguments: { credentials: { token: '[REDACTED]' } },
    });
    if (requested?.type === 'tool.requested') {
      expect(Object.isFrozen(requested.arguments)).toBe(true);
      expect(
        Object.isFrozen(
          (requested.arguments as { credentials: unknown }).credentials
        )
      ).toBe(true);
    }
    expect(policyInputs).toEqual([
      { action: 'inspect', credentials: { token: '[REDACTED]' } },
    ]);
    expect(handlerInputs).toEqual([
      { action: 'inspect', credentials: { token: 'secret-value' } },
    ]);
  });

  it('returns handler failures to the backend without claiming Tool success', async () => {
    const cause = new Error('handler failed');
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', { action: 'inspect' }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [
        createTool(() => {
          throw cause;
        }),
      ],
      policy: { defaultDecision: 'allow' },
    });
    const session = await startToolSession(agent);

    const events = await collectEvents(
      session.runStream({ instruction: 'Try the Tool.' })
    );

    expect(events.some((event) => event.type === 'tool.failed')).toBe(true);
    expect(events.some((event) => event.type === 'tool.completed')).toBe(false);
    expect(backend.sessions[0].toolResults).toMatchObject([
      {
        type: 'error',
        toolCallId: 'call-1',
        error: { code: 'AGENT_TOOL_EXECUTION' },
      },
    ]);
  });

  it('aborts the handler signal and fails the Turn on Tool timeout', async () => {
    vi.useFakeTimers();
    try {
      let handlerSignal: AbortSignal | undefined;
      const backend = new MockBackend(
        singleToolStream('workspace_inspect', { action: 'inspect' }),
        { tools: true }
      );
      const agent = createAgent({
        ...agentDefinition,
        backend,
        tools: [
          createTool(
            (_input, context) => {
              handlerSignal = context.signal;
              return new Promise(() => undefined);
            },
            { timeoutMs: 25 }
          ),
        ],
        policy: { defaultDecision: 'allow' },
      });
      const session = await startToolSession(agent);
      const events: AgentEvent[] = [];
      const running = consume(
        session.runStream({ instruction: 'Time-bound the Tool.' }),
        events
      );
      const rejected = expect(running).rejects.toThrow(AgentToolExecutionError);

      await vi.advanceTimersByTimeAsync(25);
      await rejected;

      expect(handlerSignal?.aborted).toBe(true);
      expect(
        events.find((event) => event.type === 'tool.failed')
      ).toMatchObject({
        error: {
          code: 'AGENT_TOOL_EXECUTION',
          details: { reason: 'timeout' },
        },
      });
      expect(events.at(-1)?.type).toBe('turn.failed');
      expect(backend.sessions[0].toolResults).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('distinguishes caller cancellation from a recoverable Tool failure', async () => {
    let handlerSignal: AbortSignal | undefined;
    const events: AgentEvent[] = [];
    const controller = new AbortController();
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', { action: 'inspect' }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [
        createTool((_input, context) => {
          handlerSignal = context.signal;
          return new Promise(() => undefined);
        }),
      ],
      policy: { defaultDecision: 'allow' },
    });
    const session = await startToolSession(agent);
    const running = consume(
      session.runStream(
        { instruction: 'Cancel this Tool.' },
        { signal: controller.signal }
      ),
      events
    );
    const rejected = expect(running).rejects.toThrow(AgentInterruptedError);
    await waitUntil(() => handlerSignal !== undefined);

    controller.abort();

    await rejected;
    expect(handlerSignal?.aborted).toBe(true);
    expect(events.find((event) => event.type === 'tool.failed')).toMatchObject({
      error: { code: 'AGENT_INTERRUPTED' },
    });
    expect(events.at(-1)?.type).toBe('turn.interrupted');
    expect(backend.sessions[0].toolResults).toEqual([]);
  });

  it('executes the immutable arguments that the host approved', async () => {
    const mutableArguments = { action: 'inspect' };
    const execute = vi.fn(async (_input: unknown) => ({ ok: true }));
    const events: AgentEvent[] = [];
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', mutableArguments),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute, { risk: 'external' })],
      policy: {
        defaultDecision: 'allow',
        requireApproval: { riskAtLeast: 'external' },
      },
    });
    const session = await startToolSession(agent);
    const running = consume(
      session.runStream({ instruction: 'Approve exact arguments.' }),
      events
    );
    await waitUntil(() =>
      events.some((event) => event.type === 'approval.requested')
    );

    mutableArguments.action = 'summarize';
    const approval = events.find(
      (event) => event.type === 'approval.requested'
    );
    if (approval?.type !== 'approval.requested') {
      throw new Error('Approval request was not emitted');
    }
    await session.resolveApproval(approval.request.id, 'allow-once');
    await running;

    expect(execute).toHaveBeenCalledWith(
      { action: 'inspect' },
      expect.any(Object)
    );
    expect(Object.isFrozen(execute.mock.calls[0][0])).toBe(true);
  });

  it('does not relabel handler success when an after-Tool hook fails', async () => {
    const execute = vi.fn(async () => ({ published: true }));
    const events: AgentEvent[] = [];
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', { action: 'inspect' }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
      policy: { defaultDecision: 'allow' },
      hooks: [
        {
          id: 'audit-output',
          phase: 'after-tool',
          onError: 'fail-turn',
          run: () => {
            throw new Error('audit failed');
          },
        },
      ],
    });
    const session = await startToolSession(agent);
    const running = consume(
      session.runStream({ instruction: 'Record exact outcome.' }),
      events
    );

    await expect(running).rejects.toThrow(AgentHookError);
    expect(execute).toHaveBeenCalledOnce();
    expect(events.some((event) => event.type === 'tool.completed')).toBe(true);
    expect(events.some((event) => event.type === 'tool.failed')).toBe(false);
    expect(backend.sessions[0].toolResults).toEqual([]);
  });

  it('cancels a custom policy that does not resolve', async () => {
    const events: AgentEvent[] = [];
    const controller = new AbortController();
    const execute = vi.fn();
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', { action: 'inspect' }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
      policy: { evaluate: () => new Promise(() => undefined) },
    });
    const session = await startToolSession(agent);
    const running = consume(
      session.runStream(
        { instruction: 'Cancel policy evaluation.' },
        { signal: controller.signal }
      ),
      events
    );
    const rejected = expect(running).rejects.toThrow(AgentInterruptedError);
    await waitUntil(() =>
      events.some((event) => event.type === 'tool.requested')
    );

    controller.abort();

    await rejected;
    expect(execute).not.toHaveBeenCalled();
  });

  it('cancels a backend that does not accept a Tool result', async () => {
    const events: AgentEvent[] = [];
    const controller = new AbortController();
    const execute = vi.fn(async () => ({ ok: true }));
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', { action: 'inspect' }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
      policy: { defaultDecision: 'allow' },
    });
    const session = await startToolSession(agent);
    vi.spyOn(backend.sessions[0], 'submitToolResult').mockImplementation(
      () => new Promise(() => undefined)
    );
    const running = consume(
      session.runStream(
        { instruction: 'Cancel result delivery.' },
        { signal: controller.signal }
      ),
      events
    );
    const rejected = expect(running).rejects.toThrow(AgentInterruptedError);
    await waitUntil(() =>
      events.some((event) => event.type === 'tool.completed')
    );

    controller.abort();

    await rejected;
    expect(execute).toHaveBeenCalledOnce();
    expect(events.at(-1)?.type).toBe('turn.interrupted');
  });

  it('rejects duplicate backend Tool call IDs', async () => {
    const execute = vi.fn(async () => ({ ok: true }));
    const backend = new MockBackend(duplicateToolCallStream, { tools: true });
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
      policy: { defaultDecision: 'allow' },
    });
    const session = await startToolSession(agent);

    await expect(
      session.run({ instruction: 'Reject duplicate IDs.' })
    ).rejects.toThrow(AgentBackendProtocolError);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('stops a backend that repeatedly requests Tools', async () => {
    const execute = vi.fn(async () => ({ ok: true }));
    const backend = new MockBackend(repeatingToolStream(3), { tools: true });
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
      policy: { defaultDecision: 'allow' },
      limits: { maxToolCallsPerTurn: 2 },
    });
    const session = await startToolSession(agent);

    await expect(
      session.run({ instruction: 'Bound the Tool loop.' })
    ).rejects.toThrow(AgentToolLoopLimitError);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(backend.sessions[0].toolResults).toHaveLength(2);
  });

  it('fails closed for a safety hook and skips an explicitly optional hook', async () => {
    const execute = vi.fn(async () => ({ ok: true }));
    const failingHook: AgentHook = {
      id: 'validate-tool-input',
      phase: 'before-tool',
      onError: 'fail-turn',
      run() {
        throw new Error('unsafe');
      },
    };
    const backend = new MockBackend(
      singleToolStream('workspace_inspect', { action: 'inspect' }),
      { tools: true }
    );
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [createTool(execute)],
      policy: { defaultDecision: 'allow' },
      hooks: [failingHook],
    });
    const session = await startToolSession(agent);

    await expect(
      session.run({ instruction: 'Run safety hooks.' })
    ).rejects.toThrow(AgentHookError);
    expect(execute).not.toHaveBeenCalled();

    const optionalHook: AgentHook = {
      ...failingHook,
      id: 'optional-tool-output',
      phase: 'after-tool',
      onError: 'skip',
    };
    const secondBackend = new MockBackend(
      singleToolStream('workspace_inspect', { action: 'inspect' }),
      { tools: true }
    );
    const secondAgent = createAgent({
      ...agentDefinition,
      backend: secondBackend,
      tools: [createTool(execute)],
      policy: { defaultDecision: 'allow' },
      hooks: [optionalHook],
    });
    const secondSession = await startToolSession(secondAgent);

    await expect(
      secondSession.run({ instruction: 'Skip an optional hook.' })
    ).resolves.toMatchObject({ message: 'Tool processed' });
    expect(execute).toHaveBeenCalledOnce();
  });
});

function singleToolStream(
  toolName: string,
  toolArguments: unknown
): (
  _input: unknown,
  _options: unknown,
  session: MockBackendSession
) => AsyncIterable<AgentBackendEvent> {
  return async function* (_input, _options, session) {
    yield {
      type: 'tool.requested',
      toolCallId: 'call-1',
      toolName,
      arguments: toolArguments,
    };
    await waitUntil(() => session.toolResults.length === 1);
    yield { type: 'completed', message: 'Tool processed' };
  };
}

function repeatingToolStream(count: number) {
  return async function* (
    _input: unknown,
    _options: unknown,
    session: MockBackendSession
  ): AsyncIterable<AgentBackendEvent> {
    for (let index = 0; index < count; index += 1) {
      yield {
        type: 'tool.requested',
        toolCallId: `call-${index + 1}`,
        toolName: 'workspace_inspect',
        arguments: { action: 'inspect' },
      };
      await waitUntil(() => session.toolResults.length === index + 1);
    }
    yield { type: 'completed', message: 'Loop completed' };
  };
}

async function* duplicateToolCallStream(
  _input: unknown,
  _options: unknown,
  session: MockBackendSession
): AsyncIterable<AgentBackendEvent> {
  const request: AgentBackendEvent = {
    type: 'tool.requested',
    toolCallId: 'duplicate-call',
    toolName: 'workspace_inspect',
    arguments: { action: 'inspect' },
  };
  yield request;
  await waitUntil(() => session.toolResults.length === 1);
  yield request;
}

async function startToolSession(agent: ReturnType<typeof createAgent>) {
  return agent.startSession({
    purpose: 'workspace',
    audience: 'operator',
    inputTrust: 'trusted',
    allowedTools: ['workspace.inspect'],
  });
}

async function collectEvents<T>(events: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = [];
  for await (const event of events) collected.push(event);
  return collected;
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
