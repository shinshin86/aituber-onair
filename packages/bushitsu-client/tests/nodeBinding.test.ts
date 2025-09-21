import { describe, it, expect } from 'vitest';
import { createNodeBushitsuClient } from '../src/node';
import type { BushitsuMessage } from '../src/client/types';

describe('createNodeBushitsuClient', () => {
  it('creates a client that connects and receives messages', async () => {
    const received: string[] = [];

    const client = createNodeBushitsuClient({
      serverUrl: 'http://localhost:8080',
      room: 'test-room',
      userName: 'tester',
      onReceiveMessage: (text) => {
        received.push(text);
      },
      webSocketImpl: MockWebSocket as unknown as typeof WebSocket,
    });

    await client.connect();

    expect(client.getConnectionStatus()).toBe(true);

    const payload: BushitsuMessage = {
      type: 'chat',
      room: 'test-room',
      timestamp: new Date().toISOString(),
      data: {
        from: 'another-user',
        text: 'hello from ws',
        mention: [],
      },
    };

    MockWebSocket.emitMessage(JSON.stringify(payload));

    expect(received).toContain('hello from ws');

    client.disconnect();
  });

  it('allows sending messages without throwing', async () => {
    const client = createNodeBushitsuClient({
      serverUrl: 'http://localhost:8080',
      room: 'test-room',
      userName: 'tester',
      onReceiveMessage: () => {},
      webSocketImpl: MockWebSocket as unknown as typeof WebSocket,
    });

    await client.connect();
    expect(() => client.sendMessage('some message')).not.toThrow();
    client.disconnect();
  });
});

class MockWebSocket {
  static latestInstance: MockWebSocket | null = null;

  readonly listeners: Record<string, ((...args: any[]) => void)[]> = {
    open: [],
    message: [],
    close: [],
    error: [],
  };

  readyState = 0;

  constructor(public readonly url: string) {
    MockWebSocket.latestInstance = this;

    setTimeout(() => {
      this.readyState = 1;
      this.dispatch('open');
    }, 0);
  }

  static emitMessage(data: string) {
    MockWebSocket.latestInstance?.dispatch('message', { data });
  }

  addEventListener(event: string, listener: (...args: any[]) => void) {
    this.listeners[event]?.push(listener);
  }

  removeEventListener(event: string, listener: (...args: any[]) => void) {
    const eventListeners = this.listeners[event];
    if (!eventListeners) {
      return;
    }
    this.listeners[event] = eventListeners.filter(
      (existing) => existing !== listener,
    );
  }

  send(_data: string) {}

  close() {
    this.readyState = 3;
    this.dispatch('close', { code: 1000, reason: '', wasClean: true });
  }

  private dispatch(event: string, payload?: unknown) {
    const eventListeners = this.listeners[event];
    if (!eventListeners) {
      return;
    }
    for (const listener of eventListeners) {
      listener(payload);
    }
  }
}
