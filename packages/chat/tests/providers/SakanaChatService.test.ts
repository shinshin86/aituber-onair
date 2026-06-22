import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
  MODEL_FUGU,
  MODEL_FUGU_ULTRA,
} from '../../src/constants';
import { SakanaChatService } from '../../src/services/providers/sakana/SakanaChatService';
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

describe('SakanaChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.TextDecoder = class {
      decode(value?: Uint8Array): string {
        if (!value) return '';
        return Buffer.from(value).toString('utf-8');
      }
    } as typeof TextDecoder;
  });

  it('sends requests to the Sakana chat completions endpoint', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new SakanaChatService('test-key', MODEL_FUGU_ULTRA);

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_FUGU_ULTRA,
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
    const service = new SakanaChatService('test-key');

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.model).toBe(MODEL_FUGU);
    expect(body.reasoning).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
  });

  it('uses max_tokens for configured response length', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new SakanaChatService(
      'test-key',
      MODEL_FUGU,
      MODEL_FUGU,
      undefined,
      ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
      'short',
    );

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.max_tokens).toBeDefined();
    expect(body.max_completion_tokens).toBeUndefined();
  });

  it('returns parsed non-streaming output from chatOnce', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createOneShotResponse('Fugu response'),
    );
    const service = new SakanaChatService('test-key');

    const result = await service.chatOnce(messages, false);

    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'Fugu response' }],
      stop_reason: 'end',
      truncated: false,
      finish_reason: undefined,
      usage: undefined,
    });
  });

  it('handles OpenAI-compatible streaming responses', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"Fu"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"gu"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new SakanaChatService('test-key');
    const onPartial = vi.fn();

    const result = await service.chatOnce(messages, true, onPartial);

    expect(onPartial).toHaveBeenNthCalledWith(1, 'Fu');
    expect(onPartial).toHaveBeenNthCalledWith(2, 'gu');
    expect(result.blocks).toEqual([
      { type: 'text', text: 'Fu' },
      { type: 'text', text: 'gu' },
    ]);
    expect(result.stop_reason).toBe('end');
  });
});
