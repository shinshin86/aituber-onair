import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createJsonStorage } from '../src/storage/jsonStorage';
import { createTempDataDir } from './testUtils';

describe('character-agent jsonStorage', () => {
  it('creates the data directory and initializes missing files as arrays', async () => {
    const baseDir = join(await createTempDataDir(), 'data');
    const storage = createJsonStorage({ baseDir });

    const items = await storage.readJsonArray<{ title: string }>('memos.json');

    expect(items).toEqual([]);
    expect(await readFile(join(baseDir, 'memos.json'), 'utf8')).toBe('[]\n');
  });

  it('reads and appends JSON array items while preserving existing items', async () => {
    const baseDir = await createTempDataDir();
    const storage = createJsonStorage({ baseDir });

    await storage.appendJsonArrayItem('todos.json', { title: 'first' });
    await storage.appendJsonArrayItem('todos.json', { title: 'second' });

    await expect(
      storage.readJsonArray<{ title: string }>('todos.json'),
    ).resolves.toEqual([{ title: 'first' }, { title: 'second' }]);
  });

  it('returns a clear error when the JSON file is malformed', async () => {
    const baseDir = await createTempDataDir();
    await mkdir(baseDir, { recursive: true });
    await writeFile(join(baseDir, 'memories.json'), '{ broken json', 'utf8');
    const storage = createJsonStorage({ baseDir });

    await expect(storage.readJsonArray('memories.json')).rejects.toThrow(
      /Failed to read JSON array from memories\.json/,
    );
  });

  it('returns a clear error when the JSON file is not an array', async () => {
    const baseDir = await createTempDataDir();
    await mkdir(baseDir, { recursive: true });
    await writeFile(join(baseDir, 'drafts.json'), '{"items":[]}', 'utf8');
    const storage = createJsonStorage({ baseDir });

    await expect(storage.readJsonArray('drafts.json')).rejects.toThrow(
      /Expected drafts\.json to contain a JSON array/,
    );
  });
});
