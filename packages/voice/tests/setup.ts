import { vi } from 'vitest';

// Mock HTMLAudioElement for browser-based voice engines
Object.defineProperty(global, 'HTMLAudioElement', {
  value: vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    load: vi.fn(),
    src: '',
    currentTime: 0,
    duration: 0,
    paused: true,
    volume: 1,
  })),
});

// Mock document.createElement for audio elements
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockImplementation((tagName: string) => {
      if (tagName === 'audio') {
        return {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          play: vi.fn(),
          pause: vi.fn(),
          load: vi.fn(),
          src: '',
          currentTime: 0,
          duration: 0,
          paused: true,
          volume: 1,
        };
      }
      return {};
    }),
  },
  writable: true,
});

// Mock window for browser environment checks
Object.defineProperty(global, 'window', {
  value: {
    document: global.document,
  },
  writable: true,
});
