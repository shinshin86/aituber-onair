import {
  BushitsuTransportReadyState,
  type BushitsuTransport,
  type BushitsuTransportHandlers,
  type BushitsuTransportCloseEvent,
  type BushitsuTransportMessageEvent,
  mapReadyState,
} from '../core/transport';

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener?: (type: string, listener: (...args: any[]) => void) => void;
  removeEventListener?: (
    type: string,
    listener: (...args: any[]) => void,
  ) => void;
  on?: (type: string, listener: (...args: any[]) => void) => void;
  off?: (type: string, listener: (...args: any[]) => void) => void;
  removeListener?: (type: string, listener: (...args: any[]) => void) => void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

type ListenerCleanup = () => void;

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error ?? 'Unknown WebSocket error'));
};

const bytesToString = (bytes: Uint8Array): string => {
  if (bytes.length === 0) {
    return '';
  }

  if (bytes.length <= 8192) {
    return String.fromCharCode(...bytes);
  }

  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    const chunk = bytes.subarray(i, i + 8192);
    result += String.fromCharCode(...chunk);
  }
  return result;
};

const normalizeMessageEvent = (
  value: unknown,
): BushitsuTransportMessageEvent => {
  if (value && typeof value === 'object' && 'data' in value) {
    const data = (value as { data: unknown }).data;
    return { data: normalizeMessageData(data) };
  }

  return { data: normalizeMessageData(value) };
};

const normalizeMessageData = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return bytesToString(new Uint8Array(value));
  }

  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return bytesToString(
      new Uint8Array(view.buffer, view.byteOffset, view.byteLength),
    );
  }

  if (
    value &&
    typeof (value as { toString: () => string }).toString === 'function'
  ) {
    return (value as { toString: () => string }).toString();
  }

  if (value == null) {
    return '';
  }

  return String(value);
};

const normalizeCloseEvent = (
  eventOrCode: unknown,
  maybeReason?: unknown,
): BushitsuTransportCloseEvent => {
  if (eventOrCode && typeof eventOrCode === 'object' && 'code' in eventOrCode) {
    const event = eventOrCode as {
      code?: number;
      reason?: string;
      wasClean?: boolean;
    };
    return {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    };
  }

  const code = typeof eventOrCode === 'number' ? eventOrCode : undefined;

  let reason: string | undefined;
  if (typeof maybeReason === 'string') {
    reason = maybeReason;
  } else if (
    maybeReason &&
    typeof (maybeReason as { toString: () => string }).toString === 'function'
  ) {
    reason = (maybeReason as { toString: () => string }).toString();
  }

  return {
    code,
    reason,
    wasClean: code === 1000,
  };
};

const addListener = (
  socket: WebSocketLike,
  event: 'open' | 'message' | 'close' | 'error',
  listener: (...args: any[]) => void,
): ListenerCleanup => {
  if (
    'addEventListener' in socket &&
    typeof socket.addEventListener === 'function' &&
    socket.removeEventListener
  ) {
    socket.addEventListener(event, listener);
    return () => {
      socket.removeEventListener?.(event, listener);
    };
  }

  if ('on' in socket && typeof socket.on === 'function') {
    const emitter = socket as unknown as {
      on: (event: string, handler: (...args: any[]) => void) => void;
      off?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (
        event: string,
        handler: (...args: any[]) => void,
      ) => void;
    };

    emitter.on(event, listener);

    return () => {
      if (emitter.off) {
        emitter.off(event, listener);
      } else if (emitter.removeListener) {
        emitter.removeListener(event, listener);
      }
    };
  }

  throw new Error(
    'Unsupported WebSocket implementation: missing event listener methods',
  );
};

class WebSocketTransport implements BushitsuTransport {
  private ws: WebSocketLike | null = null;
  private cleanup: ListenerCleanup[] = [];

  constructor(private readonly factory: WebSocketFactory) {}

  async connect(
    url: string,
    handlers: BushitsuTransportHandlers,
  ): Promise<void> {
    this.disconnect();

    try {
      this.ws = this.factory(url);
    } catch (error) {
      throw toError(error);
    }

    if (!this.ws) {
      throw new Error('WebSocket factory returned null or undefined');
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const resolveOnce = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };

      const rejectOnce = (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(toError(error));
      };

      const handleOpen = () => {
        handlers.onOpen?.();
        resolveOnce();
      };

      const handleMessage = (...args: any[]) => {
        handlers.onMessage?.(normalizeMessageEvent(args[0]));
      };

      const handleClose = (...args: any[]) => {
        const event = normalizeCloseEvent(args[0], args[1]);
        handlers.onClose?.(event);

        if (!settled) {
          rejectOnce(
            new Error('WebSocket connection closed before it was established'),
          );
        }

        this.cleanupListeners();
        this.ws = null;
      };

      const handleError = (error: unknown) => {
        handlers.onError?.(error);
        rejectOnce(error);
      };

      this.cleanup.push(
        addListener(this.ws as WebSocketLike, 'open', handleOpen),
      );
      this.cleanup.push(
        addListener(this.ws as WebSocketLike, 'message', handleMessage),
      );
      this.cleanup.push(
        addListener(this.ws as WebSocketLike, 'close', handleClose),
      );
      this.cleanup.push(
        addListener(this.ws as WebSocketLike, 'error', handleError),
      );
    });
  }

  send(data: string): void {
    if (!this.ws) {
      throw new Error('WebSocket connection is not established');
    }

    this.ws.send(data);
  }

  disconnect(code?: number, reason?: string): void {
    if (this.ws) {
      try {
        this.ws.close(code, reason);
      } catch (error) {
        console.error('[BushitsuTransport] Failed to close WebSocket:', error);
      }
    }

    this.cleanupListeners();
    this.ws = null;
  }

  getReadyState(): BushitsuTransportReadyState {
    return mapReadyState(this.ws?.readyState);
  }

  private cleanupListeners() {
    while (this.cleanup.length > 0) {
      const dispose = this.cleanup.pop();
      try {
        dispose?.();
      } catch (error) {
        console.error('[BushitsuTransport] Listener cleanup failed:', error);
      }
    }
  }
}

export const createWebSocketTransport = (
  factory: WebSocketFactory,
): BushitsuTransport => {
  return new WebSocketTransport(factory);
};

export const createBrowserWebSocketTransport = (): BushitsuTransport => {
  const WebSocketImpl = (
    globalThis as { WebSocket?: new (url: string) => WebSocketLike }
  ).WebSocket;

  if (!WebSocketImpl) {
    throw new Error(
      'WebSocket implementation not found. Provide a transport via dependencies.',
    );
  }

  return createWebSocketTransport((url) => new WebSocketImpl(url));
};
