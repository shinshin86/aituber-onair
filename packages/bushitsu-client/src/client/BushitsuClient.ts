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

export class BushitsuClient {
  private ws: WebSocket | null = null;
  private options: BushitsuClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = WEBSOCKET_MAX_RECONNECT_ATTEMPTS;
  private reconnectTimer: number | null = null;
  private isConnected = false;
  private sessionId: string | null = null; // Own session ID

  constructor(options: BushitsuClientOptions) {
    this.options = options;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Clean up existing connection first
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }

        // Format URL properly
        const baseUrl = this.options.serverUrl.replace(/^http/, 'ws');
        const wsUrl = `${baseUrl}/ws?room=${encodeURIComponent(
          this.options.room,
        )}&name=${encodeURIComponent(this.options.userName)}`;

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error('[BushitsuClient] Connection timeout');
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
          }
          this.isConnected = false;
          this.options.onConnectionChange?.(false);
          reject(new Error('Connection timeout'));
        }, WEBSOCKET_CONNECTION_TIMEOUT);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.options.onConnectionChange?.(true);
          resolve();
        };

        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = (error) => {
          console.error('[BushitsuClient] WebSocket error:', error);
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.options.onConnectionChange?.(false);
          reject(error);
        };
      } catch (error) {
        console.error(
          '[BushitsuClient] Failed to create WebSocket connection:',
          error,
        );
        this.isConnected = false;
        this.options.onConnectionChange?.(false);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent) {
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      console.error('WebSocket state:', this.ws?.readyState);
      console.error('Connection states:', {
        CONNECTING: WebSocket.CONNECTING,
        OPEN: WebSocket.OPEN,
        CLOSING: WebSocket.CLOSING,
        CLOSED: WebSocket.CLOSED,
      });
      return;
    }

    try {
      const message = {
        type: 'chat',
        text: mentionTo ? `@${mentionTo} ${text}` : text,
      };

      this.ws.send(JSON.stringify(message));
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
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
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

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.sessionId = null; // Reset session ID
    this.options.onConnectionChange?.(false);
  }

  /**
   * Handle connection close (including reconnection)
   */
  private handleClose(event: CloseEvent) {
    this.ws = null;
    this.isConnected = false;
    this.sessionId = null; // Reset session ID
    this.options.onConnectionChange?.(false);

    // Only attempt reconnection if not a normal closure
    if (
      event.code !== 1000 && // Normal closure
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.reconnectAttempts++;

      const reconnectDelay = Math.min(
        3000 * this.reconnectAttempts,
        WEBSOCKET_MAX_RECONNECT_DELAY,
      );
      this.reconnectTimer = window.setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, reconnectDelay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
    }
  }
}
