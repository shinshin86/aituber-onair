import {
  AgentApprovalDeniedError,
  AgentApprovalTimeoutError,
  AgentBackendError,
  AgentBackendProtocolError,
  AgentCapabilityError,
  AgentConfigurationError,
  AgentError,
  AgentHookError,
  AgentInterruptedError,
  AgentPolicyDeniedError,
  AgentSessionClosedError,
  AgentTimeoutError,
  AgentToolExecutionError,
  AgentToolLoopLimitError,
  AgentToolNotFoundError,
  AgentTurnInProgressError,
} from '../errors.js';
import { evaluatePolicy } from '../policy/DefaultAgentPolicy.js';
import {
  sanitizeToolArguments,
  snapshotToolArguments,
} from '../tools/sanitize.js';
import { validateToolInput } from '../tools/schemaValidation.js';
import type {
  AgentApprovalDecision,
  AgentApprovalRequest,
  AgentAudience,
  AgentBackendCapabilities,
  AgentBackendEvent,
  AgentBackendSession,
  AgentEvent,
  AgentEventError,
  AgentHook,
  AgentInputTrust,
  AgentPolicy,
  AgentRunInput,
  AgentRunOptions,
  AgentRunResult,
  AgentRuntimeLimits,
  AgentSession,
  AgentToolSpec,
} from '../types.js';
import { AsyncEventQueue } from './AsyncEventQueue.js';
import { createCorrelationId, createTimestamp } from './ids.js';
import { runHooks } from './runHooks.js';

interface SessionLifecycleStarted {
  readonly type: 'started';
}

interface SessionLifecycleResumed {
  readonly type: 'resumed';
  readonly backendSessionId: string;
}

type SessionLifecycle = SessionLifecycleStarted | SessionLifecycleResumed;

interface ActiveTurn {
  readonly id: string;
  readonly queue: AsyncEventQueue<AgentEvent>;
  readonly controller: AbortController;
  completion: Promise<void>;
  externalSignal?: AbortSignal;
  externalAbortListener?: () => void;
  timeoutId?: ReturnType<typeof setTimeout>;
  toolCallCount: number;
  readonly toolCallIds: Set<string>;
}

interface PendingApproval {
  readonly request: AgentApprovalRequest;
  readonly queue: AsyncEventQueue<AgentEvent>;
  readonly signal: AbortSignal;
  readonly onAbort: () => void;
  readonly resolve: (decision: AgentApprovalDecision) => void;
  readonly reject: (error: AgentError) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

export interface AgentSessionRuntimeOptions {
  readonly id: string;
  readonly agentId: string;
  readonly purpose: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
  readonly allowedTools: readonly string[];
  readonly allowedCapabilities: readonly string[];
  readonly toolIdsByBackendName: ReadonlyMap<string, string>;
  readonly toolsById: ReadonlyMap<string, AgentToolSpec>;
  readonly policy: AgentPolicy;
  readonly hooks: readonly AgentHook[];
  readonly limits: Required<AgentRuntimeLimits>;
  readonly backendName: string;
  readonly backendCapabilities: Readonly<AgentBackendCapabilities>;
  readonly backendSession: AgentBackendSession;
  readonly lifecycle: SessionLifecycle;
  readonly onClosed: (sessionId: string) => void;
}

export class AgentSessionRuntime implements AgentSession {
  readonly id: string;
  readonly purpose: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
  readonly allowedTools: readonly string[];
  readonly allowedCapabilities: readonly string[];
  readonly backendSessionId?: string;

  private readonly agentId: string;
  private readonly toolIdsByBackendName: ReadonlyMap<string, string>;
  private readonly toolsById: ReadonlyMap<string, AgentToolSpec>;
  private readonly policy: AgentPolicy;
  private readonly hooks: readonly AgentHook[];
  private readonly limits: Required<AgentRuntimeLimits>;
  private readonly backendName: string;
  private readonly backendCapabilities: Readonly<AgentBackendCapabilities>;
  private readonly backendSession: AgentBackendSession;
  private readonly onClosed: (sessionId: string) => void;
  private pendingLifecycle?: SessionLifecycle;
  private activeTurn?: ActiveTurn;
  private closed = false;
  private closePromise?: Promise<void>;
  private readonly pendingApprovals = new Map<string, PendingApproval>();

  constructor(options: AgentSessionRuntimeOptions) {
    this.id = options.id;
    this.agentId = options.agentId;
    this.purpose = options.purpose;
    this.audience = options.audience;
    this.inputTrust = options.inputTrust;
    this.allowedTools = Object.freeze([...options.allowedTools]);
    this.allowedCapabilities = Object.freeze([...options.allowedCapabilities]);
    this.backendSessionId = options.backendSession.id;
    this.toolIdsByBackendName = options.toolIdsByBackendName;
    this.toolsById = options.toolsById;
    this.policy = options.policy;
    this.hooks = options.hooks;
    this.limits = options.limits;
    this.backendName = options.backendName;
    this.backendCapabilities = options.backendCapabilities;
    this.backendSession = options.backendSession;
    this.pendingLifecycle = options.lifecycle;
    this.onClosed = options.onClosed;
  }

  async run(
    input: AgentRunInput,
    options?: AgentRunOptions
  ): Promise<AgentRunResult> {
    let result: AgentRunResult | undefined;
    for await (const event of this.runStream(input, options)) {
      if (event.type === 'turn.completed') result = event.result;
    }
    if (!result) {
      throw new AgentBackendProtocolError(
        'The Agent Turn ended without a completion result.'
      );
    }
    return result;
  }

  runStream(
    input: AgentRunInput,
    options?: AgentRunOptions
  ): AsyncIterable<AgentEvent> {
    this.assertCanRun(input, options);

    const controller = new AbortController();
    const turnId = createCorrelationId('turn');
    const queue = new AsyncEventQueue<AgentEvent>(() => {
      const activeTurn = this.activeTurn;
      if (!activeTurn || activeTurn.id !== turnId) return;
      this.requestTurnAbort(
        activeTurn,
        new AgentInterruptedError(
          'The Agent event stream consumer stopped before Turn completion.'
        ),
        true
      );
    });
    const turn: ActiveTurn = {
      id: turnId,
      queue,
      controller,
      completion: Promise.resolve(),
      toolCallCount: 0,
      toolCallIds: new Set(),
    };
    this.activeTurn = turn;
    turn.completion = this.executeTurn(turn, input, options);
    return queue;
  }

  async resolveApproval(
    requestId: string,
    decision: AgentApprovalDecision
  ): Promise<void> {
    this.assertOpen();
    if (decision !== 'allow-once' && decision !== 'deny') {
      throw new AgentConfigurationError('Approval decision is invalid.', [
        'decision must be "allow-once" or "deny"',
      ]);
    }
    const pending = this.pendingApprovals.get(requestId);
    if (!pending) {
      throw new AgentConfigurationError('Approval request was not found.', [
        `No pending approval has ID "${requestId}"`,
      ]);
    }
    this.settleApproval(pending, decision);
  }

  async interrupt(): Promise<void> {
    this.assertOpen();
    const turn = this.activeTurn;
    if (!turn) return;
    if (
      !this.backendCapabilities.interruption ||
      !this.backendSession.interrupt
    ) {
      throw new AgentCapabilityError('interruption', this.backendName);
    }

    this.requestTurnAbort(turn, new AgentInterruptedError(), false);
    let interruptFailure: AgentBackendError | undefined;
    try {
      await this.backendSession.interrupt();
    } catch (error) {
      interruptFailure = new AgentBackendError(
        `Backend "${this.backendName}" failed to interrupt the active Turn.`,
        { cause: error }
      );
    }
    await turn.completion;
    if (interruptFailure) throw interruptFailure;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    const turn = this.activeTurn;
    if (turn) {
      for (const approval of [...this.pendingApprovals.values()]) {
        this.settleApproval(
          approval,
          'deny',
          new AgentApprovalDeniedError(
            'The approval request was denied because the Agent Session closed.'
          )
        );
      }
      this.requestTurnAbort(
        turn,
        new AgentInterruptedError(
          'The Agent Session was closed during the active Turn.'
        ),
        true
      );
    }

    this.closePromise = (async () => {
      if (turn) await turn.completion;
      try {
        await this.backendSession.close();
      } catch (error) {
        throw new AgentBackendError(
          `Backend "${this.backendName}" failed to close its Session.`,
          { cause: error }
        );
      } finally {
        this.onClosed(this.id);
      }
    })();
    return this.closePromise;
  }

  private assertOpen(): void {
    if (this.closed) throw new AgentSessionClosedError();
  }

  private assertCanRun(
    input: AgentRunInput,
    options: AgentRunOptions | undefined
  ): void {
    this.assertOpen();
    if (this.activeTurn) throw new AgentTurnInProgressError();

    const issues: string[] = [];
    if (typeof input?.instruction !== 'string' || !input.instruction.trim()) {
      issues.push('input.instruction must be a non-empty string');
    }
    if (
      options?.timeoutMs !== undefined &&
      (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)
    ) {
      issues.push('options.timeoutMs must be a positive finite number');
    }
    if (issues.length > 0) {
      throw new AgentConfigurationError('Agent Run input is invalid.', issues);
    }
  }

  private async executeTurn(
    turn: ActiveTurn,
    input: AgentRunInput,
    options: AgentRunOptions | undefined
  ): Promise<void> {
    let iterator: AsyncIterator<AgentBackendEvent> | undefined;
    let backendCompleted = false;
    let backendStreamDone = false;
    let runResult: AgentRunResult | undefined;
    let afterTurnAttempted = false;
    let lastCompletedMessage:
      | { readonly raw: string; readonly transformed: string }
      | undefined;

    try {
      this.emitPendingLifecycle(turn.queue);
      turn.queue.push({
        ...this.eventBase(turn.id),
        type: 'turn.started',
        turnId: turn.id,
      });
      this.configureCancellation(turn, options);

      const preparedInput = await this.prepareRunInput(turn, input);
      const backendStream = this.backendSession.runStream(preparedInput, {
        ...options,
        signal: turn.controller.signal,
      });
      iterator = backendStream[Symbol.asyncIterator]();

      backendEvents: while (true) {
        const next = await nextWithAbort(iterator, turn.controller.signal);
        if (next.done) {
          backendStreamDone = true;
          break;
        }
        if (backendCompleted) {
          throw new AgentBackendProtocolError(
            'The backend emitted an event after its completed event.'
          );
        }

        const event = next.value;
        switch (event.type) {
          case 'message.delta':
            turn.queue.push({
              ...this.eventBase(turn.id),
              type: 'message.delta',
              turnId: turn.id,
              text: event.text,
            });
            break;
          case 'message.completed':
            lastCompletedMessage = {
              raw: event.text,
              transformed: await this.runTextHookPhase(
                turn,
                'draft-response',
                event.text
              ),
            };
            turn.queue.push({
              ...this.eventBase(turn.id),
              type: 'message.completed',
              turnId: turn.id,
              text: lastCompletedMessage.transformed,
            });
            break;
          case 'tool.requested': {
            await this.handleToolRequest(turn, event);
            break;
          }
          case 'completed': {
            backendCompleted = true;
            const message =
              lastCompletedMessage?.raw === event.message
                ? lastCompletedMessage.transformed
                : await this.runTextHookPhase(
                    turn,
                    'draft-response',
                    event.message
                  );
            const candidate: AgentRunResult = {
              turnId: turn.id,
              message,
              artifacts: [],
              usage: event.usage,
              backendMetadata: event.metadata,
            };
            runResult = (await this.runHookPhase(
              turn,
              'output',
              candidate
            )) as AgentRunResult;
            assertRunResult(runResult, turn.id);
            break backendEvents;
          }
          default:
            throw new AgentBackendProtocolError(
              `Unsupported backend event type: ${String(
                (event as { type?: unknown }).type
              )}`
            );
        }
      }

      if (!backendCompleted || !runResult) {
        throw new AgentBackendProtocolError(
          'The backend event stream ended without a completed event.'
        );
      }

      afterTurnAttempted = true;
      await this.runHookPhase(turn, 'after-turn', {
        status: 'completed',
        result: runResult,
      });

      turn.queue.push({
        ...this.eventBase(turn.id),
        type: 'turn.completed',
        turnId: turn.id,
        result: runResult,
      });
      turn.queue.close();
    } catch (error) {
      let normalized = this.normalizeTurnError(error, turn);
      if (!afterTurnAttempted) {
        afterTurnAttempted = true;
        try {
          await this.runHookPhase(turn, 'after-turn', {
            status:
              normalized instanceof AgentInterruptedError
                ? 'interrupted'
                : 'failed',
            error: toEventError(normalized),
          });
        } catch (hookError) {
          normalized = this.normalizeTurnError(hookError, turn);
        }
      }
      if (normalized instanceof AgentInterruptedError) {
        turn.queue.push({
          ...this.eventBase(turn.id),
          type: 'turn.interrupted',
          turnId: turn.id,
          error: toEventError(normalized),
        });
      } else {
        turn.queue.push({
          ...this.eventBase(turn.id),
          type: 'turn.failed',
          turnId: turn.id,
          error: toEventError(normalized),
        });
      }
      if (this.closed) {
        turn.queue.push({
          ...this.eventBase(),
          type: 'session.closed',
          reason: 'closed by host',
        });
      }
      turn.queue.fail(normalized);
    } finally {
      this.clearCancellation(turn);
      if (iterator && !backendStreamDone) {
        const returnPromise = iterator.return?.();
        if (returnPromise) {
          void Promise.resolve(returnPromise).catch(() => undefined);
        }
      }
      if (this.activeTurn === turn) this.activeTurn = undefined;
    }
  }

  private async prepareRunInput(
    turn: ActiveTurn,
    input: AgentRunInput
  ): Promise<AgentRunInput> {
    const conversationInput = await this.runHookPhase(
      turn,
      'input',
      input.input
    );
    const context = await this.runHookPhase(turn, 'context', input.context);
    return {
      instruction: input.instruction,
      ...(conversationInput !== undefined
        ? { input: conversationInput as AgentRunInput['input'] }
        : {}),
      ...(context !== undefined ? { context } : {}),
    };
  }

  private async handleToolRequest(
    turn: ActiveTurn,
    event: Extract<AgentBackendEvent, { readonly type: 'tool.requested' }>
  ): Promise<void> {
    if (!this.backendCapabilities.tools) {
      throw new AgentBackendProtocolError(
        `Backend "${this.backendName}" requested a Tool without declaring Tool support.`
      );
    }
    if (!event.toolCallId.trim()) {
      throw new AgentBackendProtocolError(
        'The backend emitted a Tool request without a Tool call ID.'
      );
    }
    if (turn.toolCallIds.has(event.toolCallId)) {
      throw new AgentBackendProtocolError(
        `The backend reused Tool call ID "${event.toolCallId}".`
      );
    }
    turn.toolCallIds.add(event.toolCallId);
    turn.toolCallCount += 1;
    if (turn.toolCallCount > this.limits.maxToolCallsPerTurn) {
      throw new AgentToolLoopLimitError();
    }

    const toolId = this.toolIdsByBackendName.get(event.toolName);
    if (!toolId) throw new AgentToolNotFoundError(event.toolName);
    const tool = this.toolsById.get(toolId);
    if (!tool) throw new AgentToolNotFoundError(toolId);

    validateToolInput(tool.definition.parameters, event.arguments);
    const hookedArguments = await this.runHookPhase(
      turn,
      'before-tool',
      event.arguments
    );
    validateToolInput(tool.definition.parameters, hookedArguments);
    const toolArguments = snapshotToolArguments(hookedArguments);
    const sanitizedArguments = sanitizeToolArguments(
      toolArguments,
      tool.sensitiveFields ?? []
    );

    turn.queue.push({
      ...this.eventBase(turn.id),
      type: 'tool.requested',
      turnId: turn.id,
      toolCallId: event.toolCallId,
      toolId,
      arguments: sanitizedArguments,
    });

    const policyDecision = await raceWithAbort(
      evaluatePolicy(this.policy, {
        agentId: this.agentId,
        sessionId: this.id,
        turnId: turn.id,
        audience: this.audience,
        inputTrust: this.inputTrust,
        tool,
        arguments: sanitizedArguments,
      }),
      turn.controller.signal
    );
    if (policyDecision.decision === 'deny') {
      throw new AgentPolicyDeniedError(policyDecision.reason, {
        details: { toolId },
      });
    }
    if (policyDecision.decision === 'require-approval') {
      const decision = await this.waitForApproval(
        turn,
        event.toolCallId,
        tool,
        sanitizedArguments,
        policyDecision.reason
      );
      if (decision !== 'allow-once') {
        throw new AgentApprovalDeniedError();
      }
    }

    turn.queue.push({
      ...this.eventBase(turn.id),
      type: 'tool.started',
      turnId: turn.id,
      toolCallId: event.toolCallId,
      toolId,
    });

    let handlerOutput: unknown;
    try {
      handlerOutput = await this.executeTool(
        turn,
        event.toolCallId,
        tool,
        toolArguments
      );
    } catch (error) {
      const normalized = this.normalizeToolError(error, turn, tool);
      turn.queue.push({
        ...this.eventBase(turn.id),
        type: 'tool.failed',
        turnId: turn.id,
        toolCallId: event.toolCallId,
        toolId,
        error: toEventError(normalized),
      });
      if (turn.controller.signal.aborted || isToolTimeoutError(normalized)) {
        throw normalized;
      }
      await this.submitToolResult(turn, {
        type: 'error',
        toolCallId: event.toolCallId,
        error: toEventError(normalized),
      });
      return;
    }

    let output: unknown;
    try {
      output = await this.runHookPhase(turn, 'after-tool', handlerOutput);
    } catch (error) {
      turn.queue.push({
        ...this.eventBase(turn.id),
        type: 'tool.completed',
        turnId: turn.id,
        toolCallId: event.toolCallId,
        toolId,
        output: handlerOutput,
      });
      throw error;
    }

    turn.queue.push({
      ...this.eventBase(turn.id),
      type: 'tool.completed',
      turnId: turn.id,
      toolCallId: event.toolCallId,
      toolId,
      output,
    });
    await this.submitToolResult(turn, {
      type: 'success',
      toolCallId: event.toolCallId,
      output,
    });
  }

  private async executeTool(
    turn: ActiveTurn,
    toolCallId: string,
    tool: AgentToolSpec,
    input: unknown
  ): Promise<unknown> {
    const controller = new AbortController();
    const abortFromTurn = () => controller.abort(turn.controller.signal.reason);
    if (turn.controller.signal.aborted) abortFromTurn();
    else {
      turn.controller.signal.addEventListener('abort', abortFromTurn, {
        once: true,
      });
    }
    if (controller.signal.aborted) throw controller.signal.reason;
    const timeoutId =
      tool.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            controller.abort(
              new AgentToolExecutionError(
                `Agent Tool "${tool.id}" timed out.`,
                { details: { reason: 'timeout', toolId: tool.id } }
              )
            );
          }, tool.timeoutMs);

    try {
      const execution = Promise.resolve().then(() => {
        if (controller.signal.aborted) throw controller.signal.reason;
        return tool.execute(input, {
          agentId: this.agentId,
          sessionId: this.id,
          turnId: turn.id,
          toolCallId,
          signal: controller.signal,
        });
      });
      return await raceWithAbort(execution, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) throw controller.signal.reason;
      if (error instanceof AgentError) throw error;
      throw new AgentToolExecutionError(
        `Agent Tool "${tool.id}" failed during execution.`,
        { cause: error, details: { toolId: tool.id } }
      );
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      turn.controller.signal.removeEventListener('abort', abortFromTurn);
    }
  }

  private async submitToolResult(
    turn: ActiveTurn,
    result: Parameters<NonNullable<AgentBackendSession['submitToolResult']>>[0]
  ): Promise<void> {
    const submit = this.backendSession.submitToolResult;
    if (!submit) {
      throw new AgentBackendProtocolError(
        `Backend "${this.backendName}" requested a Tool but cannot receive its result.`
      );
    }
    try {
      await raceWithAbort(
        submit.call(this.backendSession, result),
        turn.controller.signal
      );
    } catch (error) {
      throw new AgentBackendError(
        `Backend "${this.backendName}" failed to accept an Agent Tool result.`,
        { cause: error }
      );
    }
  }

  private waitForApproval(
    turn: ActiveTurn,
    toolCallId: string,
    tool: AgentToolSpec,
    argumentsForReview: unknown,
    reason: string
  ): Promise<AgentApprovalDecision> {
    const request: AgentApprovalRequest = {
      id: createCorrelationId('approval'),
      agentId: this.agentId,
      sessionId: this.id,
      turnId: turn.id,
      toolCallId,
      toolId: tool.id,
      risk: tool.risk,
      arguments: argumentsForReview,
      reason,
    };

    return new Promise<AgentApprovalDecision>((resolve, reject) => {
      const onAbort = () => {
        const pending = this.pendingApprovals.get(request.id);
        if (!pending) return;
        this.settleApproval(
          pending,
          'deny',
          this.normalizeTurnError(turn.controller.signal.reason, turn)
        );
      };
      const pending: PendingApproval = {
        request,
        queue: turn.queue,
        signal: turn.controller.signal,
        onAbort,
        resolve,
        reject,
      };
      pending.timeoutId = setTimeout(() => {
        this.settleApproval(pending, 'deny', new AgentApprovalTimeoutError());
      }, this.limits.approvalTimeoutMs);
      this.pendingApprovals.set(request.id, pending);
      turn.controller.signal.addEventListener('abort', onAbort, { once: true });
      turn.queue.push({
        ...this.eventBase(turn.id),
        type: 'approval.requested',
        turnId: turn.id,
        request,
      });
      if (turn.controller.signal.aborted) onAbort();
    });
  }

  private settleApproval(
    pending: PendingApproval,
    decision: AgentApprovalDecision,
    error?: AgentError
  ): void {
    if (!this.pendingApprovals.has(pending.request.id)) return;
    this.removePendingApproval(pending);
    pending.queue.push({
      ...this.eventBase(pending.request.turnId),
      type: 'approval.resolved',
      turnId: pending.request.turnId,
      requestId: pending.request.id,
      decision,
    });
    if (error) pending.reject(error);
    else if (decision === 'deny')
      pending.reject(new AgentApprovalDeniedError());
    else pending.resolve(decision);
  }

  private removePendingApproval(pending: PendingApproval): void {
    this.pendingApprovals.delete(pending.request.id);
    if (pending.timeoutId !== undefined) clearTimeout(pending.timeoutId);
    pending.signal.removeEventListener('abort', pending.onAbort);
  }

  private runHookPhase(
    turn: ActiveTurn,
    phase: Parameters<typeof runHooks>[1],
    value: unknown
  ): Promise<unknown> {
    if (turn.controller.signal.aborted) {
      return Promise.reject(turn.controller.signal.reason);
    }
    return raceWithAbort(
      runHooks(this.hooks, phase, value, {
        agentId: this.agentId,
        sessionId: this.id,
        turnId: turn.id,
        signal: turn.controller.signal,
      }),
      turn.controller.signal
    );
  }

  private async runTextHookPhase(
    turn: ActiveTurn,
    phase: 'draft-response',
    value: string
  ): Promise<string> {
    const transformed = await this.runHookPhase(turn, phase, value);
    if (typeof transformed !== 'string') {
      throw new AgentHookError(
        `Agent hooks for "${phase}" must return a string.`
      );
    }
    return transformed;
  }

  private normalizeToolError(
    error: unknown,
    turn: ActiveTurn,
    tool: AgentToolSpec
  ): AgentError {
    if (turn.controller.signal.aborted) {
      return this.normalizeTurnError(error, turn);
    }
    if (error instanceof AgentError) return error;
    return new AgentToolExecutionError(
      `Agent Tool "${tool.id}" failed during execution.`,
      { cause: error, details: { toolId: tool.id } }
    );
  }

  private emitPendingLifecycle(queue: AsyncEventQueue<AgentEvent>): void {
    const lifecycle = this.pendingLifecycle;
    if (!lifecycle) return;
    this.pendingLifecycle = undefined;

    if (lifecycle.type === 'resumed') {
      queue.push({
        ...this.eventBase(),
        type: 'session.resumed',
        backendSessionId: lifecycle.backendSessionId,
      });
    } else {
      queue.push({
        ...this.eventBase(),
        type: 'session.started',
        purpose: this.purpose,
      });
    }
  }

  private configureCancellation(
    turn: ActiveTurn,
    options: AgentRunOptions | undefined
  ): void {
    if (options?.signal) {
      const externalSignal = options.signal;
      const listener = () =>
        this.requestTurnAbort(
          turn,
          new AgentInterruptedError(
            'The Agent Turn was aborted by the caller.'
          ),
          true
        );
      turn.externalSignal = externalSignal;
      turn.externalAbortListener = listener;
      if (externalSignal.aborted) listener();
      else externalSignal.addEventListener('abort', listener, { once: true });
    }

    if (options?.timeoutMs !== undefined) {
      turn.timeoutId = setTimeout(() => {
        this.requestTurnAbort(turn, new AgentTimeoutError(), true);
      }, options.timeoutMs);
    }
  }

  private clearCancellation(turn: ActiveTurn): void {
    if (turn.timeoutId !== undefined) clearTimeout(turn.timeoutId);
    if (turn.externalSignal && turn.externalAbortListener) {
      turn.externalSignal.removeEventListener(
        'abort',
        turn.externalAbortListener
      );
    }
  }

  private requestTurnAbort(
    turn: ActiveTurn,
    reason: AgentError,
    notifyBackend: boolean
  ): void {
    if (turn.controller.signal.aborted) return;
    turn.controller.abort(reason);
    if (
      notifyBackend &&
      this.backendCapabilities.interruption &&
      this.backendSession.interrupt
    ) {
      void this.backendSession.interrupt().catch(() => undefined);
    }
  }

  private normalizeTurnError(error: unknown, turn: ActiveTurn): AgentError {
    if (turn.controller.signal.aborted) {
      const reason = turn.controller.signal.reason;
      if (reason instanceof AgentError) return reason;
      return new AgentInterruptedError();
    }
    if (error instanceof AgentError) return error;
    return new AgentBackendError(
      `Backend "${this.backendName}" failed during the Agent Turn.`,
      { cause: error }
    );
  }

  private eventBase(turnId?: string) {
    return {
      id: createCorrelationId('event'),
      timestamp: createTimestamp(),
      agentId: this.agentId,
      sessionId: this.id,
      ...(turnId ? { turnId } : {}),
    };
  }
}

function toEventError(error: AgentError): AgentEventError {
  return {
    name: error.name,
    code: error.code,
    message: error.message,
    details: error.details,
  };
}

function nextWithAbort<T>(
  iterator: AsyncIterator<T>,
  signal: AbortSignal
): Promise<IteratorResult<T>> {
  return raceWithAbort(Promise.resolve(iterator.next()), signal);
}

function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  if (signal.aborted) {
    void promise.catch(() => undefined);
    return Promise.reject(signal.reason);
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (result) => {
        signal.removeEventListener('abort', onAbort);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}

function assertRunResult(
  value: unknown,
  expectedTurnId: string
): asserts value is AgentRunResult {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Partial<AgentRunResult>)
      : undefined;
  if (
    !candidate ||
    candidate.turnId !== expectedTurnId ||
    typeof candidate.message !== 'string' ||
    !Array.isArray(candidate.artifacts)
  ) {
    throw new AgentHookError(
      'Agent hooks for "output" must return an AgentRunResult.'
    );
  }
}

function isToolTimeoutError(error: AgentError): boolean {
  return (
    error instanceof AgentToolExecutionError &&
    error.details?.reason === 'timeout'
  );
}
