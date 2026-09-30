import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
  MODEL_GLM_5_3_FLASHX,
  getDefaultZaiReasoningEffort,
  getZaiSupportedReasoningEfforts,
} from '../../src/constants';
import { ZAIChatServiceProvider } from '../../src/services/providers/zai/ZAIChatServiceProvider';
import { ZAIChatService } from '../../src/services/providers/zai/ZAIChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { MessageWithVision } from '../../src/types';

const messages = [{ role: 'user' as const, content: 'Hello' }];
const response = () =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: 'Hello from FlashX' } }],
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

describe('GLM-5.3-FlashX', () => {
  afterEach(() => vi.restoreAllMocks());

  it('exposes vision and low/high/max reasoning without changing defaults', () => {
    const provider = new ZAIChatServiceProvider();
    expect(provider.getSupportedModels()).toContain(MODEL_GLM_5_3_FLASHX);
    expect(provider.supportsVisionForModel(MODEL_GLM_5_3_FLASHX)).toBe(true);
    expect(provider.getDefaultModel()).toBe('glm-5.2');
    expect(getDefaultZaiReasoningEffort(MODEL_GLM_5_3_FLASHX)).toBe('low');
    expect(getZaiSupportedReasoningEfforts(MODEL_GLM_5_3_FLASHX)).toEqual([
      'low',
      'high',
      'max',
    ]);
  });

  it('sends the exact model with always-on low thinking and parses text', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(response());
    const service = new ZAIChatServiceProvider().createChatService({
      apiKey: 'test-key',
      model: MODEL_GLM_5_3_FLASHX,
      thinking: { type: 'disabled' },
    });
    const result = await service.chatOnce(messages, false);
    expect(result).toEqual(
      expect.objectContaining({
        blocks: [{ type: 'text', text: 'Hello from FlashX' }],
      }),
    );
    expect(post).toHaveBeenCalledWith(
      ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_GLM_5_3_FLASHX,
        messages,
        thinking: { type: 'enabled', clear_thinking: true },
        reasoning_effort: 'low',
        stream: false,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('uses FlashX for image messages without a hidden fallback', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(response());
    const service = new ZAIChatServiceProvider().createChatService({
      apiKey: 'test-key',
      model: MODEL_GLM_5_3_FLASHX,
      reasoning_effort: 'high',
    });
    const visionMessages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/image.png' },
          },
        ],
      },
    ];
    await service.visionChatOnce(visionMessages, false);
    expect(post.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        model: MODEL_GLM_5_3_FLASHX,
        messages: visionMessages,
        reasoning_effort: 'high',
      }),
    );
  });

  it('keeps direct service construction safe with default effort', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(response());
    const service = new ZAIChatService('test-key', MODEL_GLM_5_3_FLASHX);
    await service.chatOnce(messages, false);
    expect(post.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        thinking: { type: 'enabled', clear_thinking: true },
        reasoning_effort: 'low',
      }),
    );
  });

  it('enables documented tool streaming and parses SSE tool calls', async () => {
    const data = {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: { name: 'weather', arguments: '{"city":"Tokyo"}' },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    };
    const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      new Response(`data: ${JSON.stringify(data)}\n\ndata: [DONE]\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    const service = new ZAIChatServiceProvider().createChatService({
      apiKey: 'test-key',
      model: MODEL_GLM_5_3_FLASHX,
      tools: [
        {
          name: 'weather',
          description: 'Weather',
          parameters: { type: 'object', properties: {} },
        },
      ],
    });
    const result = await service.chatOnce(messages, true);
    expect(post.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        model: MODEL_GLM_5_3_FLASHX,
        stream: true,
        tool_stream: true,
        tool_choice: 'auto',
      }),
    );
    expect(result.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'call_1',
          name: 'weather',
          input: { city: 'Tokyo' },
        }),
      ]),
    );
  });
});
