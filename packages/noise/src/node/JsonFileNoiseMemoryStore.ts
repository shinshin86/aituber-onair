import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { NoiseMemory, NoiseMemoryStore } from '../core/types.js';
import { normalizeNoiseMemory } from '../memory/noiseMemory.js';

export interface JsonFileNoiseMemoryStoreOptions {
  filePath: string;
}

export class JsonFileNoiseMemoryStore implements NoiseMemoryStore {
  private readonly filePath: string;

  constructor(options: JsonFileNoiseMemoryStoreOptions) {
    this.filePath = resolve(options.filePath);
  }

  async load(scopeId: string): Promise<NoiseMemory | undefined> {
    const allMemories = await this.readAll();
    return allMemories[scopeId]
      ? normalizeNoiseMemory(allMemories[scopeId])
      : undefined;
  }

  async save(scopeId: string, memory: NoiseMemory): Promise<void> {
    const allMemories = await this.readAll();
    allMemories[scopeId] = memory;
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    await fs.writeFile(
      this.filePath,
      `${JSON.stringify(allMemories, null, 2)}\n`,
      'utf8'
    );
  }

  async clear(scopeId: string): Promise<void> {
    const allMemories = await this.readAll();
    delete allMemories[scopeId];

    if (Object.keys(allMemories).length === 0) {
      await this.removeFileIfExists();
      return;
    }

    await fs.writeFile(
      this.filePath,
      `${JSON.stringify(allMemories, null, 2)}\n`,
      'utf8'
    );
  }

  private async readAll(): Promise<Record<string, NoiseMemory>> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(raw) as Record<string, NoiseMemory>;
    } catch (error) {
      if (isFileNotFound(error)) {
        return {};
      }

      throw error;
    }
  }

  private async removeFileIfExists(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch (error) {
      if (!isFileNotFound(error)) {
        throw error;
      }
    }
  }
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
