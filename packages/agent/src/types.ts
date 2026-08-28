/** A scalar value accepted by JSON without custom serialization. */
export type JsonPrimitive = boolean | null | number | string;

/** Recursively JSON-serializable data used by persisted and emitted contracts. */
export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

/** Host classification of whether conversational input may contain adversarial data. */
export type AgentInputTrust = 'trusted' | 'untrusted';

/**
 * Intended recipients of a Session: `operator` is operations staff, `owner` is
 * the product owner, `private` is another non-public audience, and `public` is
 * end-user facing. Only `public` is treated as public-facing.
 */
export type AgentAudience = 'operator' | 'owner' | 'private' | 'public';

/**
 * Conversational data is intentionally separate from host-authored
 * instructions. Its trust label is still supplied by the host application.
 */
export interface AgentConversationInput<TData = unknown> {
  readonly kind: string;
  readonly data: TData;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

/** Host instruction plus separately labeled conversation data and context for one Turn. */
export interface AgentRunInput<
  TInput extends AgentConversationInput = AgentConversationInput,
  TContext = unknown,
> {
  /** Host-authored instruction. Never copy untrusted viewer text here. */
  readonly instruction: string;
  /** Conversational data, serialized as user/input content by backends. */
  readonly input?: TInput;
  /** Host-selected supporting context, distinct from instructions and input. */
  readonly context?: TContext;
}

/** Cancellation, timeout, and automatic approval handling for one Turn. */
export interface AgentRunOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /**
   * Answers approval requests for both `run()` and `runStream()`. Throwing or
   * returning an invalid decision denies the request and records the error.
   */
  readonly onApprovalRequest?: (
    request: AgentApprovalRequest,
    context: {
      readonly sessionId: string;
      readonly turnId: string;
      readonly signal: AbortSignal;
    }
  ) => AgentApprovalDecision | Promise<AgentApprovalDecision>;
}

/** Stable provenance linking an Artifact to the Agent, Session, and Turn that created it. */
export interface AgentArtifactSource {
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId: string;
}

/** Versioned JSON output emitted independently from the Agent's text response. */
export interface AgentArtifact<TData extends JsonValue = JsonValue> {
  readonly id: string;
  readonly type: string;
  readonly version: number;
  readonly title?: string;
  readonly data: TData;
  readonly createdAt: string;
  readonly source: AgentArtifactSource;
}

/** Optional token accounting reported by a backend for one Turn. */
export interface AgentUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

/** Validated terminal output returned by `AgentSession.run()`. */
export interface AgentRunResult {
  readonly turnId: string;
  readonly message: string;
  readonly artifacts: readonly AgentArtifact[];
  readonly usage?: AgentUsage;
  readonly backendMetadata?: Readonly<Record<string, JsonValue>>;
}

/**
 * Ordered Tool risk levels: `read < draft < write < external < destructive`.
 * `AgentApprovalRule.riskAtLeast` compares risks using this order.
 */
export type AgentToolRisk =
  | 'read'
  | 'draft'
  | 'write'
  | 'external'
  | 'destructive';

/**
 * Structurally compatible with domain Tool definitions such as those exported
 * by comment-intelligence and manneri.
 */
export interface AgentToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

/**
 * Backend-visible Tool metadata. Executable handlers and enforcement metadata
 * remain inside the Agent runtime and never cross the backend boundary.
 */
export interface AgentBackendTool {
  readonly id: string;
  readonly definition: AgentToolDefinition;
}

/** Runtime identity and cancellation state supplied to a host Tool handler. */
export interface AgentToolExecutionContext {
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly toolCallId: string;
  readonly signal: AbortSignal;
}

/** Synchronous or asynchronous host implementation of an Agent Tool. */
export type AgentToolHandler<TInput = unknown, TOutput = unknown> = {
  bivarianceHack(
    input: TInput,
    context: AgentToolExecutionContext
  ): Promise<TOutput> | TOutput;
}['bivarianceHack'];

/** Complete Tool registration combining model metadata, policy risk, and host execution. */
export interface AgentToolSpec<TInput = unknown, TOutput = unknown> {
  /** Stable logical ID used by policy and audit events. */
  readonly id: string;
  /** Model-facing definition. A backend may map its name when required. */
  readonly definition: AgentToolDefinition;
  readonly risk: AgentToolRisk;
  readonly execute: AgentToolHandler<TInput, TOutput>;
  readonly timeoutMs?: number;
  readonly sensitiveFields?: readonly string[];
}

/** Policy outcome that allows, denies, or pauses a Tool call for host approval. */
export type AgentPolicyDecision =
  | { readonly decision: 'allow'; readonly reason?: string }
  | { readonly decision: 'deny'; readonly reason: string }
  | { readonly decision: 'require-approval'; readonly reason: string };

/** Sanitized facts available while a policy evaluates one requested Tool call. */
export interface AgentPolicyContext {
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
  readonly tool: AgentToolSpec;
  /** Arguments sanitized for policy evaluation and audit output. */
  readonly arguments: unknown;
}

/** Host policy contract evaluated before every runtime-managed Tool execution. */
export interface AgentPolicy {
  evaluate(
    context: AgentPolicyContext
  ): AgentPolicyDecision | Promise<AgentPolicyDecision>;
}

/** Declarative matcher for Tools that require approval by risk threshold or ID. */
export interface AgentApprovalRule {
  readonly riskAtLeast?: AgentToolRisk;
  readonly tools?: readonly string[];
}

/** Declarative allow, deny, and approval rules used by the default policy. */
export interface AgentPolicyConfig {
  readonly defaultDecision: 'allow' | 'deny';
  readonly allowTools?: readonly string[];
  readonly denyTools?: readonly string[];
  readonly requireApproval?: AgentApprovalRule;
}

/** Sanitized Tool or backend operation presented to the host for a decision. */
export interface AgentApprovalRequest {
  readonly id: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly toolCallId: string;
  readonly toolId: string;
  readonly risk: AgentToolRisk;
  /** Sanitized arguments suitable for an approval UI. */
  readonly arguments: unknown;
  readonly reason: string;
}

/** One-request approval outcome; it never grants permission for later requests. */
export type AgentApprovalDecision = 'allow-once' | 'deny';

/**
 * Hook timing and values: `input` and `context` transform Turn inputs;
 * `before-tool` and `after-tool` wrap Tool arguments and results;
 * `draft-response` transforms text; `output` transforms the final result; and
 * `after-turn` observes the terminal outcome. See `AgentHookValueMap`.
 */
export type AgentHookPhase =
  | 'input'
  | 'context'
  | 'before-tool'
  | 'after-tool'
  | 'draft-response'
  | 'output'
  | 'after-turn';

type AgentAfterTurnHookValue =
  | {
      readonly status: 'completed';
      readonly result: AgentRunResult;
    }
  | {
      readonly status: 'interrupted' | 'failed';
      readonly error: AgentEventError;
    };

/** Input and output value types passed through each `AgentHookPhase`. */
export interface AgentHookValueMap {
  readonly input: {
    readonly input: AgentRunInput['input'];
    readonly output: AgentRunInput['input'];
  };
  readonly context: {
    readonly input: AgentRunInput['context'];
    readonly output: AgentRunInput['context'];
  };
  readonly 'before-tool': { readonly input: unknown; readonly output: unknown };
  readonly 'after-tool': { readonly input: unknown; readonly output: unknown };
  readonly 'draft-response': {
    readonly input: string;
    readonly output: string;
  };
  readonly output: {
    readonly input: AgentRunResult;
    readonly output: AgentRunResult;
  };
  readonly 'after-turn': {
    readonly input: AgentAfterTurnHookValue;
    readonly output: AgentAfterTurnHookValue;
  };
}

/** Shared identity, phase value, and cancellation signal supplied to a hook. */
export interface AgentHookContext<TValue = unknown> {
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly value: TValue;
  readonly signal: AbortSignal;
}

declare const agentHookInferredValue: unique symbol;
type AgentHookInferredValue = typeof agentHookInferredValue;

type AgentHookDefinition<TPhase extends AgentHookPhase, TInput, TOutput> = {
  readonly id: string;
  readonly phase: TPhase;
  readonly onError: 'fail-turn' | 'skip';
  run(context: AgentHookContext<TInput>): Promise<TOutput> | TOutput;
};

/**
 * Phase-discriminated host extension that may transform a pipeline value.
 * By default, each phase uses its input and output types from
 * `AgentHookValueMap`. An explicit `AgentHook<unknown>` is assignable after
 * narrowing to `context`, `before-tool`, or `after-tool`, whose phase values are
 * unknown. Hooks for other phases must use their phase-specific value types.
 */
export type AgentHook<TInput = AgentHookInferredValue, TOutput = TInput> = {
  [TPhase in AgentHookPhase]: AgentHookDefinition<
    TPhase,
    [TInput] extends [AgentHookInferredValue]
      ? AgentHookValueMap[TPhase]['input']
      : TInput,
    [TInput] extends [AgentHookInferredValue]
      ? AgentHookValueMap[TPhase]['output']
      : TOutput
  >;
}[AgentHookPhase];

/** Feature flags declared by a backend and enforced by the Agent runtime. */
export interface AgentBackendCapabilities {
  readonly text: boolean;
  readonly streaming: boolean;
  readonly tools: boolean;
  readonly interruption: boolean;
  readonly sessionResume: boolean;
  readonly approvals: boolean;
  readonly detailedEvents: boolean;
}

/** Named numeric boundary advertised with a host-granted capability. */
export interface AgentCapabilityLimit {
  readonly name: string;
  readonly value: number;
  readonly unit?: string;
}

/**
 * Host-granted capability metadata for Agent discovery. Credentials and
 * executable handlers are deliberately excluded.
 */
export interface AgentCapabilityDescriptor {
  readonly id: string;
  readonly kind: string;
  readonly description: string;
  /** Tools that must be visible before this capability may be advertised. */
  readonly requiredTools?: readonly string[];
  readonly limits?: readonly AgentCapabilityLimit[];
}

/** Model-visible capability metadata with enforcement details removed. */
export interface AgentBackendCapability {
  readonly id: string;
  readonly kind: string;
  readonly description: string;
  readonly limits?: readonly AgentCapabilityLimit[];
}

/** JSON Artifact emitted by a backend before runtime provenance is attached. */
export interface AgentBackendArtifact {
  readonly type: string;
  readonly title?: string;
  readonly data: JsonValue;
}

/** Backend approval outcome, including cancellation caused by Turn termination. */
export type AgentBackendApprovalDecision = AgentApprovalDecision | 'cancel';

/** Decision returned to a backend-owned approval request. */
export interface AgentBackendApprovalResult {
  readonly approvalId: string;
  readonly decision: AgentBackendApprovalDecision;
}

/** Session identity and trust metadata provided when a backend Session starts. */
export interface AgentBackendSessionDescriptor {
  readonly agentId: string;
  readonly sessionId: string;
  readonly purpose: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
}

/** Full backend Session-start contract after Tools and capabilities are filtered. */
export interface AgentBackendSessionInput
  extends AgentBackendSessionDescriptor {
  /** Natural-language identity, role, goals, and operating context. */
  readonly brief: string;
  readonly tools: readonly AgentBackendTool[];
  readonly capabilities: readonly AgentBackendCapability[];
  readonly backendSessionId?: string;
}

/** Stream protocol emitted by a backend and normalized into public `AgentEvent`s. */
export type AgentBackendEvent =
  | { readonly type: 'message.delta'; readonly text: string }
  | { readonly type: 'message.completed'; readonly text: string }
  | {
      readonly type: 'tool.requested';
      readonly toolCallId: string;
      readonly toolName: string;
      readonly arguments: unknown;
    }
  | {
      readonly type: 'approval.requested';
      readonly approvalId: string;
      readonly toolCallId: string;
      readonly toolId: string;
      readonly risk: AgentToolRisk;
      readonly arguments: unknown;
      readonly reason: string;
    }
  | {
      readonly type: 'completed';
      readonly message: string;
      readonly artifacts?: readonly AgentBackendArtifact[];
      readonly usage?: AgentUsage;
      readonly metadata?: Readonly<Record<string, JsonValue>>;
    };

/** Backend-owned execution context for one Agent Session. */
export interface AgentBackendSession {
  readonly id?: string;
  runStream(
    input: AgentRunInput,
    options?: AgentRunOptions
  ): AsyncIterable<AgentBackendEvent>;
  /**
   * Returns a host-executed Tool result to a backend that requested it.
   * Required when the backend emits `tool.requested`.
   */
  submitToolResult?(result: AgentBackendToolResult): Promise<void>;
  /** Returns a host decision to a backend-owned approval request. */
  submitApprovalResult?(result: AgentBackendApprovalResult): Promise<void>;
  interrupt?(): Promise<void>;
  close(): Promise<void>;
}

/** Success or structured failure returned to a backend-requested host Tool. */
export type AgentBackendToolResult =
  | {
      readonly type: 'success';
      readonly toolCallId: string;
      readonly output: unknown;
    }
  | {
      readonly type: 'error';
      readonly toolCallId: string;
      readonly error: AgentEventError;
    };

/** Provider adapter that declares features and creates isolated backend Sessions. */
export interface AgentBackend {
  readonly name: string;
  readonly backendCapabilities: Readonly<AgentBackendCapabilities>;
  startSession(input: AgentBackendSessionInput): Promise<AgentBackendSession>;
}

/** Host-selected identity, audience, permissions, and narrowed limits for a Session. */
export interface AgentSessionOptions {
  readonly id?: string;
  readonly purpose: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
  readonly allowedTools?: readonly string[];
  readonly allowedCapabilities?: readonly string[];
  /** Session limits may only narrow the Agent-wide limits. */
  readonly limits?: AgentRuntimeLimits;
}

/** Session options plus the backend identifier that must be resumed. */
export interface AgentResumeSessionOptions extends AgentSessionOptions {
  readonly backendSessionId: string;
}

/** Agent-wide or Session-narrowed safety limits enforced by the runtime. */
export interface AgentRuntimeLimits {
  /** Maximum number of Tool calls accepted during one Turn. */
  readonly maxToolCallsPerTurn?: number;
  /** Maximum time the runtime waits for one host approval. */
  readonly approvalTimeoutMs?: number;
}

/** Persisted lifecycle state for preparing an Agent's workspace. */
export type AgentWorkspaceStatus =
  | 'fresh'
  | 'bootstrapping'
  | 'ready'
  | 'degraded'
  | 'failed';

/**
 * Host-owned lifecycle metadata. It does not prescribe files, tables, or a
 * memory schema inside the workspace.
 */
export interface AgentWorkspaceMetadata {
  readonly agentId: string;
  readonly status: AgentWorkspaceStatus;
  readonly revision: number;
  readonly targetVersion: string;
  readonly readyVersion?: string;
  readonly attempt: number;
  readonly updatedAt: string;
  readonly completedAt?: string;
  readonly backendSessionId?: string;
  readonly lastError?: AgentEventError;
}

/**
 * The host chooses where this small lifecycle record is persisted. `save`
 * must atomically reject a stale `expectedRevision`.
 */
export interface AgentWorkspaceMetadataStore {
  load(agentId: string): Promise<AgentWorkspaceMetadata | undefined>;
  save(
    metadata: AgentWorkspaceMetadata,
    expectedRevision: number
  ): Promise<void>;
}

/** Retry, Tool-call, and elapsed-time bounds for workspace bootstrap. */
export interface AgentBootstrapLimits {
  /** Attempts allowed for one bootstrap version. Defaults to 3. */
  readonly maxAttempts?: number;
  /** Tool calls allowed in the single bootstrap Turn. Defaults to 4. */
  readonly maxToolCallsPerTurn?: number;
  /** Elapsed time allowed for the bootstrap Turn. Defaults to 60 seconds. */
  readonly timeoutMs?: number;
}

/** Explicit host assertion for bootstrap-only product context. */
export interface AgentBootstrapContext {
  readonly trust: 'trusted';
  readonly data: JsonValue;
}

/** Workspace store, version, permissions, context, and limits for bootstrap. */
export interface AgentBootstrapOptions {
  readonly workspace: AgentWorkspaceMetadataStore;
  /** Bump when the host wants the Agent to revise its operating state. */
  readonly version?: string;
  readonly allowedTools?: readonly string[];
  readonly allowedCapabilities?: readonly string[];
  /** Host-selected product context. Raw viewer data must not be marked trusted. */
  readonly context?: AgentBootstrapContext;
  readonly limits?: AgentBootstrapLimits;
}

/** Bootstrap action taken and the resulting persisted workspace metadata. */
export interface AgentBootstrapResult {
  readonly action: 'bootstrapped' | 'resumed';
  readonly metadata: AgentWorkspaceMetadata;
  /** Present only when this call performed a bootstrap Turn. */
  readonly run?: AgentRunResult;
}

/**
 * Host-facing conversation or task context. It runs one Turn at a time,
 * resolves approvals, supports interruption when declared, and owns cleanup.
 */
export interface AgentSession {
  readonly id: string;
  readonly purpose: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
  readonly allowedTools: readonly string[];
  readonly allowedCapabilities: readonly string[];
  readonly backendSessionId?: string;
  run(input: AgentRunInput, options?: AgentRunOptions): Promise<AgentRunResult>;
  runStream(
    input: AgentRunInput,
    options?: AgentRunOptions
  ): AsyncIterable<AgentEvent>;
  resolveApproval(
    requestId: string,
    decision: AgentApprovalDecision
  ): Promise<void>;
  interrupt(): Promise<void>;
  close(): Promise<void>;
}

/** Immutable definition and host-owned integrations used to create an Agent. */
export interface AgentOptions {
  /** Stable application-owned identity used for events and persisted state. */
  readonly id: string;
  /**
   * Natural-language seed for identity and assignment. The Agent may develop
   * its own operating model, but this brief remains host-owned authority.
   */
  readonly brief: string;
  readonly backend: AgentBackend;
  readonly tools?: readonly AgentToolSpec[];
  readonly capabilityCatalog?: readonly AgentCapabilityDescriptor[];
  /** Defaults to deny when omitted. */
  readonly policy?: AgentPolicy | AgentPolicyConfig;
  readonly hooks?: readonly AgentHook[];
  readonly limits?: AgentRuntimeLimits;
}

/**
 * Managed character runtime created by `createAgent`. It exposes backend
 * feature flags and owns bootstrap, Session creation/resume, and cleanup.
 */
export interface Agent {
  readonly id: string;
  readonly brief: string;
  readonly backendCapabilities: Readonly<AgentBackendCapabilities>;
  bootstrap(options: AgentBootstrapOptions): Promise<AgentBootstrapResult>;
  startSession(options: AgentSessionOptions): Promise<AgentSession>;
  resumeSession(options: AgentResumeSessionOptions): Promise<AgentSession>;
  close(): Promise<void>;
}

/** JSON-safe error snapshot embedded in events and workspace metadata. */
export interface AgentEventError {
  readonly name: string;
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, JsonValue>>;
}

/** Correlation, time, and Agent/Session identity shared by every public event. */
export interface AgentEventBase<TType extends string> {
  readonly id: string;
  readonly type: TType;
  readonly timestamp: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId?: string;
}

/** Emitted before the first Turn of a newly started Session. */
export interface AgentSessionStartedEvent
  extends AgentEventBase<'session.started'> {
  readonly purpose: string;
}

/** Emitted before the first Turn of a resumed backend Session. */
export interface AgentSessionResumedEvent
  extends AgentEventBase<'session.resumed'> {
  readonly backendSessionId: string;
}

/** Marks the beginning of a Turn after any pending Session lifecycle event. */
export interface AgentTurnStartedEvent extends AgentEventBase<'turn.started'> {
  readonly turnId: string;
}

/** Incremental assistant text from a streaming backend. */
export interface AgentMessageDeltaEvent
  extends AgentEventBase<'message.delta'> {
  readonly turnId: string;
  readonly text: string;
}

/** Final transformed assistant text for the Turn. */
export interface AgentMessageCompletedEvent
  extends AgentEventBase<'message.completed'> {
  readonly turnId: string;
  readonly text: string;
}

/** Sanitized arguments for a host Tool requested by the backend. */
export interface AgentToolRequestedEvent
  extends AgentEventBase<'tool.requested'> {
  readonly turnId: string;
  readonly toolCallId: string;
  readonly toolId: string;
  readonly arguments: unknown;
}

/** Indicates that policy and approval passed and the host Tool handler is starting. */
export interface AgentToolStartedEvent extends AgentEventBase<'tool.started'> {
  readonly turnId: string;
  readonly toolCallId: string;
  readonly toolId: string;
}

/** Records a host Tool handler's successfully transformed output. */
export interface AgentToolCompletedEvent
  extends AgentEventBase<'tool.completed'> {
  readonly turnId: string;
  readonly toolCallId: string;
  readonly toolId: string;
  readonly output: unknown;
}

/** Records a structured host Tool failure before it is returned or ends the Turn. */
export interface AgentToolFailedEvent extends AgentEventBase<'tool.failed'> {
  readonly turnId: string;
  readonly toolCallId: string;
  readonly toolId: string;
  readonly error: AgentEventError;
}

/** Approval prompt emitted when a Tool or backend operation needs host authority. */
export interface AgentApprovalRequestedEvent
  extends AgentEventBase<'approval.requested'> {
  readonly turnId: string;
  readonly request: AgentApprovalRequest;
}

/** Approval decision, optionally including an automatic handler error that caused denial. */
export interface AgentApprovalResolvedEvent
  extends AgentEventBase<'approval.resolved'> {
  readonly turnId: string;
  readonly requestId: string;
  readonly decision: AgentApprovalDecision;
  /** Present when an automatic approval handler failed or returned invalid data. */
  readonly error?: AgentEventError;
}

/** Announces a validated structured Artifact before Turn completion. */
export interface AgentArtifactCreatedEvent
  extends AgentEventBase<'artifact.created'> {
  readonly turnId: string;
  readonly artifact: AgentArtifact;
}

/** Successful terminal event containing the same result returned by `run()`. */
export interface AgentTurnCompletedEvent
  extends AgentEventBase<'turn.completed'> {
  readonly turnId: string;
  readonly result: AgentRunResult;
}

/** Terminal event used when caller, host, or backend interruption ends a Turn. */
export interface AgentTurnInterruptedEvent
  extends AgentEventBase<'turn.interrupted'> {
  readonly turnId: string;
  readonly error: AgentEventError;
}

/** Terminal event used when a non-interruption error ends a Turn. */
export interface AgentTurnFailedEvent extends AgentEventBase<'turn.failed'> {
  readonly turnId: string;
  readonly error: AgentEventError;
}

/** Emitted only when host closure interrupts an active Turn. */
export interface AgentSessionClosedEvent
  extends AgentEventBase<'session.closed'> {
  readonly reason?: string;
}

/**
 * Public event stream for Session, Turn, message, Tool, approval, and Artifact
 * activity. Every begun Turn produces exactly one of `turn.completed`,
 * `turn.interrupted`, or `turn.failed`; `session.started` or `session.resumed`
 * appears only before the Session's first Turn, while `session.closed` appears
 * only when host closure interrupts an active Turn.
 */
export type AgentEvent =
  | AgentSessionStartedEvent
  | AgentSessionResumedEvent
  | AgentTurnStartedEvent
  | AgentMessageDeltaEvent
  | AgentMessageCompletedEvent
  | AgentToolRequestedEvent
  | AgentToolStartedEvent
  | AgentToolCompletedEvent
  | AgentToolFailedEvent
  | AgentApprovalRequestedEvent
  | AgentApprovalResolvedEvent
  | AgentArtifactCreatedEvent
  | AgentTurnCompletedEvent
  | AgentTurnInterruptedEvent
  | AgentTurnFailedEvent
  | AgentSessionClosedEvent;
