import { describe, expect, it } from 'vitest';
import { createJsonStorage } from '../src/storage/jsonStorage';
import { createMemoSaveTool } from '../src/tools/memo';
import { createTempDataDir, expectIsoDate } from './testUtils';

describe('memo.save tool', () => {
  it('saves a memo with generated metadata and default tags', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tool = createMemoSaveTool({ storage });

    const result = await tool.execute({
      title: 'Stream idea',
      content: 'Try a morning planning segment.',
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Memo saved.');
    expect(result.memo).toMatchObject({
      title: 'Stream idea',
      content: 'Try a morning planning segment.',
      tags: [],
    });
    expect(result.memo.id).toEqual(expect.any(String));
    expectIsoDate(result.memo.createdAt);
    await expect(storage.readJsonArray('memos.json')).resolves.toEqual([
      result.memo,
    ]);
  });

  it('preserves provided tags', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tool = createMemoSaveTool({ storage });

    const result = await tool.execute({
      title: 'Collab',
      content: 'Invite a guest next week.',
      tags: ['stream', 'guest'],
    });

    expect(result.memo.tags).toEqual(['stream', 'guest']);
  });
});
