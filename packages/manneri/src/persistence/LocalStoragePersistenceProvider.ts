import type { PersistenceProvider } from '../types/persistence.js';
import type { StorageData, ConversationPattern } from '../types/index.js';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  cleanupOldData,
  isBrowserEnvironment,
} from '../utils/browserUtils.js';

/**
 * LocalStorage-based persistence provider
 *
 * Uses browser's localStorage to persist manneri data.
 * Only works in browser environments.
 */
export class LocalStoragePersistenceProvider implements PersistenceProvider {
  private readonly storageKey: string;
  private readonly version: string;

  constructor(
    options: {
      storageKey?: string;
      version?: string;
    } = {}
  ) {
    this.storageKey = options.storageKey || 'manneri_data';
    this.version = options.version || '1.0.0';
  }

  /**
   * Save data to localStorage
   */
  save(data: StorageData): boolean {
    if (!isBrowserEnvironment()) {
      console.warn(
        'LocalStoragePersistenceProvider: localStorage not available'
      );
      return false;
    }

    return saveToLocalStorage(data, this.storageKey);
  }

  /**
   * Load data from localStorage
   */
  load(): StorageData | null {
    if (!isBrowserEnvironment()) {
      console.warn(
        'LocalStoragePersistenceProvider: localStorage not available'
      );
      return null;
    }

    return loadFromLocalStorage(this.storageKey);
  }

  /**
   * Clear all data from localStorage
   */
  clear(): boolean {
    if (!isBrowserEnvironment()) {
      console.warn(
        'LocalStoragePersistenceProvider: localStorage not available'
      );
      return false;
    }

    return clearLocalStorage(this.storageKey);
  }

  /**
   * Clean up old data from localStorage
   */
  cleanup(maxAge: number): number {
    if (!isBrowserEnvironment()) {
      console.warn(
        'LocalStoragePersistenceProvider: localStorage not available'
      );
      return 0;
    }

    const data = loadFromLocalStorage(this.storageKey);
    if (!data) return 0;

    const now = Date.now();
    const cutoff = now - maxAge;

    const originalPatterns = data.patterns.length;
    const originalInterventions = data.interventions.length;

    const cleanedPatterns = data.patterns.filter(
      (pattern) => pattern.lastSeen > cutoff
    );
    const cleanedInterventions = data.interventions.filter(
      (timestamp) => timestamp > cutoff
    );

    const removedCount =
      originalPatterns -
      cleanedPatterns.length +
      (originalInterventions - cleanedInterventions.length);

    if (removedCount > 0) {
      const cleanedData = {
        ...data,
        patterns: cleanedPatterns,
        interventions: cleanedInterventions,
        lastCleanup: now,
      };

      saveToLocalStorage(cleanedData, this.storageKey);
    }

    return removedCount;
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    return isBrowserEnvironment();
  }

  /**
   * Get storage info
   */
  getStorageInfo(): {
    key: string;
    version: string;
    available: boolean;
    hasData: boolean;
  } {
    const available = this.isAvailable();
    let hasData = false;

    if (available) {
      try {
        hasData = localStorage.getItem(this.storageKey) !== null;
      } catch {
        hasData = false;
      }
    }

    return {
      key: this.storageKey,
      version: this.version,
      available,
      hasData,
    };
  }
}
