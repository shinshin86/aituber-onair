export enum BushitsuTransportReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export interface BushitsuTransportMessageEvent {
  data: string;
}

export interface BushitsuTransportCloseEvent {
  code?: number;
  reason?: string;
  wasClean?: boolean;
}

export interface BushitsuTransportHandlers {
  onOpen?: () => void;
  onMessage?: (event: BushitsuTransportMessageEvent) => void;
  onClose?: (event: BushitsuTransportCloseEvent) => void;
  onError?: (error: unknown) => void;
}

export interface BushitsuTransport {
  connect(url: string, handlers: BushitsuTransportHandlers): Promise<void>;
  send(data: string): Promise<void> | void;
  disconnect(code?: number, reason?: string): void;
  getReadyState(): BushitsuTransportReadyState;
}

export const mapReadyState = (
  readyState: number | undefined,
): BushitsuTransportReadyState => {
  switch (readyState) {
    case BushitsuTransportReadyState.CONNECTING:
      return BushitsuTransportReadyState.CONNECTING;
    case BushitsuTransportReadyState.OPEN:
      return BushitsuTransportReadyState.OPEN;
    case BushitsuTransportReadyState.CLOSING:
      return BushitsuTransportReadyState.CLOSING;
    default:
      return BushitsuTransportReadyState.CLOSED;
  }
};
