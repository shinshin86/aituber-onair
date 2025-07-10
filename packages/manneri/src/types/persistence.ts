import type { StorageData } from './index.js';

/**
 * Interface for persistence providers
 * Allows custom storage implementations (localStorage, IndexedDB, databases, etc.)
 */
export interface PersistenceProvider {
  /**
   * Save data to storage
   * @param data Data to save
   * @returns Promise<boolean> or boolean indicating success
   */
  save(data: StorageData): Promise<boolean> | boolean;

  /**
   * Load data from storage
   * @returns Promise<StorageData | null> or StorageData | null
   */
  load(): Promise<StorageData | null> | StorageData | null;

  /**
   * Clear all data from storage
   * @returns Promise<boolean> or boolean indicating success
   */
  clear(): Promise<boolean> | boolean;

  /**
   * Clean up old data (optional)
   * @param maxAge Maximum age in milliseconds
   * @returns Promise<number> or number of items removed
   */
  cleanup?(maxAge: number): Promise<number> | number;
}

/**
 * Configuration for persistence
 */
export interface PersistenceConfig {
  /**
   * Persistence provider instance
   */
  provider: PersistenceProvider;

  /**
   * Auto-save interval in milliseconds (0 = disabled)
   * @default 0
   */
  autoSaveInterval?: number;

  /**
   * Auto-cleanup interval in milliseconds (0 = disabled)
   * @default 0
   */
  autoCleanupInterval?: number;

  /**
   * Maximum age for cleanup in milliseconds
   * @default 7 * 24 * 60 * 60 * 1000 (7 days)
   */
  maxAge?: number;
}

/**
 * Storage event types
 */
export interface PersistenceEvents {
  save_success: { timestamp: number };
  save_error: { error: Error };
  load_success: { data: StorageData; timestamp: number };
  load_error: { error: Error };
  cleanup_completed: { removedItems: number; timestamp: number };
  cleanup_error: { error: Error };
}
