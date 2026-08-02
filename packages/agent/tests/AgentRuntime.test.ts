import { createAgent } from '../src/index.js';
import {
  AgentBackendProtocolError,
  AgentCapabilityError,
  AgentConfigurationError,
  AgentSessionClosedError,
} from '../src/errors.js';
import type { AgentToolSpec } from '../src/types.js';
import { MockBackend, completedTextStream } from './helpers/mockBackend.js';

const agentDefinition = {
  id: 'miko',
  brief: 'You are Miko, calm AI staff who reports evidence first.',
};

const readTool: AgentToolSpec = {
  id: 'comments.analyze',
  definition: {
    name: 'comments_analyze',
    description: 'Analyze comments',
    parameters: { type: 'object' },
  },
  risk: 'read',
  execute: async () => ({ ok: true }),
};

describe('AgentRuntime', () => {
  it('validates the definition before creating an Agent', () => {
    const backend = new MockBackend(() => completedTextStream());

    expect(() => createAgent(null as never)).toThrow(AgentConfigurationError);
    expect(() =>
      createAgent({
        ...agentDefinition,
        brief: '',
        backend,
      })
    ).toThrow(AgentConfigurationError);
    expect(() =>
      createAgent({
        ...agentDefinition,
        backend,
        character: { name: 'Miko' },
      } as never)
    ).toThrow(AgentConfigurationError);
    expect(() =>
      createAgent({ ...agentDefinition, backend, memory: {} } as never)
    ).toThrow(AgentConfigurationError);
  });

  it('starts isolated Sessions with deny-by-default Tool visibility', async () => {
    const backend = new MockBackend(() => completedTextStream(), {
      tools: true,
    });
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [readTool],
    });

    const performer = await agent.startSession({
      purpose: 'performer',
      audience: 'public',
      inputTrust: 'untrusted',
    });
    const operator = await agent.startSession({
      purpose: 'operations',
      audience: 'operator',
      inputTrust: 'trusted',
      allowedTools: ['comments.analyze'],
    });

    expect(agent.id).toBe(agentDefinition.id);
    expect(agent.brief).toBe(agentDefinition.brief);
    expect(agent.capabilities).toEqual(backend.capabilities);
    expect(Object.isFrozen(agent.capabilities)).toBe(true);
    expect(performer.allowedTools).toEqual([]);
    expect(operator.allowedTools).toEqual(['comments.analyze']);
    expect(backend.startInputs[0].brief).toBe(agentDefinition.brief);
    expect(backend.startInputs[1].brief).toBe(agentDefinition.brief);
    expect(backend.startInputs[0].tools).toEqual([]);
    expect(backend.startInputs[1].tools).toEqual([
      { id: readTool.id, definition: readTool.definition },
    ]);
    expect(backend.startInputs[1].tools[0]).not.toHaveProperty('execute');
    expect(backend.startInputs[1].tools[0]).not.toHaveProperty('risk');
  });

  it('rejects an unknown Session Tool before starting the backend', async () => {
    const backend = new MockBackend(() => completedTextStream());
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [readTool],
    });

    await expect(
      agent.startSession({
        purpose: 'operations',
        audience: 'operator',
        inputTrust: 'trusted',
        allowedTools: ['workspace.write'],
      })
    ).rejects.toThrow(AgentConfigurationError);
    expect(backend.startInputs).toHaveLength(0);
  });

  it('rejects a Tool backend that cannot receive results before execution', async () => {
    const backend = new MockBackend(() => completedTextStream(), {
      tools: true,
    });
    const close = vi.fn(async () => undefined);
    vi.spyOn(backend, 'startSession').mockResolvedValue({
      runStream: () => completedTextStream(),
      close,
    });
    const agent = createAgent({
      ...agentDefinition,
      backend,
      tools: [readTool],
    });

    await expect(
      agent.startSession({
        purpose: 'operations',
        audience: 'operator',
        inputTrust: 'trusted',
        allowedTools: ['comments.analyze'],
      })
    ).rejects.toThrow(AgentBackendProtocolError);
    expect(close).toHaveBeenCalledOnce();
  });

  it('rejects an invalid backend Session ID before exposing the Session', async () => {
    const backend = new MockBackend(() => completedTextStream());
    const close = vi.fn(async () => undefined);
    vi.spyOn(backend, 'startSession').mockResolvedValue({
      id: '',
      runStream: () => completedTextStream(),
      close,
    });
    const agent = createAgent({ ...agentDefinition, backend });

    await expect(
      agent.startSession({
        purpose: 'operations',
        audience: 'operator',
        inputTrust: 'trusted',
      })
    ).rejects.toThrow(AgentBackendProtocolError);
    expect(close).toHaveBeenCalledOnce();
  });

  it('rejects policy references to unregistered Tools', () => {
    const backend = new MockBackend(() => completedTextStream(), {
      tools: true,
    });

    expect(() =>
      createAgent({
        ...agentDefinition,
        backend,
        tools: [readTool],
        policy: {
          defaultDecision: 'deny',
          allowTools: ['workspace.write'],
        },
      })
    ).toThrow(AgentConfigurationError);
  });

  it('rejects credentials and unknown fields in capability descriptors', () => {
    const backend = new MockBackend(() => completedTextStream());

    expect(() =>
      createAgent({
        ...agentDefinition,
        backend,
        capabilityCatalog: [
          {
            id: 'workspace.local',
            kind: 'workspace',
            description: 'A bounded workspace',
            credentials: { token: 'not-allowed' },
          },
        ],
      } as never)
    ).toThrow(AgentConfigurationError);
  });

  it('rejects unknown Agent and Session limit keys', async () => {
    const backend = new MockBackend(() => completedTextStream());

    expect(() =>
      createAgent({
        ...agentDefinition,
        backend,
        limits: { maxToolCallPerTurn: 1 },
      } as never)
    ).toThrow(AgentConfigurationError);

    const agent = createAgent({ ...agentDefinition, backend });
    await expect(
      agent.startSession({
        purpose: 'operations',
        audience: 'operator',
        inputTrust: 'trusted',
        limits: { maxToolCallPerTurn: 1 },
      } as never)
    ).rejects.toThrow(AgentConfigurationError);
    expect(backend.startInputs).toHaveLength(0);
  });

  it('rejects unknown policy options instead of silently weakening approval', () => {
    const backend = new MockBackend(() => completedTextStream(), {
      tools: true,
    });

    expect(() =>
      createAgent({
        ...agentDefinition,
        backend,
        tools: [readTool],
        policy: {
          defaultDecision: 'allow',
          requireApproval: {
            riskAtleast: 'read',
          },
        } as never,
      })
    ).toThrow(AgentConfigurationError);
  });

  it('resumes only when the backend declares resume support', async () => {
    const unsupportedBackend = new MockBackend(() => completedTextStream(), {
      sessionResume: false,
    });
    const unsupportedAgent = createAgent({
      ...agentDefinition,
      backend: unsupportedBackend,
    });

    await expect(
      unsupportedAgent.resumeSession({
        backendSessionId: 'existing-thread',
        purpose: 'workspace',
        audience: 'owner',
        inputTrust: 'trusted',
      })
    ).rejects.toThrow(AgentCapabilityError);

    const backend = new MockBackend(() => completedTextStream());
    const agent = createAgent({ ...agentDefinition, backend });
    const session = await agent.resumeSession({
      id: 'workspace-session',
      backendSessionId: 'existing-thread',
      purpose: 'workspace',
      audience: 'owner',
      inputTrust: 'trusted',
    });
    const events = await collectEvents(
      session.runStream({ instruction: 'Inspect the workspace.' })
    );

    expect(backend.startInputs[0].backendSessionId).toBe('existing-thread');
    expect(events[0]).toMatchObject({
      type: 'session.resumed',
      backendSessionId: 'existing-thread',
    });
  });

  it('closes all Sessions and rejects new Sessions afterwards', async () => {
    const backend = new MockBackend(() => completedTextStream());
    const agent = createAgent({ ...agentDefinition, backend });
    await agent.startSession({
      purpose: 'one',
      audience: 'private',
      inputTrust: 'trusted',
    });
    await agent.startSession({
      purpose: 'two',
      audience: 'private',
      inputTrust: 'trusted',
    });

    await agent.close();
    await agent.close();

    expect(backend.sessions.map((session) => session.closeCalls)).toEqual([
      1, 1,
    ]);
    await expect(
      agent.startSession({
        purpose: 'late',
        audience: 'private',
        inputTrust: 'trusted',
      })
    ).rejects.toThrow(AgentSessionClosedError);
  });

  it('waits for a Session that is still starting before Agent close completes', async () => {
    const backend = new MockBackend(() => completedTextStream());
    const originalStartSession = backend.startSession.bind(backend);
    let releaseStart: (() => void) | undefined;
    const startGate = new Promise<void>((resolve) => {
      releaseStart = resolve;
    });
    vi.spyOn(backend, 'startSession').mockImplementation(async (input) => {
      await startGate;
      return originalStartSession(input);
    });
    const agent = createAgent({ ...agentDefinition, backend });
    const starting = agent.startSession({
      purpose: 'pending',
      audience: 'private',
      inputTrust: 'trusted',
    });

    const closing = agent.close();
    releaseStart?.();

    await expect(starting).rejects.toThrow(AgentSessionClosedError);
    await closing;
    expect(backend.sessions[0].closeCalls).toBe(1);
  });
});

async function collectEvents<T>(events: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}
