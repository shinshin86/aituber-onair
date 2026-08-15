import type { AgentEvent, AgentRunResult } from '@aituber-onair/agent';
import type {
  ChannelStrategyServerState,
  ChannelStrategySseEnvelope,
} from './protocol';

interface EventSourceLike {
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  close(): void;
}

/**
 * The dashboard only observes. Turns are started by the host scheduler, so
 * every subscriber receives Agent Events regardless of who asked for the Turn.
 */
export interface ChannelStrategyRuntime {
  initialize(): Promise<ChannelStrategyServerState>;
  requestStrategy(): Promise<void>;
  interruptStrategy(): Promise<void>;
  subscribeState(
    listener: (state: ChannelStrategyServerState) => void
  ): () => void;
  subscribeAgentEvents(listener: (event: AgentEvent) => void): () => void;
  subscribeTurnResult(listener: (result: AgentRunResult) => void): () => void;
  subscribeTurnError(listener: (message: string) => void): () => void;
  close(): void;
}

export function createChannelStrategyRuntime(
  options: {
    readonly fetch?: typeof fetch;
    readonly createEventSource?: (url: string) => EventSourceLike;
  } = {}
): ChannelStrategyRuntime {
  const fetchRequest = options.fetch ?? fetch.bind(globalThis);
  const createEventSource =
    options.createEventSource ?? ((url: string) => new EventSource(url));
  const stateListeners = new Set<(state: ChannelStrategyServerState) => void>();
  const eventListeners = new Set<(event: AgentEvent) => void>();
  const resultListeners = new Set<(result: AgentRunResult) => void>();
  const errorListeners = new Set<(message: string) => void>();
  let source: EventSourceLike | undefined;
  let closed = false;

  const ensureEvents = (): void => {
    if (source || closed) return;
    const eventSource = createEventSource('/api/events');
    eventSource.onmessage = (event) => {
      let envelope: ChannelStrategySseEnvelope;
      try {
        envelope = JSON.parse(event.data) as ChannelStrategySseEnvelope;
      } catch {
        return;
      }
      switch (envelope.kind) {
        case 'state':
          for (const listener of stateListeners) listener(envelope.state);
          return;
        case 'agent-event':
          for (const listener of eventListeners) listener(envelope.event);
          return;
        case 'operation-completed':
          for (const listener of resultListeners) listener(envelope.result);
          return;
        case 'turn-error':
          for (const listener of errorListeners) listener(envelope.message);
          return;
        default:
          return;
      }
    };
    eventSource.onerror = () => {
      // EventSource reconnects automatically and sends Last-Event-ID.
    };
    source = eventSource;
  };

  const subscribe = <T>(registry: Set<T>, listener: T): (() => void) => {
    registry.add(listener);
    return () => {
      registry.delete(listener);
    };
  };

  return {
    async initialize() {
      if (closed) throw new Error('Agent client is closed.');
      const response = await fetchRequest('/api/state');
      if (!response.ok) throw new Error(await readResponseError(response));
      const state = (await response.json()) as ChannelStrategyServerState;
      ensureEvents();
      for (const listener of stateListeners) listener(state);
      return state;
    },
    async requestStrategy() {
      if (closed) throw new Error('Agent client is closed.');
      ensureEvents();
      const response = await fetchRequest('/api/strategy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw new Error(await readResponseError(response));
    },
    async interruptStrategy() {
      if (closed) throw new Error('Agent client is closed.');
      const response = await fetchRequest('/api/interrupt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw new Error(await readResponseError(response));
    },
    subscribeState: (listener) => subscribe(stateListeners, listener),
    subscribeAgentEvents: (listener) => subscribe(eventListeners, listener),
    subscribeTurnResult: (listener) => subscribe(resultListeners, listener),
    subscribeTurnError: (listener) => subscribe(errorListeners, listener),
    close() {
      if (closed) return;
      closed = true;
      source?.close();
      source = undefined;
      stateListeners.clear();
      eventListeners.clear();
      resultListeners.clear();
      errorListeners.clear();
    },
  };
}

async function readResponseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { readonly error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Fall back to the status below.
  }
  return `Request failed with HTTP ${response.status}.`;
}
