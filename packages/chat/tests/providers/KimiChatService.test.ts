import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MODEL_KIMI_K3_1_PRO,
  MODEL_KIMI_K3_1_PRO_HIGHSPEED,
  ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
  MODEL_KIMI_K3,
  MODEL_KIMI_K2_6,
  MODEL_KIMI_K2_5,
  MODEL_KIMI_K2_7_CODE,
  MODEL_KIMI_K2_7_CODE_HIGHSPEED,
} from '../../src/constants';
import { KimiChatService } from '../../src/services/providers/kimi/KimiChatService';
import { KimiChatServiceProvider } from '../../src/services/providers/kimi/KimiChatServiceProvider';
import type { KimiChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import { buildToolContinuationMessages } from '../../src/backend';
import type {
  Message,
  MessageWithVision,
  ToolDefinition,
} from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const tools: ToolDefinition[] = [
  {
    name: 'lookupWeather',
    description: 'Lookup weather by city',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
      },
      required: ['city'],
    },
  },
];

const createOneShotResponse = (message: Record<string, unknown>) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ finish_reason: 'stop', message }],
    }),
  }) as Response;

describe.each(['direct', 'provider'] as const)(
  'K2 thinking through %s construction',
  (construction) => {
    const createService = (options: KimiChatServiceOptions) =>
      construction === 'provider'
        ? new KimiChatServiceProvider().createChatService(options)
        : new KimiChatService(
            options.apiKey,
            options.model,
            options.visionModel ?? options.model,
            options.tools,
            options.endpoint,
            options.responseLength,
            options.responseFormat,
            options.thinking,
          );

    beforeEach(() => vi.restoreAllMocks());

    describe.each([MODEL_KIMI_K2_5, MODEL_KIMI_K2_6])(
      '%s optional thinking',
      (model) => {
        it.each([
          ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
          'http://localhost:8000/v1/chat/completions',
        ])('disables thinking by default at %s', async (endpoint) => {
          const post = vi
            .spyOn(ChatServiceHttpClient, 'post')
            .mockResolvedValue(createOneShotResponse({ content: 'Hello' }));
          const service = createService({
            apiKey: 'test-key',
            model,
            endpoint,
          });
          await service.chatOnce!(messages, false);
          const body = post.mock.calls[0][1];
          if (endpoint === ENDPOINT_KIMI_CHAT_COMPLETIONS_API) {
            expect(body.thinking).toEqual({ type: 'disabled' });
            expect(body.chat_template_kwargs).toBeUndefined();
          } else {
            expect(body.thinking).toBeUndefined();
            expect(body.chat_template_kwargs).toEqual({ thinking: false });
          }
          expect(body.reasoning_effort).toBeUndefined();
        });

        it('preserves explicit thinking opt-in', async () => {
          const post = vi
            .spyOn(ChatServiceHttpClient, 'post')
            .mockResolvedValue(createOneShotResponse({ content: 'Hello' }));
          const service = createService({
            apiKey: 'test-key',
            model,
            thinking: { type: 'enabled', clear_thinking: true },
          });
          await service.chatOnce!(messages, false);
          expect(post.mock.calls[0][1].thinking).toEqual({
            type: 'enabled',
            clear_thinking: true,
          });
        });
      },
    );

    describe.each([MODEL_KIMI_K2_7_CODE, MODEL_KIMI_K2_7_CODE_HIGHSPEED])(
      '%s required thinking',
      (model) => {
        it.each([false, true])(
          'stays enabled with tools=%s',
          async (withTools) => {
            const post = vi
              .spyOn(ChatServiceHttpClient, 'post')
              .mockResolvedValue(createOneShotResponse({ content: 'Hello' }));
            const service = createService({
              apiKey: 'test-key',
              model,
              tools: withTools ? tools : undefined,
            });
            await service.chatOnce!(messages, false);
            expect(post.mock.calls[0][1].thinking).toEqual({ type: 'enabled' });
            expect(post.mock.calls[0][1].reasoning_effort).toBeUndefined();
          },
        );

        it('rejects explicit disabled thinking before transport', async () => {
          const post = vi.spyOn(ChatServiceHttpClient, 'post');
          await expect(
            (async () => {
              const service = createService({
                apiKey: 'test-key',
                model,
                thinking: { type: 'disabled' },
              });
              await service.chatOnce!(messages, false);
            })(),
          ).rejects.toThrow('requires thinking mode');
          expect(post).not.toHaveBeenCalled();
        });
      },
    );
  },
);

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

describe.each([
  MODEL_KIMI_K3,
  MODEL_KIMI_K3_1_PRO,
  MODEL_KIMI_K3_1_PRO_HIGHSPEED,
])('%s compatibility', (k3Model) => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['low', 'high', 'max'] as const)(
    'sends Kimi K3 through Chat Completions with %s reasoning',
    async (reasoningEffort) => {
      const postSpy = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
        createOneShotResponse({
          role: 'assistant',
          content: 'K3 response',
          reasoning_content: 'K3 reasoning',
        }),
      );
      const service = new KimiChatService(
        'test-key',
        k3Model,
        k3Model,
        undefined,
        ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
        'short',
        undefined,
        undefined,
        reasoningEffort,
      );

      const result = await service.chatOnce(messages, false);

      expect(postSpy).toHaveBeenCalledWith(
        ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
        expect.objectContaining({
          model: k3Model,
          stream: false,
          messages,
          reasoning_effort: reasoningEffort,
          max_completion_tokens: expect.any(Number),
        }),
        { Authorization: 'Bearer test-key' },
      );
      const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(body.thinking).toBeUndefined();
      expect(body.max_tokens).toBeUndefined();
      expect(result.assistant_message).toEqual({
        role: 'assistant',
        content: 'K3 response',
        reasoning_content: 'K3 reasoning',
      });
    },
  );

  it('preserves Kimi K3 reasoning in streaming completion metadata', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"role":"assistant","reasoning_content":"Think "}}]}\n\n',
        'data: {"choices":[{"delta":{"reasoning_content":"more"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" K3"},"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new KimiChatService(
      'test-key',
      k3Model,
      k3Model,
      undefined,
      ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
      undefined,
      undefined,
      undefined,
      'max',
    );
    const onComplete = vi.fn().mockResolvedValue(undefined);

    await service.processChat(messages, vi.fn(), onComplete);

    expect(onComplete).toHaveBeenCalledWith(
      'Hello K3',
      expect.objectContaining({
        assistant_message: {
          role: 'assistant',
          content: 'Hello K3',
          reasoning_content: 'Think more',
        },
      }),
    );
  });

  it('preserves image input, reasoning and tool calls across turns', async () => {
    const imageMessages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Weather here?' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/image.png' },
          },
        ],
      },
    ];
    const assistant = {
      role: 'assistant',
      content: '',
      reasoning_content: 'Check location',
      tool_calls: [
        {
          id: 'weather-1',
          type: 'function',
          function: { name: 'lookupWeather', arguments: '{"city":"Tokyo"}' },
        },
      ],
    };
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValueOnce(createOneShotResponse(assistant))
      .mockResolvedValueOnce(
        createStreamResponse([
          'data: {"choices":[{"delta":{"reasoning_content":"Use weather"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"Sunny"},"finish_reason":"stop"}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      );
    const service = new KimiChatService('test-key', k3Model, k3Model, tools);
    const first = await service.visionChatOnce(imageMessages, false);
    expect(post.mock.calls[0][0]).toBe(ENDPOINT_KIMI_CHAT_COMPLETIONS_API);
    expect(post.mock.calls[0][1]).toMatchObject({
      model: k3Model,
      messages: imageMessages,
      reasoning_effort: 'low',
      tools: [{ type: 'function', function: { name: 'lookupWeather' } }],
    });
    expect(post.mock.calls[0][1]).not.toHaveProperty('thinking');
    expect(first.assistant_message).toEqual(assistant);
    expect(first.blocks).toContainEqual({
      type: 'tool_use',
      id: 'weather-1',
      name: 'lookupWeather',
      input: { city: 'Tokyo' },
    });
    const continuation = buildToolContinuationMessages({
      provider: 'kimi',
      messages,
      completion: first,
      toolResults: [
        { type: 'tool_result', tool_use_id: 'weather-1', content: 'Sunny' },
      ],
    });
    const partial = vi.fn();
    const second = await service.chatOnce(continuation, true, partial);
    expect(post.mock.calls[1][1].messages).toContainEqual(assistant);
    expect(post.mock.calls[1][1]).toMatchObject({
      model: k3Model,
      stream: true,
      reasoning_effort: 'low',
    });
    expect(second.assistant_message).toMatchObject({
      content: 'Sunny',
      reasoning_content: 'Use weather',
    });
    expect(partial).toHaveBeenCalledWith('Sunny');
  });

  it('keeps thinking enabled for Kimi K2.7 Code when tools are provided', () => {
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K2_7_CODE,
      MODEL_KIMI_K2_7_CODE,
      tools,
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_KIMI_K2_7_CODE,
      true,
    );

    expect(body).toEqual(
      expect.objectContaining({
        model: MODEL_KIMI_K2_7_CODE,
        stream: true,
        thinking: { type: 'enabled' },
        tool_choice: 'auto',
      }),
    );
  });

  it('throws when Kimi K2.7 Code explicitly disables thinking', () => {
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K2_7_CODE,
      MODEL_KIMI_K2_7_CODE,
      undefined,
      undefined,
      undefined,
      undefined,
      { type: 'disabled' },
    );

    expect(() =>
      (service as any).buildRequestBody(messages, MODEL_KIMI_K2_7_CODE, true),
    ).toThrow('requires thinking mode');
  });

  it('keeps existing tool behavior for older Kimi models', () => {
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K2_6,
      MODEL_KIMI_K2_6,
      tools,
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_KIMI_K2_6,
      true,
    );

    expect(body.thinking).toEqual({ type: 'disabled' });
  });
});
