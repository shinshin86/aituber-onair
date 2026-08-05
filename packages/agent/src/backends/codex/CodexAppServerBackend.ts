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
  AgentBackendArtifact,
  AgentBackendEvent,
  AgentBackendSessionInput,
  AgentRunInput,
  AgentRunOptions,
  JsonValue,
} from '../../types.js';
import { AsyncEventQueue } from '../../core/AsyncEventQueue.js';
import { CodexAppServerClient } from './client.js';
import type {
  CodexAppServerClientDependencies,
  CodexThreadConfiguration,
} from './client.js';
import { CodexAppServerServerRequestError } from './transport.js';
import type {
  CodexAppServerNotification,
  CodexAppServerRequest,
  CodexAppServerRequestId,
  CodexAppServerTurn,
} from './protocol.js';
import type {
  CodexAppServerBackend,
  CodexAppServerBackendCapabilities,
  CodexAppServerBackendOptions,
  CodexAppServerBackendSession,
  CodexAppServerModelListOptions,
} from './types.js';

const DEFAULT_SANDBOX = 'read-only';
const DEFAULT_APPROVAL_POLICY = 'on-request';
const CODEX_BACKEND_OPTION_KEYS = new Set([
  'allowPathLookup',
  'approvalPolicy',
  'codexPath',
  'compatibility',
  'environment',
  'ephemeral',
  'maxLineBytes',
  'model',
  'onDiagnostic',
  'requestTimeoutMs',
  'sandbox',
  'shutdownTimeoutMs',
  'workingDirectory',
]);
const TURN_NOTIFICATION_METHODS = new Set([
  'error',
  'item/agentMessage/delta',
  'item/completed',
  'turn/completed',
  'turn/started',
]);

const CODEX_BACKEND_CAPABILITIES: Readonly<CodexAppServerBackendCapabilities> =
  Object.freeze({
    text: true,
    streaming: true,
    tools: false,
    interruption: true,
    sessionResume: true,
    approvals: true,
    detailedEvents: true,
  });

interface ActiveCodexTurn {
  readonly queue: AsyncEventQueue<AgentBackendEvent>;
  readonly terminal: Promise<CodexAppServerTurn>;
  readonly resolveTerminal: (turn: CodexAppServerTurn) => void;
  readonly rejectTerminal: (error: unknown) => void;
  readonly artifacts: AgentBackendArtifact[];
  codexTurnId?: string;
  finalMessage?: string;
  accumulatedMessage: string;
  lastError?: string;
  interruptPromise?: Promise<void>;
  resolveDeferredInterrupt?: () => void;
  rejectDeferredInterrupt?: (error: unknown) => void;
}

type CodexApprovalMethod =
  | 'item/commandExecution/requestApproval'
  | 'item/fileChange/requestApproval';

interface PendingCodexApproval {
  readonly resolve: (result: unknown) => void;
}

export function createCodexAppServerBackend(
  options: CodexAppServerBackendOptions
): CodexAppServerBackend {
  return createCodexAppServerBackendRuntime(options);
}

export function createCodexAppServerBackendRuntime(
  options: CodexAppServerBackendOptions,
  dependencies: CodexAppServerClientDependencies = {}
): CodexAppServerBackend {
  return new CodexAppServerBackendRuntime(options, dependencies);
}

class CodexAppServerBackendRuntime implements CodexAppServerBackend {
  readonly kind = 'codex-app-server' as const;
  readonly name = 'codex-app-server';
  readonly capabilities = CODEX_BACKEND_CAPABILITIES;

  private readonly options: CodexAppServerBackendOptions;
  private readonly dependencies: CodexAppServerClientDependencies;

  constructor(
    options: CodexAppServerBackendOptions,
    dependencies: CodexAppServerClientDependencies
  ) {
    const issues = validateOptions(options);
    if (issues.length > 0) {
      throw new AgentConfigurationError(
        'Codex app-server backend options are invalid.',
        issues
      );
    }
    this.options = Object.freeze({
      ...options,
      compatibility: Object.freeze({ ...options.compatibility }),
      ...(options.environment
        ? { environment: Object.freeze({ ...options.environment }) }
        : {}),
    });
    this.dependencies = dependencies;
  }

  async startSession(
    input: AgentBackendSessionInput
  ): Promise<CodexAppServerBackendSession> {
    if (input.tools.length > 0) {
      throw new AgentBackendProtocolError(
        'Codex app-server backend does not expose Agent domain Tools. Use a separate Session or ChatService backend.'
      );
    }
    const client = await this.connectClient();
    const configuration = this.createThreadConfiguration(input.brief);
    try {
      const result = input.backendSessionId
        ? await client.resumeThread(input.backendSessionId, configuration)
        : await client.startThread(configuration);
      const threadId = readThreadId(result);
      if (input.backendSessionId && threadId !== input.backendSessionId) {
        throw new AgentBackendProtocolError(
          'Codex app-server resumed a different Thread than requested.'
        );
      }
      return new CodexAppServerBackendSessionRuntime({
        client,
        input,
        threadId,
        resumed: input.backendSessionId !== undefined,
      });
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  async readAccount(refreshToken = false) {
    const client = await this.connectClient();
    try {
      return await client.readAccount(refreshToken);
    } finally {
      await client.close();
    }
  }

  async listModels(options: CodexAppServerModelListOptions = {}) {
    const client = await this.connectClient();
    try {
      return await client.listModels(options);
    } finally {
      await client.close();
    }
  }

  private async connectClient(): Promise<CodexAppServerClient> {
    await assertWorkingDirectory(this.options.workingDirectory);
    return CodexAppServerClient.connect(
      {
        executable: this.options.codexPath ?? 'codex',
        workingDirectory: this.options.workingDirectory,
        environment: { ...process.env, ...this.options.environment },
        compatibility: this.options.compatibility,
        requestTimeoutMs: this.options.requestTimeoutMs,
        shutdownTimeoutMs: this.options.shutdownTimeoutMs,
        maxLineBytes: this.options.maxLineBytes,
        onDiagnostic: this.options.onDiagnostic,
      },
      this.dependencies
    );
  }

  private createThreadConfiguration(brief: string): CodexThreadConfiguration {
    return {
      cwd: this.options.workingDirectory,
      developerInstructions: brief,
      sandbox: this.options.sandbox ?? DEFAULT_SANDBOX,
      approvalPolicy: this.options.approvalPolicy ?? DEFAULT_APPROVAL_POLICY,
      model: this.options.model,
      ephemeral: this.options.ephemeral,
    };
  }
}

interface CodexAppServerBackendSessionRuntimeOptions {
  readonly client: CodexAppServerClient;
  readonly input: AgentBackendSessionInput;
  readonly threadId: string;
  readonly resumed: boolean;
}

class CodexAppServerBackendSessionRuntime
  implements CodexAppServerBackendSession
{
  readonly id: string;

  private readonly client: CodexAppServerClient;
  private readonly input: AgentBackendSessionInput;
  private readonly pendingApprovals = new Map<string, PendingCodexApproval>();
  private readonly unsubscribeNotification: () => void;
  private readonly unsubscribeError: () => void;
  private activeTurn?: ActiveCodexTurn;
  private resumeReminderPending: boolean;
  private closed = false;
  private closePromise?: Promise<void>;

  constructor(options: CodexAppServerBackendSessionRuntimeOptions) {
    this.id = options.threadId;
    this.client = options.client;
    this.input = options.input;
    this.resumeReminderPending = options.resumed;
    this.unsubscribeNotification = this.client.onNotification((notification) =>
      this.handleNotification(notification)
    );
    this.unsubscribeError = this.client.onError((error) => {
      this.activeTurn?.rejectTerminal(error);
    });
    this.client.onServerRequest((request) => this.handleServerRequest(request));
  }

  runStream(
    input: AgentRunInput,
    options?: AgentRunOptions
  ): AsyncIterable<AgentBackendEvent> {
    this.assertOpen();
    if (this.activeTurn) throw new AgentTurnInProgressError();

    let resolveTerminal!: (turn: CodexAppServerTurn) => void;
    let rejectTerminal!: (error: unknown) => void;
    const terminal = new Promise<CodexAppServerTurn>((resolve, reject) => {
      resolveTerminal = resolve;
      rejectTerminal = reject;
    });
    const queue = new AsyncEventQueue<AgentBackendEvent>(() => {
      void this.interrupt().catch(() => undefined);
    });
    const active: ActiveCodexTurn = {
      queue,
      terminal,
      resolveTerminal,
      rejectTerminal,
      artifacts: [],
      accumulatedMessage: '',
    };
    this.activeTurn = active;
    void this.executeTurn(active, input, options);
    return queue;
  }

  async steer(input: AgentRunInput): Promise<void> {
    this.assertOpen();
    const active = this.activeTurn;
    if (!active?.codexTurnId) {
      throw new AgentBackendProtocolError(
        'Codex app-server Turn is not ready to be steered.'
      );
    }
    await this.client.steerTurn(this.id, active.codexTurnId, [
      createTextInput(buildTurnText(input, this.input.inputTrust)),
    ]);
  }

  async submitApprovalResult(
    result: AgentBackendApprovalResult
  ): Promise<void> {
    this.assertOpen();
    const pending = this.pendingApprovals.get(result.approvalId);
    if (!pending) {
      throw new AgentBackendProtocolError(
        `Codex approval "${result.approvalId}" was not found.`
      );
    }
    this.pendingApprovals.delete(result.approvalId);
    pending.resolve({ decision: mapApprovalDecision(result.decision) });
  }

  interrupt(): Promise<void> {
    this.assertOpen();
    const active = this.activeTurn;
    if (!active) return Promise.resolve();
    this.cancelPendingApprovals();
    if (active.interruptPromise) return active.interruptPromise;
    if (active.codexTurnId) {
      active.interruptPromise = Promise.resolve().then(() =>
        this.client.interruptTurn(this.id, active.codexTurnId as string)
      );
      return active.interruptPromise;
    }
    active.interruptPromise = new Promise<void>((resolve, reject) => {
      active.resolveDeferredInterrupt = resolve;
      active.rejectDeferredInterrupt = reject;
    });
    return active.interruptPromise;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    this.cancelPendingApprovals();
    const active = this.activeTurn;
    if (active) {
      const error = new AgentInterruptedError(
        'Codex app-server Session closed during an active Turn.'
      );
      active.rejectTerminal(error);
      active.rejectDeferredInterrupt?.(error);
      active.queue.fail(error);
    }
    this.unsubscribeNotification();
    this.unsubscribeError();
    this.closePromise = this.client.close();
    return this.closePromise;
  }

  private async executeTurn(
    active: ActiveCodexTurn,
    input: AgentRunInput,
    options: AgentRunOptions | undefined
  ): Promise<void> {
    let abortListener: (() => void) | undefined;
    try {
      if (options?.signal?.aborted) throw options.signal.reason;
      if (options?.signal) {
        abortListener = () => void this.interrupt().catch(() => undefined);
        options.signal.addEventListener('abort', abortListener, { once: true });
      }
      const reminder = this.resumeReminderPending
        ? this.input.brief
        : undefined;
      const response = await this.client.startTurn(this.id, [
        createTextInput(buildTurnText(input, this.input.inputTrust, reminder)),
      ]);
      const started = readTurn(response?.turn);
      if (active.codexTurnId && active.codexTurnId !== started.id) {
        throw new AgentBackendProtocolError(
          'Codex app-server turn/start response did not match turn/started.'
        );
      }
      active.codexTurnId = started.id;
      this.dispatchDeferredInterrupt(active);
      this.resumeReminderPending = false;
      const completed = await active.terminal;
      if (completed.status === 'interrupted') throw new AgentInterruptedError();
      if (completed.status === 'failed') {
        throw new AgentBackendError(
          completed.error?.message ??
            active.lastError ??
            'Codex app-server Turn failed.'
        );
      }
      if (completed.status !== 'completed') {
        throw new AgentBackendProtocolError(
          `Codex app-server returned terminal status "${completed.status}".`
        );
      }
      const message = active.finalMessage ?? active.accumulatedMessage;
      if (active.finalMessage === undefined) {
        active.queue.push({ type: 'message.completed', text: message });
      }
      active.queue.push({
        type: 'completed',
        message,
        artifacts: active.artifacts,
        metadata: {
          threadId: this.id,
          codexTurnId: completed.id,
        },
      });
      active.queue.close();
    } catch (error) {
      const normalized = normalizeBackendError(error);
      active.rejectDeferredInterrupt?.(normalized);
      active.queue.fail(normalized);
    } finally {
      if (options?.signal && abortListener) {
        options.signal.removeEventListener('abort', abortListener);
      }
      this.cancelPendingApprovals();
      if (this.activeTurn === active) this.activeTurn = undefined;
    }
  }

  private handleNotification(notification: CodexAppServerNotification): void {
    const active = this.activeTurn;
    if (!active || !isRecord(notification.params)) return;
    const params = notification.params;
    if (TURN_NOTIFICATION_METHODS.has(notification.method)) {
      if (typeof params.threadId !== 'string') {
        throw new AgentBackendProtocolError(
          'Codex app-server Turn notification has no valid Thread ID.'
        );
      }
      if (params.threadId !== this.id) return;
    }

    switch (notification.method) {
      case 'turn/started': {
        const turn = readTurn(params.turn);
        if (!acceptTurnNotification(active, turn.id, true)) return;
        this.dispatchDeferredInterrupt(active);
        break;
      }
      case 'item/agentMessage/delta':
        if (!acceptTurnNotification(active, params.turnId)) return;
        if (typeof params.delta === 'string') {
          active.accumulatedMessage += params.delta;
          active.queue.push({ type: 'message.delta', text: params.delta });
        }
        break;
      case 'item/completed': {
        if (!acceptTurnNotification(active, params.turnId)) return;
        const item = params.item;
        if (!isRecord(item) || typeof item.type !== 'string') return;
        if (item.type === 'agentMessage' && typeof item.text === 'string') {
          active.finalMessage = item.text;
          active.queue.push({ type: 'message.completed', text: item.text });
          return;
        }
        const artifact = toBackendArtifact(item);
        if (artifact) active.artifacts.push(artifact);
        break;
      }
      case 'error':
        if (!acceptTurnNotification(active, params.turnId)) return;
        if (
          isRecord(params.error) &&
          typeof params.error.message === 'string'
        ) {
          active.lastError = params.error.message;
        }
        break;
      case 'turn/completed': {
        const turn = readTurn(params.turn);
        if (!acceptTurnNotification(active, turn.id)) return;
        active.resolveTerminal(turn);
        break;
      }
    }
  }

  private handleServerRequest(
    request: CodexAppServerRequest
  ): Promise<unknown> {
    const method = request.method;
    if (
      method !== 'item/commandExecution/requestApproval' &&
      method !== 'item/fileChange/requestApproval'
    ) {
      throw new CodexAppServerServerRequestError(
        -32601,
        `Unsupported server request method "${request.method}".`
      );
    }
    const active = this.activeTurn;
    if (!active || !isRecord(request.params)) {
      throw new CodexAppServerServerRequestError(
        -32602,
        'Approval request is not associated with an active Turn.'
      );
    }
    const params = request.params;
    if (
      params.threadId !== this.id ||
      typeof params.turnId !== 'string' ||
      typeof params.itemId !== 'string'
    ) {
      throw new CodexAppServerServerRequestError(
        -32602,
        'Approval request identifiers are malformed.'
      );
    }
    if (active.codexTurnId && params.turnId !== active.codexTurnId) {
      throw new CodexAppServerServerRequestError(
        -32602,
        'Approval request belongs to a different Turn.'
      );
    }

    const approvalId = encodeApprovalId(request.id);
    if (this.pendingApprovals.has(approvalId)) {
      throw new CodexAppServerServerRequestError(
        -32600,
        'Approval request ID was reused.'
      );
    }
    return new Promise((resolve) => {
      this.pendingApprovals.set(approvalId, {
        resolve,
      });
      active.queue.push(createBackendApprovalEvent(approvalId, method, params));
    });
  }

  private cancelPendingApprovals(): void {
    for (const pending of this.pendingApprovals.values()) {
      pending.resolve({ decision: 'cancel' });
    }
    this.pendingApprovals.clear();
  }

  private dispatchDeferredInterrupt(active: ActiveCodexTurn): void {
    const resolve = active.resolveDeferredInterrupt;
    const reject = active.rejectDeferredInterrupt;
    if (!active.codexTurnId || !resolve || !reject) return;
    active.resolveDeferredInterrupt = undefined;
    active.rejectDeferredInterrupt = undefined;
    try {
      void this.client
        .interruptTurn(this.id, active.codexTurnId)
        .then(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  private assertOpen(): void {
    if (this.closed) throw new AgentSessionClosedError();
  }
}

function validateOptions(options: CodexAppServerBackendOptions): string[] {
  const issues: string[] = [];
  if (!options || typeof options !== 'object') {
    return ['options must be an object'];
  }
  for (const key of Object.keys(options)) {
    if (!CODEX_BACKEND_OPTION_KEYS.has(key)) {
      issues.push(`options contains unsupported field "${key}"`);
    }
  }
  if (
    typeof options.workingDirectory !== 'string' ||
    !isAbsolute(options.workingDirectory)
  ) {
    issues.push('workingDirectory must be an absolute path');
  }
  if ('codexPath' in options) {
    if (
      typeof options.codexPath !== 'string' ||
      !isAbsolute(options.codexPath)
    ) {
      issues.push('codexPath must be an absolute path');
    }
    if (options.allowPathLookup === true) {
      issues.push('allowPathLookup cannot be true when codexPath is provided');
    }
  } else if (options.allowPathLookup !== true) {
    issues.push('allowPathLookup must be true when codexPath is omitted');
  }
  if (
    !isRecord(options.compatibility) ||
    typeof options.compatibility.expectedVersion !== 'string' ||
    typeof options.compatibility.schemaVersion !== 'string'
  ) {
    issues.push(
      'compatibility must contain expectedVersion and schemaVersion strings'
    );
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
    options.sandbox !== undefined &&
    !['read-only', 'workspace-write'].includes(options.sandbox)
  ) {
    issues.push('sandbox must be "read-only" or "workspace-write"');
  }
  if (
    options.approvalPolicy !== undefined &&
    !['untrusted', 'on-request', 'never'].includes(options.approvalPolicy)
  ) {
    issues.push('approvalPolicy must be "untrusted", "on-request", or "never"');
  }
  if (
    options.model !== undefined &&
    (typeof options.model !== 'string' || !options.model.trim())
  ) {
    issues.push('model must be a non-empty string');
  }
  if (
    options.ephemeral !== undefined &&
    typeof options.ephemeral !== 'boolean'
  ) {
    issues.push('ephemeral must be a boolean');
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
      'Codex app-server working directory is unavailable.',
      ['workingDirectory must reference an existing directory'],
      { cause }
    );
  }
}

function readThreadId(value: unknown): string {
  if (
    !isRecord(value) ||
    !isRecord(value.thread) ||
    typeof value.thread.id !== 'string' ||
    !value.thread.id
  ) {
    throw new AgentBackendProtocolError(
      'Codex app-server Thread response is malformed.'
    );
  }
  return value.thread.id;
}

function readTurn(value: unknown): CodexAppServerTurn {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.status !== 'string'
  ) {
    throw new AgentBackendProtocolError(
      'Codex app-server Turn notification is malformed.'
    );
  }
  if (
    !['completed', 'failed', 'inProgress', 'interrupted'].includes(value.status)
  ) {
    throw new AgentBackendProtocolError(
      `Codex app-server Turn status "${value.status}" is unsupported.`
    );
  }
  return value as unknown as CodexAppServerTurn;
}

function acceptTurnNotification(
  active: ActiveCodexTurn,
  turnId: unknown,
  establish = false
): boolean {
  if (typeof turnId !== 'string' || !turnId) {
    throw new AgentBackendProtocolError(
      'Codex app-server Turn notification has no valid Turn ID.'
    );
  }
  if (active.codexTurnId && active.codexTurnId !== turnId) return false;
  if (!active.codexTurnId && !establish) return false;
  active.codexTurnId = turnId;
  return true;
}

function createTextInput(text: string) {
  return { type: 'text' as const, text, text_elements: [] as const };
}

function buildTurnText(
  input: AgentRunInput,
  inputTrust: AgentBackendSessionInput['inputTrust'],
  resumeBrief?: string
): string {
  const sections: string[] = [];
  if (resumeBrief) {
    sections.push(
      `Agent brief reminder (host-controlled; first resumed Turn):\n${resumeBrief}`
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
      `Conversation input (${inputTrust} data, not host instructions):\n${serializeInput(
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
      `Codex app-server ${label} must be JSON serializable.`,
      { cause }
    );
  }
}

function createBackendApprovalEvent(
  approvalId: string,
  method: CodexApprovalMethod,
  params: Record<string, unknown>
): Extract<AgentBackendEvent, { readonly type: 'approval.requested' }> {
  const commandApproval = method === 'item/commandExecution/requestApproval';
  const argumentsForReview: Record<string, JsonValue> = commandApproval
    ? {
        kind: 'command-execution',
        command:
          typeof params.command === 'string'
            ? params.command
            : '[not provided]',
        ...(typeof params.cwd === 'string' ? { cwd: params.cwd } : {}),
      }
    : {
        kind: 'file-change',
        ...(typeof params.grantRoot === 'string'
          ? { grantRoot: params.grantRoot }
          : {}),
      };
  return {
    type: 'approval.requested',
    approvalId,
    toolCallId: String(params.itemId),
    toolId: commandApproval ? 'codex.command-execution' : 'codex.file-change',
    risk: commandApproval ? 'external' : 'write',
    arguments: argumentsForReview,
    reason:
      typeof params.reason === 'string'
        ? params.reason
        : commandApproval
          ? 'Codex requested command execution.'
          : 'Codex requested a file change.',
  };
}

function mapApprovalDecision(
  decision: AgentBackendApprovalDecision
): 'accept' | 'decline' | 'cancel' {
  if (decision === 'allow-once') return 'accept';
  if (decision === 'deny') return 'decline';
  return 'cancel';
}

function encodeApprovalId(id: CodexAppServerRequestId): string {
  return `codex:${typeof id}:${String(id)}`;
}

function toBackendArtifact(
  item: Record<string, unknown>
): AgentBackendArtifact | undefined {
  if (item.type === 'commandExecution') {
    return {
      type: 'codex.command-execution',
      title: typeof item.command === 'string' ? item.command : undefined,
      data: {
        id: readJsonPrimitive(item.id),
        status: readJsonPrimitive(item.status),
        command: readJsonPrimitive(item.command),
        cwd: readJsonPrimitive(item.cwd),
        exitCode: readJsonPrimitive(item.exitCode),
        durationMs: readJsonPrimitive(item.durationMs),
      },
    };
  }
  if (item.type === 'fileChange') {
    const changes = Array.isArray(item.changes)
      ? item.changes.slice(0, 100).map((change) => {
          if (!isRecord(change)) return { path: '[unknown]', kind: 'unknown' };
          return {
            path: readJsonPrimitive(change.path),
            kind: readJsonPrimitive(change.kind),
          };
        })
      : [];
    return {
      type: 'codex.file-change',
      data: {
        id: readJsonPrimitive(item.id),
        status: readJsonPrimitive(item.status),
        changes,
      },
    };
  }
  if (item.type === 'plan' && typeof item.text === 'string') {
    return {
      type: 'codex.plan',
      data: {
        id: readJsonPrimitive(item.id),
        text: item.text,
      },
    };
  }
  return undefined;
}

function readJsonPrimitive(value: unknown): JsonValue {
  return value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? value
    : null;
}

function normalizeBackendError(error: unknown): Error {
  if (error instanceof AgentError) return error;
  return new AgentBackendError('Codex app-server Turn failed.', {
    cause: error,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
