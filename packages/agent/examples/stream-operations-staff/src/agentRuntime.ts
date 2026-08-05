import type { AgentEvent } from '@aituber-onair/agent';
import type {
  CommentAnalysisSnapshot,
  StreamAlertData,
  StreamOperationsStaffRuntime,
  StreamReportData,
  StreamServerState,
  StreamSseEnvelope,
  StreamStaffArtifact,
  StreamStaffInitialization,
  StreamStaffTurn,
} from './protocol';

export type {
  CommentAnalysisSnapshot,
  StreamAlertData,
  StreamOperationsStaffRuntime,
  StreamReportData,
  StreamServerState,
  StreamStaffArtifact,
  StreamStaffInitialization,
  StreamStaffTurn,
} from './protocol';

interface PendingOperation {
  readonly events: AgentEvent[];
  readonly resolve: (turn: StreamStaffTurn) => void;
  readonly reject: (error: Error) => void;
  readonly timeoutId: ReturnType<typeof setTimeout>;
}

interface EventSourceLike {
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  close(): void;
}

interface CreateStreamOperationsStaffRuntimeOptions {
  readonly fetch?: typeof fetch;
  readonly createEventSource?: (url: string) => EventSourceLike;
  readonly createOperationId?: () => string;
  readonly operationTimeoutMs?: number;
}

const DEFAULT_OPERATION_TIMEOUT_MS = 15 * 60_000;

export function createStreamOperationsStaffRuntime(
  options: CreateStreamOperationsStaffRuntimeOptions = {}
): StreamOperationsStaffRuntime {
  const fetchRequest = options.fetch ?? fetch.bind(globalThis);
  const createEventSource =
    options.createEventSource ?? ((url: string) => new EventSource(url));
  const createOperationId =
    options.createOperationId ?? (() => crypto.randomUUID());
  const operationTimeoutMs =
    options.operationTimeoutMs ?? DEFAULT_OPERATION_TIMEOUT_MS;
  const pending = new Map<string, PendingOperation>();
  const stateListeners = new Set<(state: StreamServerState) => void>();
  let eventSource: EventSourceLike | undefined;
  let closed = false;

  const ensureEventSource = (): void => {
    if (eventSource) return;
    const source = createEventSource('/api/events');
    source.onmessage = (event) => {
      let envelope: StreamSseEnvelope;
      try {
        envelope = JSON.parse(event.data) as StreamSseEnvelope;
      } catch {
        return;
      }
      handleEnvelope(envelope);
    };
    source.onerror = () => {
      // EventSource reconnects automatically and sends Last-Event-ID.
    };
    eventSource = source;
  };

  const handleEnvelope = (envelope: StreamSseEnvelope): void => {
    if (envelope.kind === 'state') {
      for (const listener of stateListeners) listener(envelope.state);
      return;
    }
    const operation = pending.get(envelope.operationId);
    if (!operation) return;
    if (envelope.kind === 'agent-event') {
      operation.events.push(envelope.event);
      return;
    }
    pending.delete(envelope.operationId);
    clearTimeout(operation.timeoutId);
    if (envelope.kind === 'turn-error') {
      operation.reject(new Error(envelope.message));
      return;
    }
    operation.resolve({
      events: operation.events,
      ...(envelope.result ? { result: envelope.result } : {}),
      ...(envelope.analysis ? { analysis: envelope.analysis } : {}),
    });
  };

  const postJson = async (path: string, body: unknown): Promise<void> => {
    const response = await fetchRequest(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await readResponseError(response));
  };

  const requestOperation = (
    path: string,
    body: Readonly<Record<string, unknown>>
  ): Promise<StreamStaffTurn> => {
    if (closed) return Promise.reject(new Error('Agent client is closed.'));
    ensureEventSource();
    const operationId = createOperationId();
    return new Promise<StreamStaffTurn>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pending.delete(operationId);
        reject(new Error('Agent operation timed out while waiting for SSE.'));
      }, operationTimeoutMs);
      pending.set(operationId, { events: [], resolve, reject, timeoutId });
      void postJson(path, { ...body, operationId }).catch((error: unknown) => {
        const operation = pending.get(operationId);
        if (!operation) return;
        pending.delete(operationId);
        clearTimeout(operation.timeoutId);
        operation.reject(toError(error));
      });
    });
  };

  return {
    async initialize() {
      if (closed) throw new Error('Agent client is closed.');
      const response = await fetchRequest('/api/state');
      if (!response.ok) throw new Error(await readResponseError(response));
      const state = (await response.json()) as StreamServerState;
      for (const listener of stateListeners) listener(state);
      ensureEventSource();
      return {
        backendSessionId: state.backendSessionId,
        resumed: state.resumed,
      };
    },
    analyzeComments(comments) {
      return requestOperation('/api/comments', {
        commentIds: comments.map((comment) => comment.id),
      });
    },
    createPostStreamReport() {
      return requestOperation('/api/report', {});
    },
    subscribeState(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    resolveApproval(requestId, decision) {
      return postJson('/api/approvals', { requestId, decision });
    },
    async interrupt() {
      const response = await fetchRequest('/api/interrupt', { method: 'POST' });
      if (!response.ok) throw new Error(await readResponseError(response));
    },
    reset() {
      return postJson('/api/reset', {});
    },
    async close() {
      if (closed) return;
      closed = true;
      eventSource?.close();
      eventSource = undefined;
      const error = new Error('Agent client was closed.');
      for (const operation of pending.values()) {
        clearTimeout(operation.timeoutId);
        operation.reject(error);
      }
      pending.clear();
      stateListeners.clear();
    },
  };
}

async function readResponseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { readonly error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Fall back to the HTTP status below.
  }
  return `Request failed with HTTP ${response.status}.`;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
