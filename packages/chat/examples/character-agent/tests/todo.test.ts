import { describe, expect, it } from 'vitest';
import { createJsonStorage } from '../src/storage/jsonStorage';
import { createTodoCreateTool } from '../src/tools/todo';
import { createTempDataDir, expectIsoDate } from './testUtils';

describe('todo.create tool', () => {
  it('creates a todo with medium priority and incomplete status by default', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tool = createTodoCreateTool({ storage });

    const result = await tool.execute({ title: 'Prepare stream outline' });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Todo created.');
    expect(result.todo).toMatchObject({
      title: 'Prepare stream outline',
      priority: 'medium',
      completed: false,
    });
    expect(result.todo.id).toEqual(expect.any(String));
    expectIsoDate(result.todo.createdAt);
    await expect(storage.readJsonArray('todos.json')).resolves.toEqual([
      result.todo,
    ]);
  });

  it('accepts dueDate and valid priorities only', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tool = createTodoCreateTool({ storage });

    const result = await tool.execute({
      title: 'Publish schedule teaser',
      dueDate: '2026-05-20',
      priority: 'high',
    });

    expect(result.todo.dueDate).toBe('2026-05-20');
    expect(result.todo.priority).toBe('high');
    await expect(
      tool.execute({ title: 'Broken', priority: 'urgent' as never }),
    ).rejects.toThrow(/priority must be one of low, medium, high/);
  });
});
