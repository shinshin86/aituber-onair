import { describe, expect, it } from 'vitest';
import { createJsonStorage } from '../src/storage/jsonStorage';
import { createScheduleSuggestTool } from '../src/tools/schedule';
import { createTempDataDir, expectIsoDate } from './testUtils';

describe('schedule.suggest tool', () => {
  it('saves a schedule suggestion without registering a calendar event', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tool = createScheduleSuggestTool({ storage });

    const result = await tool.execute({
      title: 'Next stream planning',
      date: '2026-05-21T10:00:00Z',
      durationMinutes: 45,
      notes: 'Review topics before confirming.',
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Schedule suggestion created.');
    expect(result.message.toLowerCase()).not.toContain('registered');
    expect(result.schedule).toMatchObject({
      title: 'Next stream planning',
      date: '2026-05-21T10:00:00Z',
      durationMinutes: 45,
      notes: 'Review topics before confirming.',
    });
    expect(result.schedule.id).toEqual(expect.any(String));
    expectIsoDate(result.schedule.createdAt);
    await expect(storage.readJsonArray('schedules.json')).resolves.toEqual([
      result.schedule,
    ]);
  });
});
