import { vi } from 'vitest';

// Mock WebSocket globally for tests
global.WebSocket = vi.fn(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
})) as any;

// WebSocket constants
Object.assign(WebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

// Mock window object for browser-specific code
// Note: No need to mock setTimeout/clearTimeout as vitest handles them
