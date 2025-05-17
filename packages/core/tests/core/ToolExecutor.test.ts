import { describe, it, expect, vi, afterEach } from 'vitest';
import { ToolExecutor } from '../../src/core/ToolExecutor';
import { ToolDefinition, ToolUseBlock } from '../../src/types/toolChat';

interface AddInput {
  a: number;
  b: number;
}

describe('ToolExecutor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('registers and executes a tool', async () => {
    const executor = new ToolExecutor();

    const def: ToolDefinition<AddInput> = {
      name: 'add',
      parameters: { type: 'object' },
    };

    const handler = vi.fn(async (input: AddInput) => input.a + input.b);

    executor.register(def, handler);

    const blocks: ToolUseBlock<AddInput>[] = [
      { type: 'tool_use', id: '1', name: 'add', input: { a: 2, b: 3 } },
    ];

    const results = await executor.run(blocks);

    expect(handler).toHaveBeenCalledWith({ a: 2, b: 3 });
    expect(results).toEqual([
      {
        type: 'tool_result',
        tool_use_id: '1',
        content: '5',
      },
    ]);
  });

  it('throws when registering the same tool twice', () => {
    const executor = new ToolExecutor();
    const def: ToolDefinition = { name: 'dup', parameters: { type: 'object' } };

    executor.register(def, async () => undefined);

    expect(() => executor.register(def, async () => undefined)).toThrow(
      "Tool 'dup' already registered",
    );
  });

  it('handles timeout according to config.timeoutMs', async () => {
    const executor = new ToolExecutor();

    const def: ToolDefinition = {
      name: 'slow',
      parameters: { type: 'object' },
      config: { timeoutMs: 1000 },
    };

    executor.register(def, async () => {
      return new Promise((resolve) => setTimeout(() => resolve('done'), 2000));
    });

    const blocks: ToolUseBlock[] = [
      { type: 'tool_use', id: 't1', name: 'slow', input: {} },
    ];

    vi.useFakeTimers();
    const runPromise = executor.run(blocks);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(runPromise).rejects.toThrow('slow timed out');
  });
});
