import { describe, expect, it } from 'vitest';
import { createJsonStorage } from '../src/storage/jsonStorage';
import {
  createSecretaryTools,
  toChatToolDefinitions,
  tools,
} from '../src/tools';
import { createTempDataDir } from './testUtils';

const expectedToolNames = [
  'memo.save',
  'todo.create',
  'schedule.suggest',
  'draft.create',
  'memory.save',
  'memory.search',
];

describe('character-agent tool registry', () => {
  it('exports all secretary tools without duplicate names', () => {
    expect(tools.map((tool) => tool.name)).toEqual(expectedToolNames);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
  });

  it('creates executable OpenAI-compatible tool definitions', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const registry = createSecretaryTools({ storage });

    for (const tool of registry) {
      expect(tool.description).toEqual(expect.any(String));
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.parameters.type).toBe('object');
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('converts registry names to provider-safe function names', () => {
    const definitions = toChatToolDefinitions(tools);

    expect(definitions.map((tool) => tool.name)).toEqual([
      'memo_save',
      'todo_create',
      'schedule_suggest',
      'draft_create',
      'memory_save',
      'memory_search',
    ]);
    expect(
      definitions.every((tool) => /^[a-zA-Z0-9_-]+$/.test(tool.name)),
    ).toBe(true);
    expect(definitions.every((tool) => !('execute' in tool))).toBe(true);
  });
});
