import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LocalStorageMemoryStorage,
  createMemoryStorage,
} from '../../src/utils/storage';
import { MemoryRecord } from '../../src/types';

// Define Storage interface for the mock
interface MockStorage {
  store: Record<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  length: number;
  key(index: number): string | null;
}

// Mock implementation of localStorage
const mockLocalStorage: MockStorage = {
  store: {},
  getItem: vi.fn((key: string): string | null => {
    return mockLocalStorage.store[key] || null;
  }),
  setItem: vi.fn((key: string, value: string): void => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string): void => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn((): void => {
    mockLocalStorage.store = {};
  }),
  length: 0,
  key: vi.fn((_index: number): string | null => null),
};

// Setup global localStorage for Node.js environment
// This creates a global localStorage variable available for LocalStorageMemoryStorage
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('LocalStorageMemoryStorage', () => {
  const storageKey = 'testMemoryKey';
  let storage: LocalStorageMemoryStorage;

  // Test memory records
  const testRecords: MemoryRecord[] = [
    { type: 'short', summary: 'Short-term memory', timestamp: 1000 },
    { type: 'mid', summary: 'Mid-term memory', timestamp: 2000 },
    { type: 'long', summary: 'Long-term memory', timestamp: 3000 },
  ];

  beforeEach(() => {
    mockLocalStorage.clear();
    storage = new LocalStorageMemoryStorage(storageKey);
  });

  it('should save memory records', async () => {
    await storage.save(testRecords);

    // Verify that setItem was called with correct parameters
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(testRecords),
    );
  });

  it('should load memory records', async () => {
    // Setup data in localStorage
    mockLocalStorage.setItem(storageKey, JSON.stringify(testRecords));

    // Execute load operation
    const loadedRecords = await storage.load();

    // Verify that records were loaded correctly
    expect(loadedRecords).toEqual(testRecords);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(storageKey);
  });

  it('should return an empty array when no data is stored', async () => {
    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual([]);
  });

  it('should return an empty array when stored data is not valid JSON', async () => {
    mockLocalStorage.setItem(storageKey, 'not a json');

    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual([]);
  });

  it('should clear memory records', async () => {
    // Setup data in localStorage
    mockLocalStorage.setItem(storageKey, JSON.stringify(testRecords));

    // Execute clear operation
    await storage.clear();

    // Verify that removeItem was called
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(storageKey);

    // Verify that data was actually removed
    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual([]);
  });

  it('should automatically filter invalid records', async () => {
    // Array with mixed valid and invalid data
    const mixedData = [
      { type: 'short', summary: 'Valid data', timestamp: 1000 },
      { type: 'invalid', summary: 'Invalid type', timestamp: 2000 }, // Invalid type
      { summary: 'Missing type', timestamp: 3000 }, // Missing type
      { type: 'mid' }, // Missing summary and timestamp
      null, // null
      42, // number
      'text', // string
    ];

    mockLocalStorage.setItem(storageKey, JSON.stringify(mixedData));

    const loadedRecords = await storage.load();

    // Verify that only valid records were loaded
    expect(loadedRecords.length).toBe(1);
    expect(loadedRecords[0].type).toBe('short');
    expect(loadedRecords[0].summary).toBe('Valid data');
  });

  it('should handle empty string storage key', async () => {
    const emptyKeyStorage = new LocalStorageMemoryStorage('');
    await emptyKeyStorage.save(testRecords);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      '',
      JSON.stringify(testRecords),
    );
  });

  it('should handle very long storage key', async () => {
    const longKey = 'a'.repeat(1000);
    const longKeyStorage = new LocalStorageMemoryStorage(longKey);
    await longKeyStorage.save(testRecords);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      longKey,
      JSON.stringify(testRecords),
    );
  });

  it('should handle empty records array', async () => {
    await storage.save([]);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify([]),
    );

    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual([]);
  });

  it('should handle records with special characters in summary', async () => {
    const specialRecords: MemoryRecord[] = [
      {
        type: 'short',
        summary: 'Special chars: 日本語 🎉 <>&"\'',
        timestamp: 1000,
      },
      { type: 'mid', summary: 'Newlines\nand\ttabs', timestamp: 2000 },
    ];

    await storage.save(specialRecords);
    mockLocalStorage.setItem(storageKey, JSON.stringify(specialRecords));

    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual(specialRecords);
  });

  it('should handle records with zero timestamp', async () => {
    const zeroTimestampRecords: MemoryRecord[] = [
      { type: 'short', summary: 'Zero timestamp', timestamp: 0 },
    ];

    await storage.save(zeroTimestampRecords);
    mockLocalStorage.setItem(storageKey, JSON.stringify(zeroTimestampRecords));

    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual(zeroTimestampRecords);
  });

  it('should handle records with negative timestamp', async () => {
    const negativeTimestampRecords: MemoryRecord[] = [
      { type: 'short', summary: 'Negative timestamp', timestamp: -1000 },
    ];

    await storage.save(negativeTimestampRecords);
    mockLocalStorage.setItem(
      storageKey,
      JSON.stringify(negativeTimestampRecords),
    );

    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual(negativeTimestampRecords);
  });

  it('should handle very large records array', async () => {
    const largeRecords: MemoryRecord[] = Array.from(
      { length: 1000 },
      (_, i) => ({
        type: 'short' as const,
        summary: `Record ${i}`,
        timestamp: i,
      }),
    );

    await storage.save(largeRecords);
    mockLocalStorage.setItem(storageKey, JSON.stringify(largeRecords));

    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual(largeRecords);
  });

  it('should handle localStorage setItem throwing error', async () => {
    // Mock setItem to throw an error
    mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    await expect(storage.save(testRecords)).rejects.toThrow(
      'Storage quota exceeded',
    );
  });

  it('should handle localStorage getItem throwing error', async () => {
    // Mock getItem to throw an error
    mockLocalStorage.getItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage access denied');
    });

    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual([]);
  });

  it('should handle localStorage removeItem throwing error', async () => {
    // Mock removeItem to throw an error
    mockLocalStorage.removeItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage access denied');
    });

    await expect(storage.clear()).rejects.toThrow('Storage access denied');
  });

  it('should handle malformed JSON with extra properties', async () => {
    // Reset the mock to clear previous error state
    mockLocalStorage.getItem = vi.fn((key: string): string | null => {
      return mockLocalStorage.store[key] || null;
    });
    mockLocalStorage.setItem = vi.fn((key: string, value: string): void => {
      mockLocalStorage.store[key] = value;
    });

    const malformedData = [
      {
        type: 'short',
        summary: 'Valid data',
        timestamp: 1000,
        extraProperty: 'should be ignored',
        anotherExtra: 123,
      },
    ];

    mockLocalStorage.setItem(storageKey, JSON.stringify(malformedData));

    const loadedRecords = await storage.load();
    expect(loadedRecords.length).toBe(1);
    expect(loadedRecords[0]).toEqual({
      type: 'short',
      summary: 'Valid data',
      timestamp: 1000,
      extraProperty: 'should be ignored',
      anotherExtra: 123,
    });
  });

  it('should handle records with wrong data types', async () => {
    // Reset the mock to clear previous error state
    mockLocalStorage.setItem = vi.fn((key: string, value: string): void => {
      mockLocalStorage.store[key] = value;
    });

    const wrongTypeData = [
      { type: 'short', summary: 123, timestamp: 1000 }, // summary should be string
      { type: 'short', summary: 'Valid', timestamp: '1000' }, // timestamp should be number
      { type: 123, summary: 'Valid', timestamp: 1000 }, // type should be string
    ];

    mockLocalStorage.setItem(storageKey, JSON.stringify(wrongTypeData));

    const loadedRecords = await storage.load();
    expect(loadedRecords).toEqual([]);
  });

  it('should handle circular reference in records (should not occur in practice)', async () => {
    const circularRecord: any = {
      type: 'short',
      summary: 'Test',
      timestamp: 1000,
    };
    circularRecord.self = circularRecord;

    // This should throw during JSON.stringify
    await expect(storage.save([circularRecord])).rejects.toThrow();
  });
});

describe('createMemoryStorage', () => {
  it('should return LocalStorageMemoryStorage by default', () => {
    const storage = createMemoryStorage('testKey');
    expect(storage).toBeInstanceOf(LocalStorageMemoryStorage);
  });

  it('should return LocalStorageMemoryStorage when specified', () => {
    const storage = createMemoryStorage('testKey', 'localStorage');
    expect(storage).toBeInstanceOf(LocalStorageMemoryStorage);
  });

  it('should throw an error when IndexedDBMemoryStorage methods are called (not implemented yet)', async () => {
    // Create the storage - this doesn't throw an error by itself
    const storage = createMemoryStorage('testKey', 'indexedDB');

    // But calling any method should throw the error
    await expect(storage.load()).rejects.toThrow(
      'IndexedDBMemoryStorage not implemented',
    );
    await expect(storage.save([])).rejects.toThrow(
      'IndexedDBMemoryStorage not implemented',
    );
    await expect(storage.clear()).rejects.toThrow(
      'IndexedDBMemoryStorage not implemented',
    );
  });

  it('should handle invalid storage type and default to localStorage', () => {
    const storage = createMemoryStorage('testKey', 'invalidType' as any);
    expect(storage).toBeInstanceOf(LocalStorageMemoryStorage);
  });

  it('should handle undefined storage type and default to localStorage', () => {
    const storage = createMemoryStorage('testKey', undefined);
    expect(storage).toBeInstanceOf(LocalStorageMemoryStorage);
  });
});
