import type { NoiseMemory, NoiseMemoryStore } from '../core/types.js';
import { normalizeNoiseMemory } from '../memory/noiseMemory.js';

export interface LocalStorageNoiseMemoryStoreOptions {
  storage?: Storage;
  keyPrefix?: string;
}

export class LocalStorageNoiseMemoryStore implements NoiseMemoryStore {
  private readonly storage: Storage;
  private readonly keyPrefix: string;

  constructor(options: LocalStorageNoiseMemoryStoreOptions = {}) {
    const storage = options.storage ?? globalThis.localStorage;

    if (!storage) {
      throw new Error(
        'LocalStorageNoiseMemoryStore requires a Storage implementation.'
      );
    }

    this.storage = storage;
    this.keyPrefix = options.keyPrefix ?? 'aituber-onair:noise:memory';
  }

  async load(scopeId: string): Promise<NoiseMemory | undefined> {
    const raw = this.storage.getItem(this.createKey(scopeId));

    if (!raw) {
      return undefined;
    }

    return normalizeNoiseMemory(JSON.parse(raw) as NoiseMemory);
  }

  async save(scopeId: string, memory: NoiseMemory): Promise<void> {
    this.storage.setItem(this.createKey(scopeId), JSON.stringify(memory));
  }

  async clear(scopeId: string): Promise<void> {
    this.storage.removeItem(this.createKey(scopeId));
  }

  private createKey(scopeId: string): string {
    return `${this.keyPrefix}:${scopeId}`;
  }
}
