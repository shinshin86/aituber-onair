/**
 * WebSocket chat message types
 */
export interface BushitsuMessage {
  type: 'chat' | 'user_event' | 'system';
  room: string;
  timestamp: string;
  data: {
    from: string;
    fromId?: string; // Session ID (for chat type)
    text?: string;
    mention?: string[];
    event?: string; // user_event type
    user?: string; // user_event type
    details?: any; // system type
  };
}

/**
 * Bushitsu client options
 */
export interface BushitsuClientOptions {
  serverUrl: string;
  room: string;
  userName: string;
  onReceiveMessage: (
    text: string,
    userName: string,
    isMention: boolean,
  ) => void;
  onConnectionChange?: (connected: boolean) => void;
}
