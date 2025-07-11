import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isBrowserEnvironment,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  getStorageSize,
  cleanupOldData,
  debounce,
  throttle,
  createWorkerFunction,
  measurePerformance,
  asyncMeasurePerformance,
  createEventEmitter,
  generateId,
  isValidConfig,
} from '../src/utils/browserUtils.js';
import type { StorageData, ManneriConfig } from '../src/types/index.js';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
};
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

describe.skip('browserUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // Mock browser environment
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    // Mock Worker
    (global as unknown as { Worker: unknown }).Worker = vi
      .fn()
      .mockImplementation(() => ({}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isBrowserEnvironment', () => {
    it('should return true when window and localStorage are available', () => {
      expect(isBrowserEnvironment()).toBe(true);
    });

    it('should return false when window is not available', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });
      expect(isBrowserEnvironment()).toBe(false);
    });

    it('should return false when localStorage is not available', () => {
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });
      expect(isBrowserEnvironment()).toBe(false);
    });
  });

  describe('saveToLocalStorage', () => {
    const mockData: StorageData = {
      patterns: [],
      interventions: [],
      lastCleanup: Date.now(),
      version: '1.0.0',
    };

    it('should save data to localStorage', () => {
      localStorageMock.setItem.mockImplementation(() => {});

      const result = saveToLocalStorage(mockData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'manneri_data',
        expect.stringContaining('"version":"1.0.0"')
      );
    });

    it('should use custom storage key', () => {
      localStorageMock.setItem.mockImplementation(() => {});

      const result = saveToLocalStorage(mockData, 'custom_key');

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom_key',
        expect.any(String)
      );
    });

    it('should handle localStorage errors', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = saveToLocalStorage(mockData);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save manneri data to localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should return false in non-browser environment', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      const result = saveToLocalStorage(mockData);

      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('loadFromLocalStorage', () => {
    it('should load data from localStorage', () => {
      const storageData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: {
          patterns: [],
          interventions: [],
          lastCleanup: Date.now(),
          version: '1.0.0',
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storageData));

      const result = loadFromLocalStorage();

      expect(result).toEqual(storageData.data);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('manneri_data');
    });

    it('should return null when no data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = loadFromLocalStorage();

      expect(result).toBeNull();
    });

    it('should handle version mismatch', () => {
      const storageData = {
        version: '0.9.0', // Old version
        timestamp: Date.now(),
        data: {},
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storageData));
      localStorageMock.removeItem.mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = loadFromLocalStorage();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Manneri storage version mismatch, clearing data'
      );
      expect(localStorageMock.removeItem).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle JSON parse errors', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = loadFromLocalStorage();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load manneri data from localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clearLocalStorage', () => {
    it('should clear localStorage', () => {
      localStorageMock.removeItem.mockImplementation(() => {});

      const result = clearLocalStorage();

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('manneri_data');
    });

    it('should handle errors', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = clearLocalStorage();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getStorageSize', () => {
    it('should return storage size', () => {
      const mockData = '{"test":"data"}';
      localStorageMock.getItem.mockReturnValue(mockData);

      // Mock Blob constructor
      Object.defineProperty(global, 'Blob', {
        value: vi.fn().mockImplementation((content) => ({
          size: content[0].length,
        })),
        writable: true,
      });

      const size = getStorageSize();

      expect(size).toBe(mockData.length);
    });

    it('should return 0 when no data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const size = getStorageSize();

      expect(size).toBe(0);
    });

    it('should handle errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Access denied');
      });

      const size = getStorageSize();

      expect(size).toBe(0);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', (done) => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      // Call multiple times rapidly
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Should not be called immediately
      expect(mockFn).not.toHaveBeenCalled();

      // Should be called once after delay
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });

    it('should support immediate execution', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100, true);

      debouncedFn();

      // Should be called immediately
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Subsequent calls should be debounced
      debouncedFn();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', (done) => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      // Call multiple times rapidly
      throttledFn();
      throttledFn();
      throttledFn();

      // Should be called once immediately
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Should allow another call after limit
      setTimeout(() => {
        throttledFn();
        expect(mockFn).toHaveBeenCalledTimes(2);
        done();
      }, 150);
    });
  });

  describe('createWorkerFunction', () => {
    it('should return null in non-browser environment', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      const worker = createWorkerFunction(() => {
        console.log('test');
      });

      expect(worker).toBeNull();
    });

    it('should return null when Worker is not available', () => {
      (global as unknown as { Worker: unknown }).Worker = undefined;

      const worker = createWorkerFunction(() => {
        console.log('test');
      });

      expect(worker).toBeNull();
    });

    it('should handle worker creation errors', () => {
      (global as unknown as { Worker: unknown }).Worker = vi
        .fn()
        .mockImplementation(() => {
          throw new Error('Worker creation failed');
        });
      (global as unknown as { URL: unknown }).URL = {
        createObjectURL: vi.fn(() => 'blob:url'),
        revokeObjectURL: vi.fn(),
      };
      (global as unknown as { Blob: unknown }).Blob = vi.fn();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const worker = createWorkerFunction(() => {
        console.log('test');
      });

      expect(worker).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create worker:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('measurePerformance', () => {
    it('should measure performance of synchronous function', () => {
      mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const testFn = vi.fn(() => 'result');
      const result = measurePerformance('test', testFn);

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();
    });

    it('should log performance when enabled', () => {
      mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(100);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const testFn = () => 'result';
      measurePerformance('test', testFn, true);

      expect(consoleSpy).toHaveBeenCalledWith('[Manneri] test: 100.00ms');

      consoleSpy.mockRestore();
    });
  });

  describe('asyncMeasurePerformance', () => {
    it('should measure performance of async function', async () => {
      mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const testFn = vi.fn(async () => 'result');
      const result = await asyncMeasurePerformance('test', testFn);

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();
    });

    it('should log performance when enabled', async () => {
      mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(100);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const testFn = async () => 'result';
      await asyncMeasurePerformance('test', testFn, true);

      expect(consoleSpy).toHaveBeenCalledWith('[Manneri] test: 100.00ms');

      consoleSpy.mockRestore();
    });
  });

  describe('createEventEmitter', () => {
    it('should create event emitter with basic functionality', () => {
      const emitter = createEventEmitter<{ test: string; data: number }>();
      const testListener = vi.fn();

      emitter.on('test', testListener);
      emitter.emit('test', 'hello');

      expect(testListener).toHaveBeenCalledWith('hello');
    });

    it('should support multiple listeners', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.on('test', listener1);
      emitter.on('test', listener2);
      emitter.emit('test', 'hello');

      expect(listener1).toHaveBeenCalledWith('hello');
      expect(listener2).toHaveBeenCalledWith('hello');
    });

    it('should remove listeners', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const listener = vi.fn();

      emitter.on('test', listener);
      emitter.off('test', listener);
      emitter.emit('test', 'hello');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove all listeners', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const listener = vi.fn();

      emitter.on('test', listener);
      emitter.removeAllListeners();
      emitter.emit('test', 'hello');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      emitter.on('test', () => {
        throw new Error('Listener error');
      });

      emitter.emit('test', 'hello');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in event listener for test:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
      expect(id2.length).toBeGreaterThan(0);
    });

    it('should generate IDs of reasonable length', () => {
      const id = generateId();
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(50);
    });
  });

  describe('isValidConfig', () => {
    const validConfig: ManneriConfig = {
      similarityThreshold: 0.7,
      repetitionLimit: 2,
      lookbackWindow: 10,
      interventionCooldown: 1000,
      minMessageLength: 10,
      excludeKeywords: ['test'],
      enableTopicTracking: true,
      enableKeywordAnalysis: true,
      debugMode: false,
      enableAiPromptGeneration: false,
      aiPromptGenerationProvider: 'default',
      language: 'ja',
    };

    it('should validate correct config', () => {
      expect(isValidConfig(validConfig)).toBe(true);
    });

    it('should reject null and undefined', () => {
      expect(isValidConfig(null)).toBe(false);
      expect(isValidConfig(undefined)).toBe(false);
    });

    it('should reject non-object values', () => {
      expect(isValidConfig('string')).toBe(false);
      expect(isValidConfig(123)).toBe(false);
      expect(isValidConfig(true)).toBe(false);
    });

    it('should reject config with wrong property types', () => {
      const invalidConfig = {
        ...validConfig,
        similarityThreshold: 'invalid', // Should be number
      };

      expect(isValidConfig(invalidConfig)).toBe(false);
    });

    it('should reject config with missing properties', () => {
      const incompleteConfig = {
        similarityThreshold: 0.7,
        // Missing required properties
      };

      expect(isValidConfig(incompleteConfig)).toBe(false);
    });

    it('should reject config with non-array excludeKeywords', () => {
      const invalidConfig = {
        ...validConfig,
        excludeKeywords: 'not-an-array',
      };

      expect(isValidConfig(invalidConfig)).toBe(false);
    });
  });
});
