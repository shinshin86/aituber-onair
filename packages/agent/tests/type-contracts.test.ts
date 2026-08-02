import type {
  Agent,
  AgentApprovalDecision,
  AgentApprovalRequest,
  AgentArtifact,
  AgentBackend,
  AgentBackendCapabilities,
  AgentBackendToolResult,
  AgentBackendTool,
  AgentConversationInput,
  AgentEvent,
  AgentHook,
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
} from '../src/index.js';
import { createAgent, defineAgentTool } from '../src/index.js';
import type { ToolDefinition } from '@aituber-onair/chat';
import type {
  ChatServiceBackend,
  ChatServiceBackendCapabilities,
  ChatServiceBackendOptions,
  ChatServiceFactoryInput,
} from '../src/chat.js';
import type {
  CodexAppServerBackend,
  CodexAppServerBackendCapabilities,
  CodexAppServerBackendOptions,
  CodexAppServerCompatibility,
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

  it('exports the complete Phase 1 contract families', () => {
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

  it('exports Chat backend contracts without constructing a service', () => {
    expectTypeOf<ChatServiceBackend>().toBeObject();
    expectTypeOf<ChatServiceBackendOptions>().toBeObject();
    expectTypeOf<ChatServiceBackendCapabilities>().toBeObject();
    expectTypeOf<ChatServiceFactoryInput>().toBeObject();
    expectTypeOf<ChatServiceFactoryInput['tools']>().toEqualTypeOf<
      ToolDefinition[]
    >();
  });

  it('requires an explicit Codex executable path or PATH opt-in', () => {
    const compatibility: CodexAppServerCompatibility = {
      expectedVersion: 'pinned-version',
      schemaVersion: 'pinned-schema',
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
    expectTypeOf<CodexAppServerBackend>().toBeObject();
    expectTypeOf<CodexAppServerBackendCapabilities>().toBeObject();
  });
});
