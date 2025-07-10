import { vi, beforeEach } from 'vitest';

// Mock for LocalStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock for Performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
});

// Mock for Worker
Object.defineProperty(window, 'Worker', {
  value: vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    postMessage: vi.fn(),
    terminate: vi.fn(),
  })),
});

// Mock for URL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

// Mock for Blob
Object.defineProperty(window, 'Blob', {
  value: vi.fn().mockImplementation((content, options) => ({
    size: content?.[0]?.length || 0,
    type: options?.type || '',
  })),
});

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
