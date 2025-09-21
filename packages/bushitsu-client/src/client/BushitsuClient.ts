/**
 * Bushitsu WebSocket Chat Client
 * A WebSocket chat room client for real-time communication
 */

import type { BushitsuMessage, BushitsuClientOptions } from './types';
import {
  WEBSOCKET_CONNECTION_TIMEOUT,
  WEBSOCKET_MAX_RECONNECT_ATTEMPTS,
  WEBSOCKET_MAX_RECONNECT_DELAY,
} from './constants';
import {
  BushitsuTransportReadyState,
  type BushitsuTransport,
  type BushitsuTransportCloseEvent,
  type BushitsuTransportMessageEvent,
} from '../core/transport';
import { createBrowserWebSocketTransport } from '../transports/webSocketTransport';

interface BushitsuClientDependencies {
  transport?: BushitsuTransport;
}

export class BushitsuClient {
  private readonly options: BushitsuClientOptions;
  private readonly transport: BushitsuTransport;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = WEBSOCKET_MAX_RECONNECT_ATTEMPTS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;
  private sessionId: string | null = null; // Own session ID

  constructor(
    options: BushitsuClientOptions,
    dependencies: BushitsuClientDependencies = {},
  ) {
    this.options = options;
    this.transport =
      dependencies.transport ?? createBrowserWebSocketTransport();
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Clean up any existing connection before creating a new one
        this.transport.disconnect();

        const baseUrl = this.options.serverUrl.replace(/^http/, 'ws');
        const wsUrl = `${baseUrl}/ws?room=${encodeURIComponent(
          this.options.room,
        )}&name=${encodeURIComponent(this.options.userName)}`;

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error('[BushitsuClient] Connection timeout');
          this.transport.disconnect();
          this.isConnected = false;
          this.options.onConnectionChange?.(false);
          reject(new Error('Connection timeout'));
        }, WEBSOCKET_CONNECTION_TIMEOUT);

        this.transport
          .connect(wsUrl, {
            onOpen: () => {
              clearTimeout(connectionTimeout);
              this.isConnected = true;
              this.reconnectAttempts = 0;
              this.options.onConnectionChange?.(true);
              resolve();
            },
            onMessage: (event) => {
              this.handleMessage(event);
            },
            onClose: (event) => {
              clearTimeout(connectionTimeout);
              this.handleClose(event);
            },
            onError: (error) => {
              console.error('[BushitsuClient] WebSocket error:', error);
              this.isConnected = false;
              this.options.onConnectionChange?.(false);
            },
          })
          .catch((error) => {
            clearTimeout(connectionTimeout);
            console.error(
              '[BushitsuClient] Failed to create WebSocket connection:',
              error,
            );
            this.isConnected = false;
            this.options.onConnectionChange?.(false);
            reject(error);
          });
      } catch (error) {
        console.error(
          '[BushitsuClient] Failed to start WebSocket connection:',
          error,
        );
        this.isConnected = false;
        this.options.onConnectionChange?.(false);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: BushitsuTransportMessageEvent) {
    try {
      const message: BushitsuMessage = JSON.parse(event.data);

      if (message.type === 'chat') {
        const { from, fromId, text, mention } = message.data;

        // Skip messages without text
        if (!text) {
          console.warn('[BushitsuClient] Received chat message without text');
          return;
        }

        // Skip own messages immediately
        if (from === this.options.userName) {
          // Store session ID if not yet obtained
          if (!this.sessionId && fromId) {
            this.sessionId = fromId;
          }
          return;
        }

        // Double-check with session ID
        if (fromId && this.sessionId && fromId === this.sessionId) {
          return;
        }

        // Check if mentioned
        const isMention = mention?.includes(this.options.userName) || false;

        // Process broadcast messages or mentions to self
        if (!mention || mention.length === 0 || isMention) {
          this.options.onReceiveMessage(text, from, isMention);
        }
      } else if (message.type === 'user_event') {
        // Handle user join/leave events
        const { event, user, fromId } = message.data;
        if (
          event === 'join' &&
          user === this.options.userName &&
          fromId &&
          !this.sessionId
        ) {
          this.sessionId = fromId;
        }
      } else if (message.type === 'system') {
        // Handle system messages as needed
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Send message (broadcast or mention)
   */
  sendMessage(text: string, mentionTo?: string): void {
    if (this.transport.getReadyState() !== BushitsuTransportReadyState.OPEN) {
      console.error('WebSocket is not connected');
      console.error('WebSocket state:', this.transport.getReadyState());
      console.error('Connection states:', {
        CONNECTING: BushitsuTransportReadyState.CONNECTING,
        OPEN: BushitsuTransportReadyState.OPEN,
        CLOSING: BushitsuTransportReadyState.CLOSING,
        CLOSED: BushitsuTransportReadyState.CLOSED,
      });
      return;
    }

    try {
      const message = {
        type: 'chat',
        text: mentionTo ? `@${mentionTo} ${text}` : text,
      };

      this.transport.send(JSON.stringify(message));
    } catch (error) {
      console.error(
        '[BushitsuClient] Failed to send WebSocket message:',
        error,
      );
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return (
      this.isConnected &&
      this.transport.getReadyState() === BushitsuTransportReadyState.OPEN
    );
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.transport.disconnect();

    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.sessionId = null; // Reset session ID
    this.options.onConnectionChange?.(false);
  }

  /**
   * Handle connection close (including reconnection)
   */
  private handleClose(event: BushitsuTransportCloseEvent) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isConnected = false;
    this.sessionId = null; // Reset session ID
    this.options.onConnectionChange?.(false);

    const closeCode = event.code ?? 0;

    // Only attempt reconnection if not a normal closure
    if (
      closeCode !== 1000 &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.reconnectAttempts++;

      const reconnectDelay = Math.min(
        3000 * this.reconnectAttempts,
        WEBSOCKET_MAX_RECONNECT_DELAY,
      );
      this.reconnectTimer = setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, reconnectDelay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
    }
  }
}
