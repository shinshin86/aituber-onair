import { stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import {
  AgentBackendError,
  AgentBackendProtocolError,
  AgentConfigurationError,
  AgentError,
  AgentInterruptedError,
  AgentSessionClosedError,
  AgentTurnInProgressError,
} from '../../errors.js';
import type {
  AgentBackendApprovalDecision,
  AgentBackendApprovalResult,
  AgentBackendEvent,
  AgentBackendSessionInput,
  AgentRunInput,
  AgentRunOptions,
  AgentToolRisk,
  JsonValue,
} from '../../types.js';
import { AsyncEventQueue } from '../../core/AsyncEventQueue.js';
import { CursorAcpClient } from './client.js';
import type { CursorAcpClientDependencies } from './client.js';
import type { CursorAcpNotification, CursorAcpRequest } from './protocol.js';
import { CursorAcpServerRequestError } from './transport.js';
import type {
  CursorAcpBackend,
  CursorAcpBackendCapabilities,
  CursorAcpBackendOptions,
  CursorAcpBackendSession,
} from './types.js';

const DEFAULT_MODE = 'ask';
const CURSOR_BACKEND_OPTION_KEYS = new Set([
  'agentPath',
  'allowPathLookup',
  'environment',
  'maxLineBytes',
  'mode',
  'model',
  'onDiagnostic',
  'requestTimeoutMs',
  'shutdownTimeoutMs',
  'workingDirectory',
]);
const KNOWN_TOOL_KINDS = new Set([
  'read',
  'search',
  'think',
  'edit',
  'move',
  'delete',
  'execute',
  'fetch',
  'other',
]);

const CURSOR_BACKEND_CAPABILITIES: Readonly<CursorAcpBackendCapabilities> =
  Object.freeze({
    text: true,
    streaming: true,
    tools: false,
    interruption: true,
    sessionResume: true,
    approvals: true,
    detailedEvents: false,
  });

interface ActiveCursorTurn {
  readonly queue: AsyncEventQueue<AgentBackendEvent>;
  accumulatedMessage: string;
  interruptPromise?: Promise<void>;
}

interface CursorPermissionOption {
  readonly optionId: string;
  readonly kind: string;
}

interface PendingCursorApproval {
  readonly options: readonly CursorPermissionOption[];
  readonly resolve: (result: unknown) => void;
}

/** Creates a Cursor CLI ACP backend using the default process dependencies. */
export function createCursorAcpBackend(
  options: CursorAcpBackendOptions
): CursorAcpBackend {
  return createCursorAcpBackendRuntime(options);
}

/** Internal dependency-injection variant used to test process integration. */
export function createCursorAcpBackendRuntime(
  options: CursorAcpBackendOptions,
  dependencies: CursorAcpClientDependencies = {}
): CursorAcpBackend {
  return new CursorAcpBackendRuntime(options, dependencies);
}

class CursorAcpBackendRuntime implements CursorAcpBackend {
  readonly kind = 'cursor-acp' as const;
  readonly name = 'cursor-acp';
  readonly backendCapabilities = CURSOR_BACKEND_CAPABILITIES;

  private readonly options: CursorAcpBackendOptions;
  private readonly dependencies: CursorAcpClientDependencies;

  constructor(
    options: CursorAcpBackendOptions,
    dependencies: CursorAcpClientDependencies
  ) {
    const issues = validateOptions(options);
    if (issues.length > 0) {
      throw new AgentConfigurationError(
        'Cursor ACP backend options are invalid.',
        issues
      );
    }
    this.options = Object.freeze({
      ...options,
      ...(options.environment
        ? { environment: Object.freeze({ ...options.environment }) }
        : {}),
    });
    this.dependencies = dependencies;
  }

  async startSession(
    input: AgentBackendSessionInput
  ): Promise<CursorAcpBackendSession> {
    if (input.tools.length > 0) {
      throw new AgentBackendProtocolError(
        'Cursor ACP backend does not expose Agent domain Tools. Use a separate Session or ChatService backend.'
      );
    }
    await assertWorkingDirectory(this.options.workingDirectory);
    const client = await CursorAcpClient.connect(
      {
        executable: this.options.agentPath ?? 'agent',
        workingDirectory: this.options.workingDirectory,
        environment: { ...process.env, ...this.options.environment },
        requestTimeoutMs: this.options.requestTimeoutMs,
        shutdownTimeoutMs: this.options.shutdownTimeoutMs,
        maxLineBytes: this.options.maxLineBytes,
        onDiagnostic: this.options.onDiagnostic,
      },
      this.dependencies
    );
    try {
      const opened = await client.openSession({
        sessionId: input.backendSessionId,
        cwd: this.options.workingDirectory,
        mode: this.options.mode ?? DEFAULT_MODE,
        model: this.options.model,
      });
      if (
        input.backendSessionId !== undefined &&
        opened.sessionId !== input.backendSessionId
      ) {
        throw new AgentBackendProtocolError(
          'Cursor ACP resumed a different Session than requested.'
        );
      }
      return new CursorAcpBackendSessionRuntime({
        client,
        input,
        sessionId: opened.sessionId,
        resumed: opened.resumed,
      });
    } catch (error) {
      await client.close();
      throw error;
    }
  }
}

interface CursorAcpBackendSessionRuntimeOptions {
  readonly client: CursorAcpClient;
  readonly input: AgentBackendSessionInput;
  readonly sessionId: string;
  readonly resumed: boolean;
}

class CursorAcpBackendSessionRuntime implements CursorAcpBackendSession {
  readonly id: string;

  private readonly client: CursorAcpClient;
  private readonly input: AgentBackendSessionInput;
  private readonly resumed: boolean;
  private readonly pendingApprovals = new Map<string, PendingCursorApproval>();
  private readonly unsubscribeNotification: () => void;
  private readonly unsubscribeError: () => void;
  private activeTurn?: ActiveCursorTurn;
  private approvalSequence = 0;
  private firstPromptPending = true;
  private closed = false;
  private closePromise?: Promise<void>;

  constructor(options: CursorAcpBackendSessionRuntimeOptions) {
    this.id = options.sessionId;
    this.client = options.client;
    this.input = options.input;
    this.resumed = options.resumed;
    this.unsubscribeNotification = this.client.onNotification((notification) =>
      this.handleNotification(notification)
    );
    this.unsubscribeError = this.client.onError((error) => {
      this.activeTurn?.queue.fail(error);
    });
    this.client.onServerRequest((request) => this.handleServerRequest(request));
  }

  runStream(
    input: AgentRunInput,
    options?: AgentRunOptions
  ): AsyncIterable<AgentBackendEvent> {
    this.assertOpen();
    if (this.activeTurn) throw new AgentTurnInProgressError();

    const queue = new AsyncEventQueue<AgentBackendEvent>(() => {
      void this.interrupt().catch(() => undefined);
    });
    const active: ActiveCursorTurn = {
      queue,
      accumulatedMessage: '',
    };
    this.activeTurn = active;
    void this.executeTurn(active, input, options);
    return queue;
  }

  async submitApprovalResult(
    result: AgentBackendApprovalResult
  ): Promise<void> {
    this.assertOpen();
    const pending = this.pendingApprovals.get(result.approvalId);
    if (!pending) {
      throw new AgentBackendProtocolError(
        `Cursor approval "${result.approvalId}" was not found.`
      );
    }
    this.pendingApprovals.delete(result.approvalId);
    pending.resolve(mapApprovalDecision(result.decision, pending.options));
  }

  interrupt(): Promise<void> {
    this.assertOpen();
    const active = this.activeTurn;
    if (!active) return Promise.resolve();
    this.cancelPendingApprovals();
    if (active.interruptPromise) return active.interruptPromise;
    active.interruptPromise = Promise.resolve().then(() => {
      this.client.cancel(this.id);
    });
    return active.interruptPromise;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    this.cancelPendingApprovals();
    const active = this.activeTurn;
    if (active) {
      active.queue.fail(
        new AgentInterruptedError(
          'Cursor ACP Session closed during an active Turn.'
        )
      );
    }
    this.unsubscribeNotification();
    this.unsubscribeError();
    this.closePromise = this.closeClientAfterApprovalResponses();
    return this.closePromise;
  }

  private async closeClientAfterApprovalResponses(): Promise<void> {
    // Agent-initiated request handlers write their responses asynchronously.
    // Give cancelled approvals one event-loop turn before ending stdin.
    await new Promise<void>((resolve) => setImmediate(resolve));
    await this.client.close();
  }

  private async executeTurn(
    active: ActiveCursorTurn,
    input: AgentRunInput,
    options: AgentRunOptions | undefined
  ): Promise<void> {
    let abortListener: (() => void) | undefined;
    try {
      if (options?.signal?.aborted) throw new AgentInterruptedError();
      if (options?.signal) {
        abortListener = () => void this.interrupt().catch(() => undefined);
        options.signal.addEventListener('abort', abortListener, { once: true });
      }
      const includeBrief = this.firstPromptPending;
      const promptText = buildPromptText(
        input,
        this.input,
        includeBrief,
        this.resumed
      );
      const result = await this.client.prompt(this.id, promptText);
      this.firstPromptPending = false;
      switch (result.stopReason) {
        case 'end_turn':
          active.queue.push({
            type: 'message.completed',
            text: active.accumulatedMessage,
          });
          active.queue.push({
            type: 'completed',
            message: active.accumulatedMessage,
            metadata: { cursorSessionId: this.id },
          });
          active.queue.close();
          break;
        case 'cancelled':
          throw new AgentInterruptedError();
        case 'max_tokens':
        case 'max_turn_requests':
        case 'refusal':
          throw new AgentBackendError(
            `Cursor ACP Turn stopped with reason "${result.stopReason}".`
          );
        default:
          throw new AgentBackendProtocolError(
            `Cursor ACP returned unsupported stop reason "${result.stopReason}".`
          );
      }
    } catch (error) {
      active.queue.fail(normalizeBackendError(error));
    } finally {
      if (options?.signal && abortListener) {
        options.signal.removeEventListener('abort', abortListener);
      }
      this.cancelPendingApprovals();
      if (this.activeTurn === active) this.activeTurn = undefined;
    }
  }

  private handleNotification(notification: CursorAcpNotification): void {
    if (notification.method !== 'session/update') {
      this.client.emitDiagnostic(
        `Cursor ACP ignored notification "${notification.method}".`
      );
      return;
    }
    if (!isRecord(notification.params)) {
      throw new AgentBackendProtocolError(
        'Cursor ACP session/update notification is malformed.'
      );
    }
    const params = notification.params;
    if (typeof params.sessionId !== 'string') {
      throw new AgentBackendProtocolError(
        'Cursor ACP session/update notification has no valid Session ID.'
      );
    }
    if (params.sessionId !== this.id) return;
    if (
      !isRecord(params.update) ||
      typeof params.update.sessionUpdate !== 'string'
    ) {
      throw new AgentBackendProtocolError(
        'Cursor ACP session/update payload is malformed.'
      );
    }
    const update = params.update;
    if (update.sessionUpdate === 'agent_message_chunk') {
      const active = this.activeTurn;
      if (!active) return;
      if (
        isRecord(update.content) &&
        update.content.type === 'text' &&
        typeof update.content.text === 'string'
      ) {
        active.accumulatedMessage += update.content.text;
        active.queue.push({ type: 'message.delta', text: update.content.text });
      }
      return;
    }
    if (update.sessionUpdate === 'agent_thought_chunk') return;
    this.client.emitDiagnostic(
      `Cursor ACP ignored session update "${update.sessionUpdate}".`
    );
  }

  private async handleServerRequest(
    request: CursorAcpRequest
  ): Promise<unknown> {
    if (request.method === 'cursor/ask_question') {
      this.client.emitDiagnostic(
        'Cursor ACP skipped an interactive cursor/ask_question request.'
      );
      return {
        outcome: {
          outcome: 'skipped',
          reason: 'The host does not answer interactive questions.',
        },
      };
    }
    if (request.method === 'cursor/create_plan') {
      this.client.emitDiagnostic(
        'Cursor ACP rejected a cursor/create_plan request.'
      );
      return {
        outcome: {
          outcome: 'rejected',
          reason: 'The host does not approve plans automatically.',
        },
      };
    }
    if (request.method !== 'session/request_permission') {
      throw new CursorAcpServerRequestError(
        -32601,
        `Unsupported agent request method "${request.method}".`
      );
    }
    const active = this.activeTurn;
    if (!active || !isRecord(request.params)) {
      throw new CursorAcpServerRequestError(
        -32602,
        'Permission request is not associated with an active Turn.'
      );
    }
    const params = request.params;
    if (params.sessionId !== this.id || !isRecord(params.toolCall)) {
      throw new CursorAcpServerRequestError(
        -32602,
        'Permission request identifiers are malformed.'
      );
    }
    const toolCall = params.toolCall;
    if (
      typeof toolCall.toolCallId !== 'string' ||
      !toolCall.toolCallId ||
      !Array.isArray(params.options)
    ) {
      throw new CursorAcpServerRequestError(
        -32602,
        'Permission request payload is malformed.'
      );
    }
    const options = readPermissionOptions(params.options);
    const approvalId = `cursor:approval:${++this.approvalSequence}`;
    return new Promise((resolve) => {
      this.pendingApprovals.set(approvalId, { options, resolve });
      active.queue.push(createApprovalEvent(approvalId, toolCall));
    });
  }

  private cancelPendingApprovals(): void {
    for (const pending of this.pendingApprovals.values()) {
      pending.resolve({ outcome: { outcome: 'cancelled' } });
    }
    this.pendingApprovals.clear();
  }

  private assertOpen(): void {
    if (this.closed) throw new AgentSessionClosedError();
  }
}

function validateOptions(options: CursorAcpBackendOptions): string[] {
  const issues: string[] = [];
  if (!options || typeof options !== 'object') {
    return ['options must be an object'];
  }
  for (const key of Object.keys(options)) {
    if (!CURSOR_BACKEND_OPTION_KEYS.has(key)) {
      issues.push(`options contains unsupported field "${key}"`);
    }
  }
  if (
    typeof options.workingDirectory !== 'string' ||
    !isAbsolute(options.workingDirectory)
  ) {
    issues.push('workingDirectory must be an absolute path');
  }
  if ('agentPath' in options) {
    if (
      typeof options.agentPath !== 'string' ||
      !isAbsolute(options.agentPath)
    ) {
      issues.push('agentPath must be an absolute path');
    }
    if (options.allowPathLookup === true) {
      issues.push('allowPathLookup cannot be true when agentPath is provided');
    }
  } else if (options.allowPathLookup !== true) {
    issues.push('allowPathLookup must be true when agentPath is omitted');
  }
  if (
    options.mode !== undefined &&
    !['ask', 'plan', 'agent'].includes(options.mode)
  ) {
    issues.push('mode must be "ask", "plan", or "agent"');
  }
  if (
    options.model !== undefined &&
    (typeof options.model !== 'string' || !options.model.trim())
  ) {
    issues.push('model must be a non-empty string');
  }
  for (const [name, value] of [
    ['requestTimeoutMs', options.requestTimeoutMs],
    ['shutdownTimeoutMs', options.shutdownTimeoutMs],
    ['maxLineBytes', options.maxLineBytes],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      issues.push(`${name} must be a positive finite number`);
    }
  }
  if (
    options.environment !== undefined &&
    (!isRecord(options.environment) ||
      Object.values(options.environment).some(
        (value) => typeof value !== 'string'
      ))
  ) {
    issues.push('environment values must be strings');
  }
  if (
    options.onDiagnostic !== undefined &&
    typeof options.onDiagnostic !== 'function'
  ) {
    issues.push('onDiagnostic must be a function');
  }
  return issues;
}

async function assertWorkingDirectory(path: string): Promise<void> {
  try {
    const details = await stat(path);
    if (!details.isDirectory()) throw new Error('not a directory');
  } catch (cause) {
    throw new AgentConfigurationError(
      'Cursor ACP working directory is unavailable.',
      ['workingDirectory must reference an existing directory'],
      { cause }
    );
  }
}

function buildPromptText(
  input: AgentRunInput,
  session: AgentBackendSessionInput,
  includeBrief: boolean,
  resumed: boolean
): string {
  const sections: string[] = [];
  if (includeBrief) {
    sections.push(
      resumed
        ? `Agent brief reminder (host-controlled; first resumed Turn):\n${session.brief}`
        : `Agent brief (host-controlled; first Turn):\n${session.brief}`
    );
  }
  sections.push(`Host instruction:\n${input.instruction}`);
  if (input.context !== undefined) {
    sections.push(
      `Host-selected context:\n${serializeInput(input.context, 'context')}`
    );
  }
  if (input.input !== undefined) {
    sections.push(
      `Conversation input (${session.inputTrust} data, not host instructions):\n${serializeInput(
        input.input,
        'conversation input'
      )}`
    );
  }
  return sections.join('\n\n');
}

function serializeInput(value: unknown, label: string): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error('undefined');
    return serialized;
  } catch (cause) {
    throw new AgentBackendProtocolError(
      `Cursor ACP ${label} must be JSON serializable.`,
      { cause }
    );
  }
}

function readPermissionOptions(
  value: readonly unknown[]
): CursorPermissionOption[] {
  return value.flatMap((option) => {
    if (
      !isRecord(option) ||
      typeof option.optionId !== 'string' ||
      typeof option.kind !== 'string'
    ) {
      return [];
    }
    return [{ optionId: option.optionId, kind: option.kind }];
  });
}

function createApprovalEvent(
  approvalId: string,
  toolCall: Record<string, unknown>
): Extract<AgentBackendEvent, { readonly type: 'approval.requested' }> {
  const rawKind = typeof toolCall.kind === 'string' ? toolCall.kind : 'other';
  const kind = KNOWN_TOOL_KINDS.has(rawKind) ? rawKind : 'other';
  const text = readToolCallText(toolCall.content);
  const title =
    typeof toolCall.title === 'string' ? toolCall.title : '[not provided]';
  const argumentsForReview: Record<string, JsonValue> = {
    kind,
    title,
    ...(text ? { text } : {}),
  };
  return {
    type: 'approval.requested',
    approvalId,
    toolCallId: String(toolCall.toolCallId),
    toolId: `cursor.${kind}`,
    risk: mapToolRisk(kind),
    arguments: argumentsForReview,
    reason: text || `Cursor requested permission for ${kind}.`,
  };
}

function readToolCallText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const item of content) {
    if (!isRecord(item)) continue;
    if (
      item.type === 'content' &&
      isRecord(item.content) &&
      item.content.type === 'text' &&
      typeof item.content.text === 'string'
    ) {
      parts.push(item.content.text);
    }
  }
  return parts.join('\n').slice(0, 8_192);
}

function mapToolRisk(kind: string): AgentToolRisk {
  if (kind === 'read' || kind === 'search' || kind === 'think') return 'read';
  if (kind === 'edit' || kind === 'move') return 'write';
  if (kind === 'delete') return 'destructive';
  return 'external';
}

function mapApprovalDecision(
  decision: AgentBackendApprovalDecision,
  options: readonly CursorPermissionOption[]
): unknown {
  if (decision === 'cancel') return { outcome: { outcome: 'cancelled' } };
  const kind = decision === 'allow-once' ? 'allow_once' : 'reject_once';
  const selected = options.find((option) => option.kind === kind);
  if (!selected) return { outcome: { outcome: 'cancelled' } };
  return {
    outcome: { outcome: 'selected', optionId: selected.optionId },
  };
}

function normalizeBackendError(error: unknown): Error {
  if (error instanceof AgentError) return error;
  return new AgentBackendError('Cursor ACP Turn failed.', { cause: error });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
