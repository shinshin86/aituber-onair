import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
  MODEL_DEEPSEEK_V4_FLASH,
  MODEL_DEEPSEEK_V4_FLASH_VISION_EXP,
  MODEL_DEEPSEEK_V4_PRO,
} from '../../src/constants';
import { DeepSeekChatService } from '../../src/services/providers/deepseek/DeepSeekChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message, MessageWithVision } from '../../src/types';

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

describe('DeepSeekChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.TextDecoder = class {
      decode(value?: Uint8Array): string {
        if (!value) return '';
        return Buffer.from(value).toString('utf-8');
      }
    } as typeof TextDecoder;
  });

  it('sends requests to the DeepSeek chat completions endpoint', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new DeepSeekChatService('test-key', MODEL_DEEPSEEK_V4_PRO);

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_DEEPSEEK_V4_PRO,
        stream: false,
        messages,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('disables DeepSeek thinking by default for responsive chat', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new DeepSeekChatService('test-key');

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.model).toBe(MODEL_DEEPSEEK_V4_FLASH);
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.reasoning_effort).toBeUndefined();
  });

  it('sends vision-exp image messages with thinking disabled by default', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('image'));
    const visionMessages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image.' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/image.png' },
          },
        ],
      },
    ];
    const service = new DeepSeekChatService(
      'test-key',
      MODEL_DEEPSEEK_V4_FLASH,
      MODEL_DEEPSEEK_V4_FLASH_VISION_EXP,
    );

    await service.visionChatOnce(visionMessages, false);

    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_DEEPSEEK_V4_FLASH_VISION_EXP,
        messages: visionMessages,
        stream: false,
        thinking: { type: 'disabled' },
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it.each(['low', 'high', 'max'] as const)(
    'enables DeepSeek V4 Flash thinking with %s effort',
    async (reasoningEffort) => {
      const postSpy = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(createOneShotResponse('ok'));
      const service = new DeepSeekChatService(
        'test-key',
        MODEL_DEEPSEEK_V4_FLASH,
        MODEL_DEEPSEEK_V4_FLASH,
        undefined,
        ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
        undefined,
        reasoningEffort,
      );

      await service.chatOnce(messages, false);

      const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(body.thinking).toEqual({ type: 'enabled' });
      expect(body.reasoning_effort).toBe(reasoningEffort);
    },
  );

  it('normalizes V4 Pro low reasoning to high', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new DeepSeekChatService(
      'test-key',
      MODEL_DEEPSEEK_V4_PRO,
      MODEL_DEEPSEEK_V4_PRO,
      undefined,
      ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
      undefined,
      'low',
    );

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.thinking).toEqual({ type: 'enabled' });
    expect(body.reasoning_effort).toBe('high');
  });

  it('rejects thinking with tools until reasoning history replay is supported', () => {
    expect(
      () =>
        new DeepSeekChatService(
          'test-key',
          MODEL_DEEPSEEK_V4_FLASH,
          MODEL_DEEPSEEK_V4_FLASH,
          [
            {
              name: 'search',
              description: 'Search',
              parameters: { type: 'object', properties: {} },
            },
          ],
          ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
          undefined,
          'low',
        ),
    ).toThrow("Use reasoning_effort: 'none' for tool calling");
  });

  it('allows tool calling with the default non-thinking mode', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new DeepSeekChatService(
      'test-key',
      MODEL_DEEPSEEK_V4_FLASH,
      MODEL_DEEPSEEK_V4_FLASH,
      [
        {
          name: 'search',
          description: 'Search',
          parameters: { type: 'object', properties: {} },
        },
      ],
    );

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.tool_choice).toBe('auto');
  });

  it('uses max_tokens for configured response length', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOneShotResponse('ok'));
    const service = new DeepSeekChatService(
      'test-key',
      MODEL_DEEPSEEK_V4_FLASH,
      MODEL_DEEPSEEK_V4_FLASH,
      undefined,
      ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
      'short',
    );

    await service.chatOnce(messages, false);

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.max_tokens).toBeDefined();
    expect(body.max_completion_tokens).toBeUndefined();
  });

  it('returns parsed non-streaming output from chatOnce', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createOneShotResponse('DeepSeek response'),
    );
    const service = new DeepSeekChatService('test-key');

    const result = await service.chatOnce(messages, false);

    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'DeepSeek response' }],
      stop_reason: 'end',
      truncated: false,
      finish_reason: undefined,
      usage: undefined,
    });
  });

  it('handles OpenAI-compatible streaming responses', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"Deep"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Seek"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new DeepSeekChatService('test-key');
    const onPartial = vi.fn();

    const result = await service.chatOnce(messages, true, onPartial);

    expect(onPartial).toHaveBeenNthCalledWith(1, 'Deep');
    expect(onPartial).toHaveBeenNthCalledWith(2, 'Seek');
    expect(result.blocks).toEqual([
      { type: 'text', text: 'Deep' },
      { type: 'text', text: 'Seek' },
    ]);
    expect(result.stop_reason).toBe('end');
  });

  it('ignores reasoning_content and streams visible text in thinking mode', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"reasoning_content":"Think"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Answer"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new DeepSeekChatService(
      'test-key',
      MODEL_DEEPSEEK_V4_FLASH,
      MODEL_DEEPSEEK_V4_FLASH,
      undefined,
      ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
      undefined,
      'low',
    );
    const onPartial = vi.fn();

    const result = await service.chatOnce(messages, true, onPartial);

    expect(onPartial).toHaveBeenCalledOnce();
    expect(onPartial).toHaveBeenCalledWith('Answer');
    expect(result.blocks).toEqual([{ type: 'text', text: 'Answer' }]);
  });
});
