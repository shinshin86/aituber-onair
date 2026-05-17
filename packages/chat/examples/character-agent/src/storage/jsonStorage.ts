import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type JsonStorage = {
  readJsonArray<T>(fileName: string): Promise<T[]>;
  appendJsonArrayItem<T>(fileName: string, item: T): Promise<T>;
};

export type JsonStorageOptions = {
  baseDir: string;
};

export function createJsonStorage(options: JsonStorageOptions): JsonStorage {
  const { baseDir } = options;

  async function ensureJsonArrayFile(fileName: string): Promise<string> {
    const filePath = join(baseDir, fileName);

    await mkdir(baseDir, { recursive: true });

    try {
      await readFile(filePath, 'utf8');
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        await writeFile(filePath, '[]\n', 'utf8');
        return filePath;
      }

      throw error;
    }

    return filePath;
  }

  return {
    async readJsonArray<T>(fileName: string): Promise<T[]> {
      const filePath = await ensureJsonArrayFile(fileName);

      let parsed: unknown;
      try {
        parsed = JSON.parse(await readFile(filePath, 'utf8'));
      } catch (error) {
        throw new Error(
          `Failed to read JSON array from ${fileName}: ${toErrorMessage(
            error,
          )}`,
        );
      }

      if (!Array.isArray(parsed)) {
        throw new Error(`Expected ${fileName} to contain a JSON array.`);
      }

      return parsed as T[];
    },

    async appendJsonArrayItem<T>(fileName: string, item: T): Promise<T> {
      const items = await this.readJsonArray<T>(fileName);
      items.push(item);
      await writeFile(
        join(baseDir, fileName),
        `${JSON.stringify(items, null, 2)}\n`,
        'utf8',
      );

      return item;
    },
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
