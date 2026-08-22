import type { WsMessage } from '../types.js';

export type WsStatus = 'connecting' | 'open' | 'closed';

/**
 * Resilient WebSocket client to the tarot MCP server.
 * The page is normally served from the same host as the MCP server
 * (ports 3002 page / 3001 ws), so we derive the host from location.
 */
export class TarotClient {
  private ws: WebSocket | null = null;
  private closedByUser = false;
  private retryDelay = 1000;
  status: WsStatus = 'connecting';

  constructor(
    private onMessage: (m: WsMessage) => void,
    private onStatus: (s: WsStatus) => void
  ) {}

  private url(): string {
    const host = location.hostname || 'localhost';
    const port = new URLSearchParams(location.search).get('wsport') || '3001';
    return `ws://${host}:${port}/ws/tarot`;
  }

  connect(): void {
    this.closedByUser = false;
    this.onStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url());
    } catch (e) {
      console.error('[tarot-viewer] WS construct failed', e);
      this.onStatus('closed');
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retryDelay = 1000;
      this.onStatus('open');
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as WsMessage;
        if (msg && typeof msg === 'object' && 'type' in msg) this.onMessage(msg);
      } catch (e) {
        console.warn('[tarot-viewer] bad ws frame', e);
      }
    };
    ws.onclose = () => {
      this.onStatus('closed');
      if (!this.closedByUser) this.scheduleReconnect();
    };
    ws.onerror = () => {
      // onclose follows
    };
  }

  private scheduleReconnect(): void {
    const delay = this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 1.7, 15000);
    setTimeout(() => {
      if (!this.closedByUser) this.connect();
    }, delay);
  }

  close(): void {
    this.closedByUser = true;
    this.ws?.close();
  }
}
