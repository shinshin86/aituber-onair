import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LocalStoragePersistenceProvider } from '../src/persistence/LocalStoragePersistenceProvider.js';
import type { StorageData, ConversationPattern } from '../src/types/index.js';

// Mock browser utils
vi.mock('../src/utils/browserUtils.js', () => ({
  isBrowserEnvironment: vi.fn(() => true),
  saveToLocalStorage: vi.fn(),
  loadFromLocalStorage: vi.fn(),
  clearLocalStorage: vi.fn(),
  cleanupOldData: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('LocalStoragePersistenceProvider', () => {
  let provider: LocalStoragePersistenceProvider;
  let mockBrowserUtils: any;

  const mockStorageData: StorageData = {
    patterns: [
      {
        id: 'pattern1',
        pattern: 'test pattern',
        frequency: 2,
        firstSeen: Date.now() - 1000,
        lastSeen: Date.now(),
        messages: [],
      } as ConversationPattern,
      {
        id: 'pattern2',
        pattern: 'old pattern',
        frequency: 1,
        firstSeen: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        lastSeen: Date.now() - 25 * 60 * 60 * 1000,
        messages: [],
      } as ConversationPattern,
    ],
    interventions: [
      Date.now() - 1000,
      Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    ],
    lastCleanup: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
    version: '1.0.0',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();

    // Import mocked browserUtils
    mockBrowserUtils = await import('../src/utils/browserUtils.js');

    provider = new LocalStoragePersistenceProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(provider).toBeDefined();
    });

    it('should accept custom storage key and version', () => {
      const customProvider = new LocalStoragePersistenceProvider({
        storageKey: 'custom_key',
        version: '2.0.0',
      });

      expect(customProvider).toBeDefined();
    });
  });

  describe('save', () => {
    it('should save data when browser environment is available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.saveToLocalStorage.mockReturnValue(true);

      const result = provider.save(mockStorageData);

      expect(result).toBe(true);
      expect(mockBrowserUtils.saveToLocalStorage).toHaveBeenCalledWith(
        mockStorageData,
        'manneri_data'
      );
    });

    it('should return false when browser environment is not available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = provider.save(mockStorageData);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'LocalStoragePersistenceProvider: localStorage not available'
      );
      expect(mockBrowserUtils.saveToLocalStorage).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should use custom storage key', () => {
      const customProvider = new LocalStoragePersistenceProvider({
        storageKey: 'custom_key',
      });

      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.saveToLocalStorage.mockReturnValue(true);

      customProvider.save(mockStorageData);

      expect(mockBrowserUtils.saveToLocalStorage).toHaveBeenCalledWith(
        mockStorageData,
        'custom_key'
      );
    });
  });

  describe('load', () => {
    it('should load data when browser environment is available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.loadFromLocalStorage.mockReturnValue(mockStorageData);

      const result = provider.load();

      expect(result).toEqual(mockStorageData);
      expect(mockBrowserUtils.loadFromLocalStorage).toHaveBeenCalledWith(
        'manneri_data'
      );
    });

    it('should return null when browser environment is not available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = provider.load();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'LocalStoragePersistenceProvider: localStorage not available'
      );
      expect(mockBrowserUtils.loadFromLocalStorage).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should return null when no data exists', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.loadFromLocalStorage.mockReturnValue(null);

      const result = provider.load();

      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear data when browser environment is available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.clearLocalStorage.mockReturnValue(true);

      const result = provider.clear();

      expect(result).toBe(true);
      expect(mockBrowserUtils.clearLocalStorage).toHaveBeenCalledWith(
        'manneri_data'
      );
    });

    it('should return false when browser environment is not available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = provider.clear();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'LocalStoragePersistenceProvider: localStorage not available'
      );
      expect(mockBrowserUtils.clearLocalStorage).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should cleanup old data and return count of removed items', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.loadFromLocalStorage.mockReturnValue(mockStorageData);
      mockBrowserUtils.saveToLocalStorage.mockReturnValue(true);

      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const result = provider.cleanup(maxAge);

      expect(result).toBe(2); // 1 old pattern + 1 old intervention
      expect(mockBrowserUtils.saveToLocalStorage).toHaveBeenCalled();
    });

    it('should return 0 when browser environment is not available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = provider.cleanup(24 * 60 * 60 * 1000);

      expect(result).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'LocalStoragePersistenceProvider: localStorage not available'
      );

      consoleSpy.mockRestore();
    });

    it('should return 0 when no data exists', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.loadFromLocalStorage.mockReturnValue(null);

      const result = provider.cleanup(24 * 60 * 60 * 1000);

      expect(result).toBe(0);
    });

    it('should not save when no items are removed', () => {
      const recentData: StorageData = {
        patterns: [
          {
            id: 'recent1',
            pattern: 'recent pattern',
            frequency: 1,
            firstSeen: Date.now() - 1000,
            lastSeen: Date.now() - 1000,
            messages: [],
          } as ConversationPattern,
        ],
        interventions: [Date.now() - 1000],
        lastCleanup: Date.now() - 1000,
        version: '1.0.0',
      };

      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.loadFromLocalStorage.mockReturnValue(recentData);

      const maxAge = 24 * 60 * 60 * 1000;
      const result = provider.cleanup(maxAge);

      expect(result).toBe(0);
      expect(mockBrowserUtils.saveToLocalStorage).not.toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('should return true when browser environment is available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);

      const result = provider.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when browser environment is not available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(false);

      const result = provider.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage info when localStorage is available and has data', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      localStorageMock.getItem.mockReturnValue('{"some":"data"}');

      const result = provider.getStorageInfo();

      expect(result).toEqual({
        key: 'manneri_data',
        version: '1.0.0',
        available: true,
        hasData: true,
      });
    });

    it('should return storage info when localStorage is available but has no data', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      localStorageMock.getItem.mockReturnValue(null);

      const result = provider.getStorageInfo();

      expect(result).toEqual({
        key: 'manneri_data',
        version: '1.0.0',
        available: true,
        hasData: false,
      });
    });

    it('should return storage info when localStorage is not available', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(false);

      const result = provider.getStorageInfo();

      expect(result).toEqual({
        key: 'manneri_data',
        version: '1.0.0',
        available: false,
        hasData: false,
      });
    });

    it('should handle localStorage access errors gracefully', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Access denied');
      });

      const result = provider.getStorageInfo();

      expect(result).toEqual({
        key: 'manneri_data',
        version: '1.0.0',
        available: true,
        hasData: false,
      });
    });

    it('should return custom storage key and version', () => {
      const customProvider = new LocalStoragePersistenceProvider({
        storageKey: 'custom_key',
        version: '2.0.0',
      });

      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      localStorageMock.getItem.mockReturnValue(null);

      const result = customProvider.getStorageInfo();

      expect(result).toEqual({
        key: 'custom_key',
        version: '2.0.0',
        available: true,
        hasData: false,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty storage data', () => {
      const emptyData: StorageData = {
        patterns: [],
        interventions: [],
        lastCleanup: Date.now(),
        version: '1.0.0',
      };

      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.loadFromLocalStorage.mockReturnValue(emptyData);

      const result = provider.cleanup(24 * 60 * 60 * 1000);

      expect(result).toBe(0);
    });

    it('should handle invalid data structure gracefully', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.saveToLocalStorage.mockReturnValue(false);

      const result = provider.save(mockStorageData);

      expect(result).toBe(false);
    });

    it('should handle save failures', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.saveToLocalStorage.mockReturnValue(false);

      const result = provider.save(mockStorageData);

      expect(result).toBe(false);
    });

    it('should handle clear failures', () => {
      mockBrowserUtils.isBrowserEnvironment.mockReturnValue(true);
      mockBrowserUtils.clearLocalStorage.mockReturnValue(false);

      const result = provider.clear();

      expect(result).toBe(false);
    });
  });
});
