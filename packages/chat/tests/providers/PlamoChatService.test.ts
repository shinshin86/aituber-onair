import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
  MODEL_PLAMO_2_2_PRIME,
  MODEL_PLAMO_3_0_PRIME,
} from '../../src/constants';
import { PlamoChatService } from '../../src/services/providers/plamo/PlamoChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const createOneShotResponse = (content: string) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
    text: async () =>
      JSON.stringify({
        choices: [{ message: { content } }],
      }),
  }) as Response;

const createStreamResponse = (chunks: string[]): Response => {
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

describe('PlamoChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.TextDecoder = class {
      decode(value?: Uint8Array): string {
        if (!value) return '';
        return Buffer.from(value).toString('utf-8');
      }
    } as typeof TextDecoder;
  });

  it('sends requests to the PLaMo chat completions endpoint', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new PlamoChatService('test-key', MODEL_PLAMO_2_2_PRIME);

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_PLAMO_2_2_PRIME,
        stream: false,
        messages,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('does not add reasoning parameters by default', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new PlamoChatService('test-key');

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.model).toBe(MODEL_PLAMO_3_0_PRIME);
    expect(body.reasoning).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
  });

  it('sends supported reasoning_effort when configured', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new PlamoChatService(
      'test-key',
      MODEL_PLAMO_3_0_PRIME,
      MODEL_PLAMO_3_0_PRIME,
      undefined,
      ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
      undefined,
      'medium',
    );

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.reasoning_effort).toBe('medium');
  });

  it('uses max_tokens for configured response length', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new PlamoChatService(
      'test-key',
      MODEL_PLAMO_3_0_PRIME,
      MODEL_PLAMO_3_0_PRIME,
      undefined,
      ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
      'short',
    );

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.max_tokens).toBeDefined();
    expect(body.max_completion_tokens).toBeUndefined();
  });

  it('returns parsed non-streaming output from chatOnce', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createOneShotResponse('PLaMo response'),
    );
    const service = new PlamoChatService('test-key');

    const result = await service.chatOnce(messages, false);

    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'PLaMo response' }],
      stop_reason: 'end',
      truncated: false,
      finish_reason: undefined,
      usage: undefined,
    });
  });

  it('handles OpenAI-compatible streaming responses', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"PLa"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Mo"}}]}\n\n',
        'data: {"choices":[],"usage":{"prompt_tokens":1,"total_tokens":3,"completion_tokens":2}}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new PlamoChatService('test-key');
    const onPartial = vi.fn();

    const result = await service.chatOnce(messages, true, onPartial);

    expect(onPartial).toHaveBeenNthCalledWith(1, 'PLa');
    expect(onPartial).toHaveBeenNthCalledWith(2, 'Mo');
    expect(result.blocks).toEqual([
      { type: 'text', text: 'PLa' },
      { type: 'text', text: 'Mo' },
    ]);
    expect(result.stop_reason).toBe('end');
    expect(result.usage).toEqual({
      prompt_tokens: 1,
      total_tokens: 3,
      completion_tokens: 2,
    });
  });
});
