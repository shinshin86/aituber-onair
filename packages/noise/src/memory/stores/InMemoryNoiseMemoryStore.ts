import type { NoiseMemory, NoiseMemoryStore } from '../../core/types.js';

export class InMemoryNoiseMemoryStore implements NoiseMemoryStore {
  private readonly memories = new Map<string, NoiseMemory>();

  async load(scopeId: string): Promise<NoiseMemory | undefined> {
    return this.memories.get(scopeId);
  }

  async save(scopeId: string, memory: NoiseMemory): Promise<void> {
    this.memories.set(scopeId, memory);
  }

  async clear(scopeId: string): Promise<void> {
    this.memories.delete(scopeId);
  }
}
