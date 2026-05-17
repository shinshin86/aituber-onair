import { vi, beforeEach, afterEach } from 'vitest';

// Mock for fetch API
global.fetch = vi.fn();

if (typeof global.ReadableStream === 'undefined') {
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
}

if (typeof global.TextDecoder === 'undefined') {
  // Mock for TextDecoder
  global.TextDecoder = vi.fn().mockImplementation(() => ({
    decode: vi.fn(() => ''),
  }));
}

if (typeof global.TextEncoder === 'undefined') {
  // Mock for TextEncoder
  global.TextEncoder = vi.fn().mockImplementation(() => ({
    encode: vi.fn(() => new Uint8Array()),
  }));
}

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clear all mocks after each test to prevent memory leaks
afterEach(() => {
  vi.clearAllMocks();
});
