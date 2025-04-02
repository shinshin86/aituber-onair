/**
 * Memory storage interface for persistence
 * Implementations can use various storage mechanisms (LocalStorage, IndexedDB, files, etc.)
 */
export interface MemoryStorage {
  /**
   * Load memory records from storage
   * @returns Promise resolving to array of memory records
   */
  load(): Promise<MemoryRecord[]>;

  /**
   * Save memory records to storage
   * @param records Memory records to save
   * @returns Promise resolving when save is complete
   */
  save(records: MemoryRecord[]): Promise<void>;

  /**
   * Clear all stored memory records
   * @returns Promise resolving when clear is complete
   */
  clear(): Promise<void>;
}

/**
 * Memory record type
 */
export type MemoryType = 'short' | 'mid' | 'long';

/**
 * Memory record type
 */
export interface MemoryRecord {
  type: MemoryType;
  summary: string;
  timestamp: number;
}
