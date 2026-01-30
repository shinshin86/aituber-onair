import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseOpenAICompatibleTextStream,
  parseOpenAICompatibleToolStream,
  parseOpenAICompatibleOneShot,
} from '../../src/utils/openaiCompatibleSse';
import type { ToolChatCompletion } from '../../src/types';

const createResponse = (chunks: string[]): Response => {
  let index = 0;
  const body = {
    getReader: () => ({
      read: async () => {
        if (index >= chunks.length) {
          return { done: true, value: undefined };
        }
        const value = new Uint8Array(Buffer.from(chunks[index], 'utf-8'));
        index += 1;
        return { done: false, value };
      },
    }),
  };

  return { body } as Response;
};

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
    const res = createResponse([
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
    const res = createResponse([
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
    const res = createResponse([
      `data: ${firstPayload}\n\n`,
      `data: ${secondPayload}\n\n`,
      'data: [DONE]\n\n',
    ]);

    const result = await parseOpenAICompatibleToolStream(res, onPartial);

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
});
