import { MemoryRecord, MemoryStorage } from '../types';

/**
 * LocalStorage implementation of MemoryStorage
 */
export class LocalStorageMemoryStorage implements MemoryStorage {
  private storageKey: string;

  /**
   * Constructor
   * @param storageKey Key to use in localStorage
   */
  constructor(storageKey: string) {
    this.storageKey = storageKey;
  }

  /**
   * Load memory records from localStorage
   * @returns Promise resolving to array of memory records
   */
  async load(): Promise<MemoryRecord[]> {
    try {
      const rawData = localStorage.getItem(this.storageKey);
      if (!rawData) {
        return [];
      }

      const parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Validate records and filter out invalid ones
      return parsed.filter(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.type === 'string' &&
          ['short', 'mid', 'long'].includes(item.type) &&
          typeof item.summary === 'string' &&
          typeof item.timestamp === 'number',
      );
    } catch (error) {
      console.error('Error loading memory records from localStorage:', error);
      return [];
    }
  }

  /**
   * Save memory records to localStorage
   * @param records Memory records to save
   * @returns Promise resolving when save is complete
   */
  async save(records: MemoryRecord[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (error) {
      console.error('Error saving memory records to localStorage:', error);
      throw error;
    }
  }

  /**
   * Clear all stored memory records
   * @returns Promise resolving when clear is complete
   */
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error clearing memory records from localStorage:', error);
      throw error;
    }
  }
}

/**
 * IndexedDB implementation of MemoryStorage (example skeleton)
 * This is just a placeholder - would need to be implemented properly
 */
export class IndexedDBMemoryStorage implements MemoryStorage {
  // Implementation would go here
  async load(): Promise<MemoryRecord[]> {
    // Would use IndexedDB APIs to load data
    throw new Error('IndexedDBMemoryStorage not implemented');
  }

  async save(records: MemoryRecord[]): Promise<void> {
    // Would use IndexedDB APIs to save data
    throw new Error('IndexedDBMemoryStorage not implemented');
  }

  async clear(): Promise<void> {
    // Would use IndexedDB APIs to clear data
    throw new Error('IndexedDBMemoryStorage not implemented');
  }
}

/**
 * Factory function to create appropriate storage based on environment
 * @param storageKey Key to use for storage
 * @param storageType Type of storage to use
 * @returns MemoryStorage implementation
 */
export function createMemoryStorage(
  storageKey: string,
  storageType: 'localStorage' | 'indexedDB' = 'localStorage',
): MemoryStorage {
  switch (storageType) {
    case 'localStorage':
      return new LocalStorageMemoryStorage(storageKey);
    case 'indexedDB':
      // Example - not implemented yet
      return new IndexedDBMemoryStorage();
    default:
      return new LocalStorageMemoryStorage(storageKey);
  }
}
