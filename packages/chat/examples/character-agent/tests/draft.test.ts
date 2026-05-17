import { describe, expect, it } from 'vitest';
import { createJsonStorage } from '../src/storage/jsonStorage';
import { createDraftCreateTool } from '../src/tools/draft';
import { createTempDataDir, expectIsoDate } from './testUtils';

describe('draft.create tool', () => {
  it('saves an email draft without sending it externally', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tool = createDraftCreateTool({ storage });

    const result = await tool.execute({
      type: 'email',
      audience: 'Guest creator',
      purpose: 'Invite them to a stream',
      tone: 'friendly',
      body: 'Would you like to join next week?',
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Draft created.');
    expect(result.message.toLowerCase()).not.toMatch(/sent|posted/);
    expect(result.draft).toMatchObject({
      type: 'email',
      audience: 'Guest creator',
      purpose: 'Invite them to a stream',
      tone: 'friendly',
      body: 'Would you like to join next week?',
    });
    expect(result.draft.id).toEqual(expect.any(String));
    expectIsoDate(result.draft.createdAt);
    await expect(storage.readJsonArray('drafts.json')).resolves.toEqual([
      result.draft,
    ]);
  });

  it('allows only known draft types', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tool = createDraftCreateTool({ storage });

    await expect(
      tool.execute({
        type: 'calendar' as never,
        purpose: 'Invalid',
        body: 'No external action.',
      }),
    ).rejects.toThrow(/type must be one of email, post, announcement, reply/);
  });
});
