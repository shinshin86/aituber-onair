import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SECRETARY_CHARACTER_PROMPT } from '../src/prompts/secretary-character';
import { createJsonStorage } from '../src/storage/jsonStorage';
import { createDraftCreateTool } from '../src/tools/draft';
import { createScheduleSuggestTool } from '../src/tools/schedule';
import { createTempDataDir } from './testUtils';

describe('character-agent safety model', () => {
  it('keeps schedule and draft tool messages in suggestion or draft language', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const schedule = await createScheduleSuggestTool({ storage }).execute({
      title: 'Planning session',
    });
    const draft = await createDraftCreateTool({ storage }).execute({
      type: 'post',
      purpose: 'Promote the next stream',
      body: 'Next stream starts soon.',
    });

    expect(schedule.message.toLowerCase()).toContain('suggestion');
    expect(schedule.message.toLowerCase()).not.toMatch(/registered|booked/);
    expect(draft.message.toLowerCase()).toContain('draft');
    expect(draft.message.toLowerCase()).not.toMatch(/sent|posted|published/);
  });

  it('states external-action limits in the secretary character prompt', () => {
    const prompt = SECRETARY_CHARACTER_PROMPT.toLowerCase();

    expect(prompt).toContain('do not claim');
    expect(prompt).toContain('sent emails');
    expect(prompt).toContain('posted to social media');
    expect(prompt).toContain('registered calendar events');
  });

  it('documents the safety model in README', async () => {
    const readme = (
      await readFile(new URL('../README.md', import.meta.url), 'utf8')
    ).toLowerCase();

    expect(readme).toContain('safety model');
    expect(readme).toContain('do not send emails');
    expect(readme).toContain('do not post to social media');
    expect(readme).toContain('do not register calendar events');
    expect(readme).toContain('local json');
  });
});
