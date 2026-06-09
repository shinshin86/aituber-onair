import { describe, expect, it, vi } from 'vitest';
import {
  parseOpenAIResponsesOneShot,
  parseOpenAIResponsesStream,
} from '../../src/services/providers/openai/responsesParser';
import { createSseResponse } from '../helpers/sse';

describe('OpenAI responses parsing', () => {
  it('surfaces incomplete metadata from responses one-shot payloads', () => {
    const result = parseOpenAIResponsesOneShot({
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
      usage: {
        output_tokens_details: {
          reasoning_tokens: 512,
        },
      },
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Hello',
            },
          ],
        },
      ],
    });

    expect(result.stop_reason).toBe('end');
    expect(result.truncated).toBe(true);
    expect(result.response_status).toBe('incomplete');
    expect(result.incomplete_details).toEqual({
      reason: 'max_output_tokens',
    });
    expect(result.usage).toEqual({
      output_tokens_details: {
        reasoning_tokens: 512,
      },
    });
  });

  it('falls back to empty input for invalid responses function arguments', () => {
    const onJsonError = vi.fn();

    const result = parseOpenAIResponsesOneShot(
      {
        output: [
          {
            type: 'function_call',
            id: 'call_bad',
            name: 'lookup',
            arguments: '{bad json',
          },
        ],
      },
      { onJsonError },
    );

    expect(result.blocks).toEqual([
      { type: 'tool_use', id: 'call_bad', name: 'lookup', input: {} },
    ]);
    expect(result.stop_reason).toBe('tool_use');
    expect(onJsonError).toHaveBeenCalledTimes(1);
  });

  it('keeps streamed text when responses function arguments are invalid', async () => {
    const onPartial = vi.fn();
    const onJsonError = vi.fn();
    const messageEvent = JSON.stringify({
      item: {
        type: 'message',
        content: [{ type: 'output_text', text: 'Before tool. ' }],
      },
    });
    const toolEvent = JSON.stringify({
      item: {
        type: 'function_call',
        id: 'call_bad',
        name: 'lookup',
        arguments: '{bad json',
      },
    });
    const res = createSseResponse([
      `event: response.output_item.added\ndata: ${messageEvent}\n\n`,
      `event: response.output_item.added\ndata: ${toolEvent}\n\n`,
    ]);

    const result = await parseOpenAIResponsesStream(res, onPartial, {
      onJsonError,
    });

    expect(onPartial).toHaveBeenCalledWith('Before tool. ');
    expect(result.blocks).toEqual([
      { type: 'text', text: 'Before tool. ' },
      { type: 'tool_use', id: 'call_bad', name: 'lookup', input: {} },
    ]);
    expect(result.stop_reason).toBe('tool_use');
    expect(onJsonError).toHaveBeenCalledTimes(1);
  });
});
