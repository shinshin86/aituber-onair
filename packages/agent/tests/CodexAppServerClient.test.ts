import {
  AgentBackendCompatibilityError,
  AgentBackendProcessError,
  AgentBackendProtocolError,
} from '../src/errors.js';
import {
  CodexAppServerClient,
  compareCodexVersions,
} from '../src/backends/codex/client.js';
import type { CodexAppServerClientOptions } from '../src/backends/codex/client.js';
import { FakeCodexProcessFactory } from './helpers/fakeCodexProcess.js';

const options: CodexAppServerClientOptions = {
  executable: '/path/to/codex',
  workingDirectory: '/path/to/workspace',
  environment: {},
};

describe('CodexAppServerClient', () => {
  it('performs initialize before initialized and stable requests', async () => {
    const factory = new FakeCodexProcessFactory();
    const connecting = CodexAppServerClient.connect(options, {
      processFactory: factory,
    });
    await waitUntil(() => factory.processes.length === 1);
    const process = factory.processes[0];

    expect(process.messages()).toEqual([
      {
        id: 1,
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'aituber_onair_agent',
            title: 'AITuber OnAir Agent',
            version: '0.0.0',
          },
          capabilities: {
            experimentalApi: false,
            requestAttestation: false,
          },
        },
      },
    ]);
    process.send({
      id: 1,
      result: {
        userAgent: 'codex-cli/0.145.0',
        codexHome: '/codex-home',
        platformFamily: 'unix',
        platformOs: 'macos',
      },
    });
    const client = await connecting;

    const account = client.readAccount();
    expect(process.messages()).toEqual([
      expect.objectContaining({ method: 'initialize' }),
      { method: 'initialized' },
      {
        id: 2,
        method: 'account/read',
        params: { refreshToken: false },
      },
    ]);
    process.send({
      id: 2,
      result: { account: null, requiresOpenaiAuth: true },
    });
    await expect(account).resolves.toEqual({
      account: null,
      requiresOpenaiAuth: true,
    });
    await process.finish(() => client.close());
  });

  it('sends only the selected stable Thread and Turn fields', async () => {
    const { client, process } = await connectClient();
    const configuration = {
      cwd: '/workspace',
      developerInstructions: 'You are Miko.',
      sandbox: 'read-only' as const,
      approvalPolicy: 'on-request' as const,
      model: 'model-id',
      ephemeral: true,
    };

    const started = client.startThread(configuration);
    expect(process.messages().at(-1)).toEqual({
      id: 2,
      method: 'thread/start',
      params: {
        cwd: '/workspace',
        developerInstructions: 'You are Miko.',
        sandbox: 'read-only',
        approvalPolicy: 'on-request',
        approvalsReviewer: 'user',
        model: 'model-id',
        ephemeral: true,
      },
    });
    process.send({ id: 2, result: { thread: { id: 'thread-1' } } });
    await started;

    const turn = client.startTurn('thread-1', [
      { type: 'text', text: 'Inspect the workspace.', text_elements: [] },
    ]);
    expect(process.messages().at(-1)).toEqual({
      id: 3,
      method: 'turn/start',
      params: {
        threadId: 'thread-1',
        input: [
          {
            type: 'text',
            text: 'Inspect the workspace.',
            text_elements: [],
          },
        ],
      },
    });
    process.send({
      id: 3,
      result: { turn: { id: 'turn-1', status: 'inProgress' } },
    });
    await turn;
    await process.finish(() => client.close());
  });

  it('reapplies developer instructions on resume and fork', async () => {
    const { client, process } = await connectClient();
    const configuration = {
      cwd: '/workspace',
      developerInstructions: 'Current Agent brief',
      sandbox: 'read-only' as const,
      approvalPolicy: 'on-request' as const,
    };

    const resumed = client.resumeThread('thread-1', configuration);
    expect(process.messages().at(-1)).toMatchObject({
      method: 'thread/resume',
      params: {
        threadId: 'thread-1',
        developerInstructions: 'Current Agent brief',
      },
    });
    process.send({ id: 2, result: { thread: { id: 'thread-1' } } });
    await resumed;

    const forked = client.forkThread('thread-1', configuration);
    expect(process.messages().at(-1)).toMatchObject({
      method: 'thread/fork',
      params: {
        threadId: 'thread-1',
        developerInstructions: 'Current Agent brief',
      },
    });
    process.send({ id: 3, result: { thread: { id: 'thread-2' } } });
    await forked;
    await process.finish(() => client.close());
  });

  it('supports model listing, steering, and interruption', async () => {
    const { client, process } = await connectClient();

    const models = client.listModels({ limit: 20, includeHidden: false });
    process.send({ id: 2, result: { data: [], nextCursor: null } });
    await models;
    const steering = client.steerTurn('thread-1', 'turn-1', [
      { type: 'text', text: 'Also check tests.', text_elements: [] },
    ]);
    process.send({ id: 3, result: { turnId: 'turn-1' } });
    await steering;
    const interrupting = client.interruptTurn('thread-1', 'turn-1');
    process.send({ id: 4, result: {} });
    await interrupting;

    expect(process.messages().slice(2)).toEqual([
      {
        id: 2,
        method: 'model/list',
        params: { limit: 20, includeHidden: false },
      },
      {
        id: 3,
        method: 'turn/steer',
        params: {
          threadId: 'thread-1',
          expectedTurnId: 'turn-1',
          input: [
            { type: 'text', text: 'Also check tests.', text_elements: [] },
          ],
        },
      },
      {
        id: 4,
        method: 'turn/interrupt',
        params: { threadId: 'thread-1', turnId: 'turn-1' },
      },
    ]);
    await process.finish(() => client.close());
  });

  it('rejects malformed account and model responses', async () => {
    const { client, process } = await connectClient();

    const account = client.readAccount();
    process.send({ id: 2, result: { account: null } });
    await expect(account).rejects.toBeInstanceOf(AgentBackendProtocolError);

    const models = client.listModels();
    process.send({ id: 3, result: { data: [{}], nextCursor: null } });
    await expect(models).rejects.toBeInstanceOf(AgentBackendProtocolError);
    await process.finish(() => client.close());
  });

  it('defaults missing model input modalities for older catalogs', async () => {
    const { client, process } = await connectClient();
    const models = client.listModels();
    process.send({
      id: 2,
      result: {
        data: [
          {
            id: 'model-1',
            model: 'model-1',
            displayName: 'Model 1',
            description: 'A model',
            hidden: false,
            defaultReasoningEffort: 'medium',
            supportsPersonality: true,
            isDefault: true,
          },
        ],
        nextCursor: null,
      },
    });

    await expect(models).resolves.toMatchObject({
      data: [{ inputModalities: ['text', 'image'] }],
    });
    await process.finish(() => client.close());
  });

  it.each([
    ['0.147.0', 'newer'],
    ['0.140.0', 'older but supported'],
  ])('starts with %s and warns for a %s CLI', async (version) => {
    const diagnostics: string[] = [];
    const factory = new FakeCodexProcessFactory();
    factory.version = `codex-cli ${version}`;
    const { client, process } = await connectClient(factory, {
      onDiagnostic: (message) => diagnostics.push(message),
    });

    expect(diagnostics).toEqual([
      expect.stringContaining(`Codex CLI ${version}`),
    ]);
    await process.finish(() => client.close());
  });

  it('starts without diagnostics for the verified CLI', async () => {
    const diagnostics: string[] = [];
    const factory = new FakeCodexProcessFactory();
    const { client, process } = await connectClient(factory, {
      onDiagnostic: (message) => diagnostics.push(message),
    });

    expect(diagnostics).toEqual([]);
    await process.finish(() => client.close());
  });

  it('does not let a mismatch diagnostic failure prevent startup', async () => {
    const factory = new FakeCodexProcessFactory();
    factory.version = 'codex-cli 0.147.0';
    const { client, process } = await connectClient(factory, {
      onDiagnostic: () => {
        throw new Error('observer failed');
      },
    });

    await process.finish(() => client.close());
  });

  it('rejects a CLI below the default minimum before spawn', async () => {
    const factory = new FakeCodexProcessFactory();
    factory.version = 'codex-cli 0.130.0';
    const connecting = CodexAppServerClient.connect(options, {
      processFactory: factory,
    });

    await expect(connecting).rejects.toMatchObject({
      message: expect.stringMatching(/0\.130\.0.*0\.136\.0/),
    });
    await expect(connecting).rejects.toBeInstanceOf(
      AgentBackendCompatibilityError
    );
    expect(factory.processes).toHaveLength(0);
  });

  it('supports reject and allow mismatch policies', async () => {
    const rejectFactory = new FakeCodexProcessFactory();
    rejectFactory.version = 'codex-cli 0.147.0';
    await expect(
      CodexAppServerClient.connect(
        { ...options, compatibility: { onMismatch: 'reject' } },
        { processFactory: rejectFactory }
      )
    ).rejects.toBeInstanceOf(AgentBackendCompatibilityError);
    expect(rejectFactory.processes).toHaveLength(0);

    const diagnostics: string[] = [];
    const allowFactory = new FakeCodexProcessFactory();
    allowFactory.version = 'codex-cli 0.147.0';
    const { client, process } = await connectClient(allowFactory, {
      compatibility: { onMismatch: 'allow' },
      onDiagnostic: (message) => diagnostics.push(message),
    });
    expect(diagnostics).toEqual([]);
    await process.finish(() => client.close());
  });

  it('gives a custom accept policy precedence over all default checks', async () => {
    const allowFactory = new FakeCodexProcessFactory();
    allowFactory.version = 'codex-cli 0.130.0';
    const accept = vi.fn(() => true);
    const { client, process } = await connectClient(allowFactory, {
      compatibility: {
        minimumVersion: '9.0.0',
        onMismatch: 'reject',
        accept,
      },
    });
    expect(accept).toHaveBeenCalledWith('0.130.0', '0.145.0');
    await process.finish(() => client.close());

    const rejectFactory = new FakeCodexProcessFactory();
    const reject = vi.fn(() => false);
    await expect(
      CodexAppServerClient.connect(
        { ...options, compatibility: { accept: reject } },
        { processFactory: rejectFactory }
      )
    ).rejects.toBeInstanceOf(AgentBackendCompatibilityError);
    expect(reject).toHaveBeenCalledWith('0.145.0', '0.145.0');
    expect(rejectFactory.processes).toHaveLength(0);
  });

  it('parses pre-release versions and compares their numeric core', async () => {
    const diagnostics: string[] = [];
    const factory = new FakeCodexProcessFactory();
    factory.version = 'codex-cli 0.148.0-alpha.9';
    const { client, process } = await connectClient(factory, {
      onDiagnostic: (message) => diagnostics.push(message),
    });

    expect(diagnostics).toEqual([expect.stringContaining('0.148.0')]);
    await process.finish(() => client.close());
  });

  it('rejects unrecognized version output before spawn', async () => {
    const factory = new FakeCodexProcessFactory();
    factory.version = 'codex 0.145.0';

    await expect(
      CodexAppServerClient.connect(options, { processFactory: factory })
    ).rejects.toBeInstanceOf(AgentBackendCompatibilityError);
    expect(factory.processes).toHaveLength(0);
  });

  it('maps method-not-found responses to compatibility errors', async () => {
    const { client, process } = await connectClient();
    const account = client.readAccount();
    process.send({
      id: 2,
      error: { code: -32601, message: 'Method not found' },
    });

    await expect(account).rejects.toBeInstanceOf(
      AgentBackendCompatibilityError
    );
    await expect(account).rejects.toMatchObject({
      message: expect.stringMatching(/account\/read.*0\.145\.0.*0\.145\.0/),
    });
    await process.finish(() => client.close());
  });

  it('keeps other JSON-RPC failures as protocol errors', async () => {
    const { client, process } = await connectClient();
    const account = client.readAccount();
    process.send({
      id: 2,
      error: { code: -32602, message: 'Invalid params' },
    });

    await expect(account).rejects.toBeInstanceOf(AgentBackendProtocolError);
    await process.finish(() => client.close());
  });

  it('wraps executable lookup failures', async () => {
    const factory = new FakeCodexProcessFactory();
    factory.versionError = new Error('not found');

    await expect(
      CodexAppServerClient.connect(options, { processFactory: factory })
    ).rejects.toBeInstanceOf(AgentBackendProcessError);

    const spawnFactory = new FakeCodexProcessFactory();
    spawnFactory.spawnError = new Error('spawn failed');
    await expect(
      CodexAppServerClient.connect(options, { processFactory: spawnFactory })
    ).rejects.toBeInstanceOf(AgentBackendProcessError);
  });
});

describe('compareCodexVersions', () => {
  it('compares each numeric version component', () => {
    expect(compareCodexVersions('0.136.0', '0.140.0')).toBeLessThan(0);
    expect(compareCodexVersions('0.9.0', '0.10.0')).toBeLessThan(0);
    expect(compareCodexVersions('1.0.0', '0.147.0')).toBeGreaterThan(0);
  });

  it('returns zero for identical versions', () => {
    expect(compareCodexVersions('0.145.0', '0.145.0')).toBe(0);
  });

  it('ignores pre-release suffixes', () => {
    expect(compareCodexVersions('0.148.0-alpha.9', '0.148.0')).toBe(0);
  });
});

async function connectClient(
  factory = new FakeCodexProcessFactory(),
  overrides: Partial<CodexAppServerClientOptions> = {}
) {
  const connecting = CodexAppServerClient.connect(
    { ...options, ...overrides },
    {
      processFactory: factory,
    }
  );
  await waitUntil(() => factory.processes.length === 1);
  const process = factory.processes[0];
  process.send({
    id: 1,
    result: {
      userAgent: 'codex-cli/0.145.0',
      codexHome: '/codex-home',
      platformFamily: 'unix',
      platformOs: 'macos',
    },
  });
  return { client: await connecting, process };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error('Condition was not reached');
}
