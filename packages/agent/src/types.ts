export type JsonPrimitive = boolean | null | number | string;

export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export type AgentInputTrust = 'trusted' | 'untrusted';

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

export interface AgentRunOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export interface AgentArtifactSource {
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId: string;
}

export interface AgentArtifact<TData extends JsonValue = JsonValue> {
  readonly id: string;
  readonly type: string;
  readonly version: number;
  readonly title?: string;
  readonly data: TData;
  readonly createdAt: string;
  readonly source: AgentArtifactSource;
}

export interface AgentUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface AgentRunResult {
  readonly turnId: string;
  readonly message: string;
  readonly artifacts: readonly AgentArtifact[];
  readonly usage?: AgentUsage;
  readonly backendMetadata?: Readonly<Record<string, JsonValue>>;
}

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

export interface AgentToolExecutionContext {
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly toolCallId: string;
  readonly signal: AbortSignal;
}

export type AgentToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: AgentToolExecutionContext
) => Promise<TOutput> | TOutput;

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

export type AgentPolicyDecision =
  | { readonly decision: 'allow'; readonly reason?: string }
  | { readonly decision: 'deny'; readonly reason: string }
  | { readonly decision: 'require-approval'; readonly reason: string };

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

export interface AgentPolicy {
  evaluate(
    context: AgentPolicyContext
  ): AgentPolicyDecision | Promise<AgentPolicyDecision>;
}

export interface AgentApprovalRule {
  readonly riskAtLeast?: AgentToolRisk;
  readonly tools?: readonly string[];
}

export interface AgentPolicyConfig {
  readonly defaultDecision: 'allow' | 'deny';
  readonly allowTools?: readonly string[];
  readonly denyTools?: readonly string[];
  readonly requireApproval?: AgentApprovalRule;
}

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

export type AgentApprovalDecision = 'allow-once' | 'deny';

export type AgentHookPhase =
  | 'input'
  | 'context'
  | 'before-tool'
  | 'after-tool'
  | 'draft-response'
  | 'output'
  | 'after-turn';

export interface AgentHookContext<TValue = unknown> {
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly value: TValue;
  readonly signal: AbortSignal;
}

export interface AgentHook<TInput = unknown, TOutput = TInput> {
  readonly id: string;
  readonly phase: AgentHookPhase;
  readonly onError: 'fail-turn' | 'skip';
  run(context: AgentHookContext<TInput>): Promise<TOutput> | TOutput;
}

export interface AgentBackendCapabilities {
  readonly text: boolean;
  readonly streaming: boolean;
  readonly tools: boolean;
  readonly interruption: boolean;
  readonly sessionResume: boolean;
  readonly approvals: boolean;
  readonly detailedEvents: boolean;
}

export interface AgentBackendSessionDescriptor {
  readonly agentId: string;
  readonly sessionId: string;
  readonly purpose: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
}

export interface AgentBackendSessionInput
  extends AgentBackendSessionDescriptor {
  /** Natural-language identity, role, goals, and operating context. */
  readonly brief: string;
  readonly tools: readonly AgentBackendTool[];
  readonly backendSessionId?: string;
}

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
      readonly type: 'completed';
      readonly message: string;
      readonly usage?: AgentUsage;
      readonly metadata?: Readonly<Record<string, JsonValue>>;
    };

export interface AgentBackendSession {
  readonly id?: string;
  runStream(
    input: AgentRunInput,
    options?: AgentRunOptions
  ): AsyncIterable<AgentBackendEvent>;
  interrupt?(): Promise<void>;
  close(): Promise<void>;
}

export interface AgentBackend {
  readonly name: string;
  readonly capabilities: Readonly<AgentBackendCapabilities>;
  startSession(input: AgentBackendSessionInput): Promise<AgentBackendSession>;
}

export interface AgentSessionOptions {
  readonly id?: string;
  readonly purpose: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
  readonly allowedTools?: readonly string[];
}

export interface AgentResumeSessionOptions extends AgentSessionOptions {
  readonly backendSessionId: string;
}

export interface AgentSession {
  readonly id: string;
  readonly purpose: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
  readonly allowedTools: readonly string[];
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
}

export interface Agent {
  readonly id: string;
  readonly brief: string;
  readonly capabilities: Readonly<AgentBackendCapabilities>;
  startSession(options: AgentSessionOptions): Promise<AgentSession>;
  resumeSession(options: AgentResumeSessionOptions): Promise<AgentSession>;
  close(): Promise<void>;
}

export interface AgentEventError {
  readonly name: string;
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface AgentEventBase<TType extends string> {
  readonly id: string;
  readonly type: TType;
  readonly timestamp: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly turnId?: string;
}

export interface AgentSessionStartedEvent
  extends AgentEventBase<'session.started'> {
  readonly purpose: string;
}

export interface AgentSessionResumedEvent
  extends AgentEventBase<'session.resumed'> {
  readonly backendSessionId: string;
}

export interface AgentTurnStartedEvent extends AgentEventBase<'turn.started'> {
  readonly turnId: string;
}

export interface AgentMessageDeltaEvent
  extends AgentEventBase<'message.delta'> {
  readonly turnId: string;
  readonly text: string;
}

export interface AgentMessageCompletedEvent
  extends AgentEventBase<'message.completed'> {
  readonly turnId: string;
  readonly text: string;
}

export interface AgentToolRequestedEvent
  extends AgentEventBase<'tool.requested'> {
  readonly turnId: string;
  readonly toolCallId: string;
  readonly toolId: string;
  readonly arguments: unknown;
}

export interface AgentToolStartedEvent extends AgentEventBase<'tool.started'> {
  readonly turnId: string;
  readonly toolCallId: string;
  readonly toolId: string;
}

export interface AgentToolCompletedEvent
  extends AgentEventBase<'tool.completed'> {
  readonly turnId: string;
  readonly toolCallId: string;
  readonly toolId: string;
  readonly output: unknown;
}

export interface AgentApprovalRequestedEvent
  extends AgentEventBase<'approval.requested'> {
  readonly turnId: string;
  readonly request: AgentApprovalRequest;
}

export interface AgentApprovalResolvedEvent
  extends AgentEventBase<'approval.resolved'> {
  readonly turnId: string;
  readonly requestId: string;
  readonly decision: AgentApprovalDecision;
}

export interface AgentArtifactCreatedEvent
  extends AgentEventBase<'artifact.created'> {
  readonly turnId: string;
  readonly artifact: AgentArtifact;
}

export interface AgentTurnCompletedEvent
  extends AgentEventBase<'turn.completed'> {
  readonly turnId: string;
  readonly result: AgentRunResult;
}

export interface AgentTurnInterruptedEvent
  extends AgentEventBase<'turn.interrupted'> {
  readonly turnId: string;
  readonly error: AgentEventError;
}

export interface AgentTurnFailedEvent extends AgentEventBase<'turn.failed'> {
  readonly turnId: string;
  readonly error: AgentEventError;
}

export interface AgentSessionClosedEvent
  extends AgentEventBase<'session.closed'> {
  readonly reason?: string;
}

export type AgentEvent =
  | AgentSessionStartedEvent
  | AgentSessionResumedEvent
  | AgentTurnStartedEvent
  | AgentMessageDeltaEvent
  | AgentMessageCompletedEvent
  | AgentToolRequestedEvent
  | AgentToolStartedEvent
  | AgentToolCompletedEvent
  | AgentApprovalRequestedEvent
  | AgentApprovalResolvedEvent
  | AgentArtifactCreatedEvent
  | AgentTurnCompletedEvent
  | AgentTurnInterruptedEvent
  | AgentTurnFailedEvent
  | AgentSessionClosedEvent;
