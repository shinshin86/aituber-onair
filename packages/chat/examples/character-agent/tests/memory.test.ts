import { describe, expect, it } from 'vitest';
import { createJsonStorage } from '../src/storage/jsonStorage';
import {
  createMemorySaveTool,
  createMemorySearchTool,
} from '../src/tools/memory';
import { createTempDataDir, expectIsoDate } from './testUtils';

describe('memory tools', () => {
  it('saves long-term memory items with generated metadata', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tool = createMemorySaveTool({ storage });

    const result = await tool.execute({
      subject: 'Preferred stream time',
      content: 'The user prefers morning planning streams.',
      importance: 4,
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Memory saved.');
    expect(result.memory).toMatchObject({
      subject: 'Preferred stream time',
      content: 'The user prefers morning planning streams.',
      importance: 4,
    });
    expect(result.memory.id).toEqual(expect.any(String));
    expectIsoDate(result.memory.createdAt);
    await expect(storage.readJsonArray('memories.json')).resolves.toEqual([
      result.memory,
    ]);
  });

  it('searches subject and content case-insensitively with partial matches and limit', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const saveTool = createMemorySaveTool({ storage });
    const searchTool = createMemorySearchTool({ storage });

    const planning = await saveTool.execute({
      subject: 'Planning format',
      content: 'The user likes checklist summaries.',
    });
    await saveTool.execute({
      subject: 'Music segment',
      content: 'Opening song discussion.',
    });
    const guest = await saveTool.execute({
      subject: 'Guest ideas',
      content: 'Checklist for inviting collaborators.',
    });

    await expect(
      searchTool.execute({ query: 'CHECK', limit: 1 }),
    ).resolves.toEqual({
      ok: true,
      results: [planning.memory],
    });
    await expect(searchTool.execute({ query: 'guest' })).resolves.toEqual({
      ok: true,
      results: [guest.memory],
    });
    await expect(searchTool.execute({ query: 'missing' })).resolves.toEqual({
      ok: true,
      results: [],
    });
  });
});
