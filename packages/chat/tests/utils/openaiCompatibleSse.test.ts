import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseOpenAICompatibleTextStream,
  parseOpenAICompatibleToolStream,
  parseOpenAICompatibleOneShot,
} from '../../src/utils/openaiCompatibleSse';
import type { ToolChatCompletion } from '../../src/types';
import { createSseResponse } from '../helpers/sse';

describe('openaiCompatibleSse', () => {
  const originalTextDecoder = global.TextDecoder;

  beforeEach(() => {
    global.TextDecoder = class {
      decode(value?: Uint8Array): string {
        if (!value) return '';
        return Buffer.from(value).toString('utf-8');
      }
    } as typeof TextDecoder;
  });

  afterEach(() => {
    global.TextDecoder = originalTextDecoder;
  });

  it('should parse streaming text and call onPartial', async () => {
    const onPartial = vi.fn();
    const res = createSseResponse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    const full = await parseOpenAICompatibleTextStream(res, onPartial);

    expect(full).toBe('Hello world');
    expect(onPartial).toHaveBeenCalledTimes(2);
    expect(onPartial).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onPartial).toHaveBeenNthCalledWith(2, ' world');
  });

  it('should ignore invalid JSON when onJsonError is provided', async () => {
    const onPartial = vi.fn();
    const onJsonError = vi.fn();
    const res = createSseResponse([
      'data: {invalid json}\n\n',
      'data: {"choices":[{"delta":{"content":"OK"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    const full = await parseOpenAICompatibleTextStream(res, onPartial, {
      onJsonError,
    });

    expect(full).toBe('OK');
    expect(onJsonError).toHaveBeenCalledTimes(1);
  });

  it('should parse streaming tool calls with arguments spanning chunks', async () => {
    const onPartial = vi.fn();
    const firstPayload = JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_1',
                function: { name: 'getWeather', arguments: '{"city":"To' },
              },
            ],
          },
        },
      ],
    });
    const secondPayload = JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_1',
                function: { name: 'getWeather', arguments: 'kyo"}' },
              },
            ],
          },
        },
      ],
    });
    const res = createSseResponse([
      `data: ${firstPayload}\n\n`,
      `data: ${secondPayload}\n\n`,
      'data: [DONE]\n\n',
    ]);

    const result = await parseOpenAICompatibleToolStream(res, onPartial, {
      preserveAssistantMessage: true,
    });

    expect(onPartial).not.toHaveBeenCalled();
    expect(result.stop_reason).toBe('tool_use');
    expect(result.blocks).toEqual([
      {
        type: 'tool_use',
        id: 'call_1',
        name: 'getWeather',
        input: { city: 'Tokyo' },
      },
    ]);
    expect(result.assistant_message).toEqual({
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'getWeather',
            arguments: '{"city":"Tokyo"}',
          },
        },
      ],
    });
  });

  it('should keep text blocks when streaming tool arguments are invalid JSON', async () => {
    const onPartial = vi.fn();
    const onJsonError = vi.fn();
    const textPayload = JSON.stringify({
      choices: [{ delta: { content: 'Before tool. ' } }],
    });
    const toolPayload = JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_bad',
                function: { name: 'search', arguments: '{bad json' },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    });
    const res = createSseResponse([
      `data: ${textPayload}\n\n`,
      `data: ${toolPayload}\n\n`,
      'data: [DONE]\n\n',
    ]);

    const result = await parseOpenAICompatibleToolStream(res, onPartial, {
      onJsonError,
    });

    expect(onPartial).toHaveBeenCalledWith('Before tool. ');
    expect(result.blocks).toEqual([
      { type: 'text', text: 'Before tool. ' },
      { type: 'tool_use', id: 'call_bad', name: 'search', input: {} },
    ]);
    expect(result.stop_reason).toBe('tool_use');
    expect(onJsonError).toHaveBeenCalledTimes(1);
  });

  it('should parse one-shot response with tool calls', () => {
    const result = parseOpenAICompatibleOneShot({
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            tool_calls: [
              {
                id: 'call_2',
                function: {
                  name: 'search',
                  arguments: JSON.stringify({ q: 'hello' }),
                },
              },
            ],
          },
        },
      ],
    }) as ToolChatCompletion;

    expect(result.stop_reason).toBe('tool_use');
    expect(result.blocks).toEqual([
      { type: 'tool_use', id: 'call_2', name: 'search', input: { q: 'hello' } },
    ]);
  });

  it('should preserve a complete one-shot assistant message when requested', () => {
    const message = {
      role: 'assistant',
      content: 'Calling search. ',
      reasoning_content: 'A search is required.',
      tool_calls: [
        {
          id: 'call_3',
          type: 'function',
          function: {
            name: 'search',
            arguments: JSON.stringify({ q: 'Kimi K3' }),
          },
        },
      ],
    };

    const result = parseOpenAICompatibleOneShot(
      {
        choices: [{ finish_reason: 'tool_calls', message }],
      },
      { preserveAssistantMessage: true },
    );

    expect(result.blocks).toEqual([
      {
        type: 'tool_use',
        id: 'call_3',
        name: 'search',
        input: { q: 'Kimi K3' },
      },
    ]);
    expect(result.assistant_message).toEqual(message);
  });

  it('should fall back to empty input for invalid one-shot tool arguments', () => {
    const onJsonError = vi.fn();

    const result = parseOpenAICompatibleOneShot(
      {
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              tool_calls: [
                {
                  id: 'call_bad',
                  function: {
                    name: 'search',
                    arguments: '{bad json',
                  },
                },
              ],
            },
          },
        ],
      },
      { onJsonError },
    ) as ToolChatCompletion;

    expect(result.blocks).toEqual([
      { type: 'tool_use', id: 'call_bad', name: 'search', input: {} },
    ]);
    expect(result.stop_reason).toBe('tool_use');
    expect(onJsonError).toHaveBeenCalledTimes(1);
  });

  it('should preserve truncation metadata for one-shot responses', () => {
    const result = parseOpenAICompatibleOneShot({
      choices: [
        {
          finish_reason: 'length',
          message: {
            content: 'Hello',
          },
        },
      ],
      usage: {
        completion_tokens_details: {
          reasoning_tokens: 128,
        },
      },
    }) as ToolChatCompletion;

    expect(result.stop_reason).toBe('end');
    expect(result.truncated).toBe(true);
    expect(result.finish_reason).toBe('length');
    expect(result.usage).toEqual({
      completion_tokens_details: {
        reasoning_tokens: 128,
      },
    });
  });
});
