import {
  AgentBackendError,
  AgentBackendProtocolError,
  AgentCapabilityError,
  AgentConfigurationError,
  AgentError,
  AgentInterruptedError,
  AgentSessionClosedError,
  AgentTimeoutError,
  AgentToolNotFoundError,
  AgentTurnInProgressError,
} from '../errors.js';
import type {
  AgentApprovalDecision,
  AgentBackendCapabilities,
  AgentBackendEvent,
  AgentBackendSession,
  AgentEvent,
  AgentEventError,
  AgentInputTrust,
  AgentAudience,
  AgentRunInput,
  AgentRunOptions,
  AgentRunResult,
  AgentSession,
} from '../types.js';
import { AsyncEventQueue } from './AsyncEventQueue.js';
import { createCorrelationId, createTimestamp } from './ids.js';

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
}

export interface AgentSessionRuntimeOptions {
  readonly id: string;
  readonly agentId: string;
  readonly purpose: string;
  readonly audience: AgentAudience;
  readonly inputTrust: AgentInputTrust;
  readonly allowedTools: readonly string[];
  readonly toolIdsByBackendName: ReadonlyMap<string, string>;
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

  private readonly agentId: string;
  private readonly toolIdsByBackendName: ReadonlyMap<string, string>;
  private readonly backendName: string;
  private readonly backendCapabilities: Readonly<AgentBackendCapabilities>;
  private readonly backendSession: AgentBackendSession;
  private readonly onClosed: (sessionId: string) => void;
  private pendingLifecycle?: SessionLifecycle;
  private activeTurn?: ActiveTurn;
  private closed = false;
  private closePromise?: Promise<void>;

  constructor(options: AgentSessionRuntimeOptions) {
    this.id = options.id;
    this.agentId = options.agentId;
    this.purpose = options.purpose;
    this.audience = options.audience;
    this.inputTrust = options.inputTrust;
    this.allowedTools = Object.freeze([...options.allowedTools]);
    this.toolIdsByBackendName = options.toolIdsByBackendName;
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
    };
    this.activeTurn = turn;
    turn.completion = this.executeTurn(turn, input, options);
    return queue;
  }

  async resolveApproval(
    _requestId: string,
    _decision: AgentApprovalDecision
  ): Promise<void> {
    this.assertOpen();
    throw new AgentCapabilityError('approvals', this.backendName);
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

    try {
      this.emitPendingLifecycle(turn.queue);
      turn.queue.push({
        ...this.eventBase(turn.id),
        type: 'turn.started',
        turnId: turn.id,
      });
      this.configureCancellation(turn, options);

      const backendStream = this.backendSession.runStream(input, {
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
            turn.queue.push({
              ...this.eventBase(turn.id),
              type: 'message.completed',
              turnId: turn.id,
              text: event.text,
            });
            break;
          case 'tool.requested': {
            if (!this.backendCapabilities.tools) {
              throw new AgentBackendProtocolError(
                `Backend "${this.backendName}" requested a Tool without declaring Tool support.`
              );
            }
            const toolId = this.toolIdsByBackendName.get(event.toolName);
            if (!toolId) throw new AgentToolNotFoundError(event.toolName);
            turn.queue.push({
              ...this.eventBase(turn.id),
              type: 'tool.requested',
              turnId: turn.id,
              toolCallId: event.toolCallId,
              toolId,
              arguments: event.arguments,
            });
            break;
          }
          case 'completed':
            backendCompleted = true;
            runResult = {
              turnId: turn.id,
              message: event.message,
              artifacts: [],
              usage: event.usage,
              backendMetadata: event.metadata,
            };
            break backendEvents;
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

      turn.queue.push({
        ...this.eventBase(turn.id),
        type: 'turn.completed',
        turnId: turn.id,
        result: runResult,
      });
      turn.queue.close();
    } catch (error) {
      const normalized = this.normalizeTurnError(error, turn);
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
  if (signal.aborted) return Promise.reject(signal.reason);

  return new Promise<IteratorResult<T>>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    Promise.resolve(iterator.next()).then(
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
