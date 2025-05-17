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
    const expectPromise = expect(runPromise).rejects.toThrow('slow timed out');
    await vi.advanceTimersByTimeAsync(1000);
    await expectPromise;
  });

  it('throws if tool is not registered', async () => {
    const executor = new ToolExecutor();
    const blocks = [{ type: 'tool_use', id: 'x', name: 'missing', input: {} }];
    await expect(executor.run(blocks as any)).rejects.toThrow(
      'Unhandled tool: missing',
    );
  });

  it('preserves order of results with multiple blocks', async () => {
    const exec = new ToolExecutor();
    exec.register(
      { name: 'id', parameters: { type: 'object' } },
      async (v) => v,
    );
    const blocks = [
      { type: 'tool_use', id: '1', name: 'id', input: 'A' },
      { type: 'tool_use', id: '2', name: 'id', input: 'B' },
    ];
    const res = await exec.run(blocks as any);
    expect(res.map((r) => r.tool_use_id)).toEqual(['1', '2']);
  });

  it('stringifies non-string result', async () => {
    const exec = new ToolExecutor();
    exec.register(
      { name: 'obj', parameters: { type: 'object' } },
      async () => ({ x: 1 }),
    );
    const res = await exec.run([
      { type: 'tool_use', id: 'o1', name: 'obj', input: {} },
    ] as any);
    expect(res[0].content).toBe('{"x":1}');
  });
});
