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
});
