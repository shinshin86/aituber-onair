import type { StorageData, ManneriConfig } from '../types/index.js';

const STORAGE_KEY = 'manneri_data';
const STORAGE_VERSION = '1.0.0';

export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function saveToLocalStorage(
  data: StorageData,
  storageKey?: string
): boolean {
  if (!isBrowserEnvironment()) return false;

  try {
    const storageData = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      data,
    };

    localStorage.setItem(
      storageKey || STORAGE_KEY,
      JSON.stringify(storageData)
    );
    return true;
  } catch (error) {
    console.warn('Failed to save manneri data to localStorage:', error);
    return false;
  }
}

export function loadFromLocalStorage(storageKey?: string): StorageData | null {
  if (!isBrowserEnvironment()) return null;

  try {
    const item = localStorage.getItem(storageKey || STORAGE_KEY);
    if (!item) return null;

    const storageData = JSON.parse(item);

    if (storageData.version !== STORAGE_VERSION) {
      console.warn('Manneri storage version mismatch, clearing data');
      clearLocalStorage(storageKey);
      return null;
    }

    return storageData.data;
  } catch (error) {
    console.warn('Failed to load manneri data from localStorage:', error);
    return null;
  }
}

export function clearLocalStorage(storageKey?: string): boolean {
  if (!isBrowserEnvironment()) return false;

  try {
    localStorage.removeItem(storageKey || STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn('Failed to clear manneri data from localStorage:', error);
    return false;
  }
}

export function getStorageSize(storageKey?: string): number {
  if (!isBrowserEnvironment()) return 0;

  try {
    const item = localStorage.getItem(storageKey || STORAGE_KEY);
    return item ? new Blob([item]).size : 0;
  } catch (error) {
    return 0;
  }
}

export function cleanupOldData(
  maxAge: number = 24 * 60 * 60 * 1000,
  storageKey?: string
): boolean {
  const data = loadFromLocalStorage(storageKey);
  if (!data) return false;

  const now = Date.now();
  const cutoff = now - maxAge;

  const cleanedPatterns = data.patterns.filter(
    (pattern) => pattern.lastSeen > cutoff
  );
  const cleanedInterventions = data.interventions.filter(
    (timestamp) => timestamp > cutoff
  );

  const cleanedData: StorageData = {
    ...data,
    patterns: cleanedPatterns,
    interventions: cleanedInterventions,
    lastCleanup: now,
  };

  return saveToLocalStorage(cleanedData, storageKey);
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
  immediate: boolean = false
): T {
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  }) as T;
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean = false;

  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

export function createWorkerFunction(fn: Function): Worker | null {
  if (!isBrowserEnvironment() || typeof Worker === 'undefined') return null;

  try {
    const functionString = fn.toString();
    const blob = new Blob([`(${functionString})()`], {
      type: 'application/javascript',
    });
    const url = URL.createObjectURL(blob);

    const worker = new Worker(url);

    worker.addEventListener('error', () => {
      URL.revokeObjectURL(url);
    });

    return worker;
  } catch (error) {
    console.warn('Failed to create worker:', error);
    return null;
  }
}

export function measurePerformance<T>(
  name: string,
  fn: () => T,
  enableLogging: boolean = false
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  if (enableLogging) {
    console.log(`[Manneri] ${name}: ${(end - start).toFixed(2)}ms`);
  }

  return result;
}

export function asyncMeasurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  enableLogging: boolean = false
): Promise<T> {
  const start = performance.now();

  return fn().then((result) => {
    const end = performance.now();

    if (enableLogging) {
      console.log(`[Manneri] ${name}: ${(end - start).toFixed(2)}ms`);
    }

    return result;
  });
}

export function createEventEmitter<EventMap extends Record<string, any>>() {
  const listeners = new Map<keyof EventMap, Set<Function>>();

  return {
    on<K extends keyof EventMap>(
      event: K,
      listener: (data: EventMap[K]) => void
    ): void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(listener);
    },

    off<K extends keyof EventMap>(
      event: K,
      listener: (data: EventMap[K]) => void
    ): void {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener);
        if (eventListeners.size === 0) {
          listeners.delete(event);
        }
      }
    },

    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (error) {
            console.error(
              `Error in event listener for ${String(event)}:`,
              error
            );
          }
        });
      }
    },

    removeAllListeners(): void {
      listeners.clear();
    },
  };
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function isValidConfig(config: any): config is ManneriConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    typeof config.similarityThreshold === 'number' &&
    typeof config.repetitionLimit === 'number' &&
    typeof config.lookbackWindow === 'number' &&
    typeof config.interventionCooldown === 'number' &&
    typeof config.minMessageLength === 'number' &&
    Array.isArray(config.excludeKeywords) &&
    typeof config.enableTopicTracking === 'boolean' &&
    typeof config.enableKeywordAnalysis === 'boolean' &&
    typeof config.debugMode === 'boolean'
  );
}
