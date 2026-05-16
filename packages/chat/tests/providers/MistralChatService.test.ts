import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  MODEL_MISTRAL_LARGE_2512,
  MODEL_MISTRAL_MEDIUM_2508,
  MODEL_MISTRAL_MEDIUM_3_5,
  MODEL_MISTRAL_SMALL_LATEST,
} from '../../src/constants';
import { MistralChatService } from '../../src/services/providers/mistral/MistralChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message, MessageWithVision } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const createOneShotResponse = (content: unknown) =>
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

describe('MistralChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.TextDecoder = class {
      decode(value?: Uint8Array): string {
        if (!value) return '';
        return Buffer.from(value).toString('utf-8');
      }
    } as typeof TextDecoder;
  });

  it('sends requests to the Mistral chat completions endpoint', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new MistralChatService(
      'test-key',
      MODEL_MISTRAL_LARGE_2512,
    );

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_MISTRAL_LARGE_2512,
        stream: false,
        messages,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('sends reasoning_effort only for supported Mistral models', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));

    const reasoningService = new MistralChatService(
      'test-key',
      MODEL_MISTRAL_MEDIUM_3_5,
      MODEL_MISTRAL_MEDIUM_3_5,
      undefined,
      ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
      undefined,
      'high',
    );
    await reasoningService.chatOnce(messages, false);
    expect(postSpy.mock.calls[0][1]).toEqual(
      expect.objectContaining({ reasoning_effort: 'high' }),
    );

    const nonReasoningService = new MistralChatService(
      'test-key',
      MODEL_MISTRAL_MEDIUM_2508,
      MODEL_MISTRAL_MEDIUM_2508,
      undefined,
      ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
      undefined,
      'high',
    );
    await nonReasoningService.chatOnce(messages, false);
    expect((postSpy.mock.calls[1][1] as any).reasoning_effort).toBeUndefined();
  });

  it('uses max_tokens for configured response length', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new MistralChatService(
      'test-key',
      MODEL_MISTRAL_SMALL_LATEST,
      MODEL_MISTRAL_SMALL_LATEST,
      undefined,
      ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
      'short',
    );

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.max_tokens).toBeDefined();
    expect(body.max_completion_tokens).toBeUndefined();
  });

  it('normalizes OpenAI-style vision image_url blocks for Mistral', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new MistralChatService('test-key');
    const visionMessages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this image?' },
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.test/image.png',
              detail: 'low',
            },
          },
        ],
      },
    ];

    await service.visionChatOnce(visionMessages, false);

    const body = postSpy.mock.calls[0][1] as any;
    expect(body.messages[0].content[1]).toEqual({
      type: 'image_url',
      image_url: 'https://example.test/image.png',
    });
  });

  it('removes core-only timestamp fields before sending messages', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new MistralChatService('test-key');
    const messagesWithTimestamp: Message[] = [
      { role: 'user', content: 'hello', timestamp: 1234567890 },
    ];

    await service.chatOnce(messagesWithTimestamp, false);

    const body = postSpy.mock.calls[0][1] as any;
    expect(body.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('returns parsed non-streaming output from chatOnce', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createOneShotResponse([
        { type: 'text', text: 'Mistral ' },
        { type: 'text', text: 'response' },
      ]),
    );
    const service = new MistralChatService('test-key');

    const result = await service.chatOnce(messages, false);

    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'Mistral response' }],
      stop_reason: 'end',
      truncated: false,
      finish_reason: undefined,
      usage: undefined,
    });
  });

  it('handles OpenAI-compatible streaming responses', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"Mis"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"tral"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new MistralChatService('test-key');
    const onPartial = vi.fn();

    const result = await service.chatOnce(messages, true, onPartial);

    expect(onPartial).toHaveBeenNthCalledWith(1, 'Mis');
    expect(onPartial).toHaveBeenNthCalledWith(2, 'tral');
    expect(result.blocks).toEqual([
      { type: 'text', text: 'Mis' },
      { type: 'text', text: 'tral' },
    ]);
    expect(result.stop_reason).toBe('end');
  });
});
