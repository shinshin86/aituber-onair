import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      `${JSON.stringify(allMemories, null, 2)}\n`,
      'utf8'
    );
  }

  async clear(scopeId: string): Promise<void> {
    const allMemories = await this.readAll();
    delete allMemories[scopeId];

    if (Object.keys(allMemories).length === 0) {
      await rm(this.filePath, { force: true });
      return;
    }

    await writeFile(
      this.filePath,
      `${JSON.stringify(allMemories, null, 2)}\n`,
      'utf8'
    );
  }

  private async readAll(): Promise<Record<string, NoiseMemory>> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return JSON.parse(raw) as Record<string, NoiseMemory>;
    } catch (error) {
      if (isFileNotFound(error)) {
        return {};
      }

      throw error;
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
