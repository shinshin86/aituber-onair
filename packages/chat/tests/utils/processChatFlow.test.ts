import { describe, it, expect, vi } from 'vitest';
import { processChatWithOptionalTools } from '../../src/utils/processChatFlow';
import type { ToolChatCompletion } from '../../src/types';

describe('processChatWithOptionalTools', () => {
  it('should run without tools and complete response', async () => {
    const runWithoutTools = vi.fn().mockResolvedValue('hello');
    const runWithTools = vi.fn();
    const onCompleteResponse = vi.fn().mockResolvedValue(undefined);

    await processChatWithOptionalTools({
      hasTools: false,
      runWithoutTools,
      runWithTools,
      onCompleteResponse,
      toolErrorMessage: 'tool error',
    });

    expect(runWithoutTools).toHaveBeenCalledTimes(1);
    expect(runWithTools).not.toHaveBeenCalled();
    expect(onCompleteResponse).toHaveBeenCalledWith('hello');
  });

  it('should run with tools and complete when stop_reason is end', async () => {
    const runWithoutTools = vi.fn();
    const runWithTools = vi.fn().mockResolvedValue({
      blocks: [{ type: 'text', text: 'ok' }],
      stop_reason: 'end',
    } as ToolChatCompletion);
    const onCompleteResponse = vi.fn().mockResolvedValue(undefined);
    const onToolBlocks = vi.fn();

    await processChatWithOptionalTools({
      hasTools: true,
      runWithoutTools,
      runWithTools,
      onCompleteResponse,
      onToolBlocks,
      toolErrorMessage: 'tool error',
    });

    expect(runWithoutTools).not.toHaveBeenCalled();
    expect(runWithTools).toHaveBeenCalledTimes(1);
    expect(onToolBlocks).toHaveBeenCalledWith([{ type: 'text', text: 'ok' }]);
    expect(onCompleteResponse).toHaveBeenCalledWith('ok');
  });

  it('should throw when tool calls are present', async () => {
    const runWithoutTools = vi.fn();
    const runWithTools = vi.fn().mockResolvedValue({
      blocks: [{ type: 'tool_use', id: 'call_1', name: 't', input: {} }],
      stop_reason: 'tool_use',
    } as ToolChatCompletion);
    const onCompleteResponse = vi.fn().mockResolvedValue(undefined);

    await expect(
      processChatWithOptionalTools({
        hasTools: true,
        runWithoutTools,
        runWithTools,
        onCompleteResponse,
        toolErrorMessage: 'tool error',
      }),
    ).rejects.toThrow('tool error');
  });
});
