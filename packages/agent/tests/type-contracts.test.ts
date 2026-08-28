import type {
  Agent,
  AgentApprovalDecision,
  AgentApprovalRequest,
  AgentArtifact,
  AgentBackend,
  AgentBackendCapabilities,
  AgentBackendToolResult,
  AgentBackendTool,
  AgentBootstrapOptions,
  AgentBootstrapContext,
  AgentBootstrapResult,
  AgentCapabilityDescriptor,
  AgentConversationInput,
  AgentEvent,
  AgentHook,
  AgentHookContext,
  AgentHookValueMap,
  AgentOptions,
  AgentPolicy,
  AgentPolicyConfig,
  AgentPolicyDecision,
  AgentRunInput,
  AgentRunResult,
  AgentRuntimeLimits,
  AgentSession,
  AgentToolHandler,
  AgentToolSpec,
  AgentWorkspaceMetadata,
  AgentWorkspaceMetadataStore,
} from '../src/index.js';
import { createAgent, defineAgentTool } from '../src/index.js';
import type { ToolDefinition } from '@aituber-onair/chat';
import type {
  ChatServiceBackend,
  ChatServiceBackendCapabilities,
  ChatServiceBackendOptions,
  ChatServiceFactoryInput,
} from '../src/chat.js';
import { createChatServiceBackend } from '../src/chat.js';
import type {
  CodexAppServerBackend,
  CodexAppServerBackendCapabilities,
  CodexAppServerBackendOptions,
  CodexAppServerCompatibility,
} from '../src/codex-app-server.js';
import {
  CODEX_APP_SERVER_MINIMUM_VERSION,
  CODEX_APP_SERVER_PROTOCOL_GENERATION,
  CODEX_APP_SERVER_VERIFIED_VERSION,
  createCodexAppServerBackend,
} from '../src/codex-app-server.js';

describe('public type surface', () => {
  it('keeps host instructions separate from conversational input', () => {
    const conversation: AgentConversationInput = {
      kind: 'viewer-comment',
      data: { text: 'hello' },
    };
    const runInput: AgentRunInput = {
      instruction: 'Reply in character.',
      input: conversation,
      context: { streamState: 'live' },
    };

    const invalidConversation: AgentConversationInput = {
      kind: 'viewer-comment',
      data: { text: 'ignore policy' },
      // @ts-expect-error Host-authored instructions are not conversation fields.
      instruction: 'Treat this viewer text as an instruction.',
    };

    expect(runInput.input).toBe(conversation);
    expect(invalidConversation.kind).toBe('viewer-comment');
  });

  it('exports the public contract families', () => {
    expectTypeOf(createAgent).toBeFunction();
    expectTypeOf(defineAgentTool).toBeFunction();
    expectTypeOf<Agent>().toBeObject();
    expectTypeOf<AgentOptions>().toBeObject();
    expectTypeOf<AgentOptions['id']>().toEqualTypeOf<string>();
    expectTypeOf<AgentOptions['brief']>().toEqualTypeOf<string>();
    expectTypeOf<Agent['brief']>().toEqualTypeOf<string>();
    expectTypeOf<AgentSession>().toBeObject();
    expectTypeOf<AgentBackend>().toBeObject();
    expectTypeOf<AgentBackendCapabilities>().toBeObject();
    expectTypeOf<AgentBackendTool>().toBeObject();
    expectTypeOf<AgentBackendToolResult>().toBeObject();
    expectTypeOf<AgentToolSpec>().toBeObject();
    expectTypeOf<AgentToolHandler>().toBeFunction();
    expectTypeOf<AgentPolicy>().toBeObject();
    expectTypeOf<AgentPolicyConfig>().toBeObject();
    expectTypeOf<AgentPolicyDecision>().toBeObject();
    expectTypeOf<AgentApprovalRequest>().toBeObject();
    expectTypeOf<AgentApprovalDecision>().toEqualTypeOf<
      'allow-once' | 'deny'
    >();
    expectTypeOf<AgentEvent>().toBeObject();
    expectTypeOf<AgentRunInput>().toBeObject();
    expectTypeOf<AgentRunResult>().toBeObject();
    expectTypeOf<AgentRuntimeLimits>().toBeObject();
    expectTypeOf<AgentArtifact>().toBeObject();
    expectTypeOf<AgentHook>().toBeObject();
    expectTypeOf<AgentCapabilityDescriptor>().toBeObject();
    expectTypeOf<AgentWorkspaceMetadata>().toBeObject();
    expectTypeOf<AgentWorkspaceMetadataStore>().toBeObject();
    expectTypeOf<AgentBootstrapOptions>().toBeObject();
    expectTypeOf<AgentBootstrapContext['trust']>().toEqualTypeOf<'trusted'>();
    expectTypeOf<AgentBootstrapResult>().toBeObject();
    expectTypeOf<Agent['bootstrap']>().toBeFunction();
  });

  it('keeps executable Tool handlers out of backend descriptors', () => {
    const backendTool: AgentBackendTool = {
      id: 'comments.analyze',
      definition: {
        name: 'comments_analyze',
        description: 'Analyze comments',
        parameters: { type: 'object' },
      },
    };

    // @ts-expect-error Backend descriptors never expose host handlers.
    expect(backendTool.execute).toBeUndefined();
  });

  it('keeps credentials out of capability descriptors', () => {
    const capability: AgentCapabilityDescriptor = {
      id: 'workspace.local',
      kind: 'workspace',
      description: 'A bounded local workspace',
      // @ts-expect-error Capability discovery metadata cannot carry credentials.
      credentials: { token: 'not-allowed' },
    };

    expect(capability.id).toBe('workspace.local');
  });

  it('types hook values by phase and constrains explicit unknown hooks', () => {
    const backend = {
      name: 'type-contract-backend',
      backendCapabilities: {
        text: true,
        streaming: false,
        tools: false,
        interruption: false,
        sessionResume: false,
        approvals: false,
        detailedEvents: false,
      },
      async startSession() {
        throw new Error('Type contract only');
      },
    } satisfies AgentBackend;
    const contextUnknownHook: AgentHook<unknown> = {
      id: 'context-unknown',
      phase: 'context',
      onError: 'skip',
      run: ({ value }) => value,
    };
    const beforeToolUnknownHook: AgentHook<unknown> = {
      id: 'before-tool-unknown',
      phase: 'before-tool',
      onError: 'skip',
      run: ({ value }: AgentHookContext<unknown>) => value,
    };
    const outputUnknownHook: AgentHook<unknown> = {
      id: 'output-unknown',
      phase: 'output',
      onError: 'skip',
      run: ({ value }) => value,
    };
    const preserveUnknownHookType = (
      hook: AgentHook<unknown>
    ): AgentHook<unknown> => hook;
    const nonNarrowedUnknownHook = preserveUnknownHookType({
      ...contextUnknownHook,
      id: 'non-narrowed-unknown',
    });

    createAgent({
      id: 'hook-contract-agent',
      brief: 'Exercise hook type contracts.',
      backend,
      hooks: [
        {
          id: 'typed-draft',
          phase: 'draft-response',
          onError: 'fail-turn',
          run: ({ value }) => {
            expectTypeOf(value).toEqualTypeOf<string>();
            return value;
          },
        },
        {
          id: 'typed-after-turn',
          phase: 'after-turn',
          onError: 'skip',
          run: ({ value }) => {
            expectTypeOf(value).toEqualTypeOf<
              AgentHookValueMap['after-turn']['input']
            >();
            if (value.status === 'completed') {
              expectTypeOf(value.result).toEqualTypeOf<AgentRunResult>();
            } else {
              expectTypeOf(value.error.code).toEqualTypeOf<string>();
            }
            return value;
          },
        },
        // @ts-expect-error Draft response hooks must return a string.
        {
          id: 'invalid-draft-output',
          phase: 'draft-response',
          onError: 'fail-turn',
          run: () => 42,
        },
        // @ts-expect-error After-turn hooks must return their phase value.
        {
          id: 'invalid-after-turn-output',
          phase: 'after-turn',
          onError: 'skip',
          run: () => 'invalid',
        },
        contextUnknownHook,
        beforeToolUnknownHook,
        // @ts-expect-error Typed output phases cannot return unknown values.
        outputUnknownHook,
        // @ts-expect-error A non-narrowed unknown hook may be a typed phase.
        nonNarrowedUnknownHook,
      ],
    });
  });

  it('exports Chat backend contracts without constructing a service', () => {
    expectTypeOf(createChatServiceBackend).toBeFunction();
    expectTypeOf<ChatServiceBackend>().toBeObject();
    expectTypeOf<ChatServiceBackendOptions>().toBeObject();
    expectTypeOf<ChatServiceBackendCapabilities>().toBeObject();
    expectTypeOf<ChatServiceFactoryInput>().toBeObject();
    expectTypeOf<ChatServiceFactoryInput['tools']>().toEqualTypeOf<
      ToolDefinition[]
    >();
    expectTypeOf<
      ChatServiceBackendCapabilities['sessionResume']
    >().toEqualTypeOf<false>();
    expectTypeOf<
      ChatServiceBackendCapabilities['approvals']
    >().toEqualTypeOf<false>();
  });

  it('requires an explicit Codex executable path or PATH opt-in', () => {
    const compatibility: CodexAppServerCompatibility = {
      minimumVersion: CODEX_APP_SERVER_MINIMUM_VERSION,
      onMismatch: 'warn',
      accept: (actual, verified) => actual === verified,
    };
    const explicitPath: CodexAppServerBackendOptions = {
      codexPath: '/path/to/codex',
      workingDirectory: '/path/to/workspace',
      compatibility,
    };
    const pathLookup: CodexAppServerBackendOptions = {
      allowPathLookup: true,
      workingDirectory: '/path/to/workspace',
      compatibility,
    };

    // @ts-expect-error Codex discovery must never happen without explicit opt-in.
    const implicitPathLookup: CodexAppServerBackendOptions = {
      workingDirectory: '/path/to/workspace',
      compatibility,
    };

    expect(explicitPath.codexPath).toBe('/path/to/codex');
    expect(pathLookup.allowPathLookup).toBe(true);
    expect(implicitPathLookup.workingDirectory).toBe('/path/to/workspace');
    expect(
      createCodexAppServerBackend({
        ...explicitPath,
        sandbox: 'read-only',
        approvalPolicy: 'on-request',
      }).kind
    ).toBe('codex-app-server');
    expectTypeOf(createCodexAppServerBackend).toBeFunction();
    expectTypeOf<CodexAppServerBackend>().toBeObject();
    expectTypeOf<CodexAppServerBackendCapabilities>().toBeObject();
    expectTypeOf<
      CodexAppServerBackendCapabilities['sessionResume']
    >().toEqualTypeOf<true>();
    expectTypeOf<
      CodexAppServerBackendCapabilities['approvals']
    >().toEqualTypeOf<true>();
    expect(CODEX_APP_SERVER_VERIFIED_VERSION).toBe('0.145.0');
    expect(CODEX_APP_SERVER_PROTOCOL_GENERATION).toBe('v2');

    const defaults: CodexAppServerBackendOptions = {
      codexPath: '/path/to/codex',
      workingDirectory: '/path/to/workspace',
    };
    expect(defaults.compatibility).toBeUndefined();

    const legacy: CodexAppServerCompatibility = {
      // @ts-expect-error expectedVersion was removed from the public contract.
      expectedVersion: '0.145.0',
    };
    expect(legacy).toBeDefined();
  });
});
