// WebSocket connection constants
export const WEBSOCKET_CONNECTION_TIMEOUT = 10000;
export const WEBSOCKET_MAX_RECONNECT_ATTEMPTS = 5;
export const WEBSOCKET_MAX_RECONNECT_DELAY = 15000; // Maximum 15 seconds

// Rate limiting constants
export const WEBSOCKET_RATE_LIMIT_WINDOW = 60000; // 1 minute
export const WEBSOCKET_RATE_LIMIT_MAX_MESSAGES = 30; // Maximum 30 messages per minute

// Message deduplication constants
export const WEBSOCKET_MESSAGE_DEDUP_WINDOW = 10000; // 10 seconds
export const WEBSOCKET_MESSAGE_DEDUP_MAX_SIZE = 100; // Maximum 100 items retained

// Default values
export const DEFAULT_WEBSOCKET_SERVER_URL = 'ws://localhost:8080';
export const DEFAULT_WEBSOCKET_ROOM = 'lobby';
export const DEFAULT_WEBSOCKET_USER_NAME = 'User';
