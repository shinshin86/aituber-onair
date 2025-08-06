import { vi, beforeEach, afterEach } from 'vitest';

// Mock for fetch API
global.fetch = vi.fn();

// Mock for ReadableStream (simplified)
// @ts-ignore
global.ReadableStream = class MockReadableStream {
  getReader() {
    return {
      read: vi.fn(() => Promise.resolve({ done: true })),
      releaseLock: vi.fn(),
    };
  }
};

// Mock for TextDecoder
global.TextDecoder = vi.fn().mockImplementation(() => ({
  decode: vi.fn(() => ''),
}));

// Mock for TextEncoder
global.TextEncoder = vi.fn().mockImplementation(() => ({
  encode: vi.fn(() => new Uint8Array()),
}));

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clear all mocks after each test to prevent memory leaks
afterEach(() => {
  vi.clearAllMocks();
});
