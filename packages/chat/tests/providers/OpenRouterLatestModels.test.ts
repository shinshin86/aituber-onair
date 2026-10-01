import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_OPENROUTER_API,
  MODEL_OPENAI_GPT_6_1_SOL,
  MODEL_OPENAI_GPT_6_SOL,
  MODEL_OPENAI_GPT_6_LUNA,
  MODEL_ANTHROPIC_CLAUDE_SONNET_5_5,
  MODEL_ANTHROPIC_CLAUDE_OPUS_5_5,
  MODEL_XAI_GROK_4_7,
  MODEL_ZAI_GLM_5_3_FLASHX,
  getDefaultOpenRouterReasoningEffort,
  getOpenRouterSupportedReasoningEfforts,
  normalizeOpenRouterReasoningEffort,
} from '../../src/constants/openrouter';
import { OpenRouterChatServiceProvider } from '../../src/services/providers/openrouter/OpenRouterChatServiceProvider';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message, MessageWithVision } from '../../src/types';
import { createSseResponse } from '../helpers/sse';

const cases = [
  { model: MODEL_OPENAI_GPT_6_1_SOL, effort: 'low', maximum: 'max' },
  { model: MODEL_OPENAI_GPT_6_SOL, effort: 'none', maximum: 'max' },
  { model: MODEL_OPENAI_GPT_6_LUNA, effort: 'none', maximum: 'max' },
  { model: MODEL_ANTHROPIC_CLAUDE_SONNET_5_5, effort: 'low', maximum: 'max' },
  { model: MODEL_ANTHROPIC_CLAUDE_OPUS_5_5, effort: 'low', maximum: 'max' },
  { model: MODEL_XAI_GROK_4_7, effort: 'low', maximum: 'xhigh' },
  { model: MODEL_ZAI_GLM_5_3_FLASHX, effort: 'low', maximum: 'max' },
] as const;
const provider = new OpenRouterChatServiceProvider();
const messages: Message[] = [{ role: 'user', content: 'hello' }];
const tools = [{ name: 'lookup', parameters: { type: 'object' as const } }];

afterEach(() => vi.restoreAllMocks());

describe.each(cases)(
  'New OpenRouter model $model',
  ({ model, effort, maximum }) => {
    it('exposes vision and valid low-latency reasoning without changing the provider default', () => {
      expect(provider.getSupportedModels()).toContain(model);
      expect(provider.supportsVisionForModel(model)).toBe(true);
      expect(provider.getDefaultModel()).not.toBe(model);
      expect(getDefaultOpenRouterReasoningEffort(model)).toBe(effort);
      expect(getOpenRouterSupportedReasoningEfforts(model)).toContain(maximum);
      expect(getOpenRouterSupportedReasoningEfforts(model)).not.toContain(
        'minimal',
      );
      expect(normalizeOpenRouterReasoningEffort(model, 'minimal')).toBe(effort);
      expect(normalizeOpenRouterReasoningEffort(model, maximum)).toBe(maximum);
      expect(normalizeOpenRouterReasoningEffort(model, 'none')).toBe(effort);
    });

    it('uses normalized Chat Completions and parses streamed function calls with auto tool choice', async () => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(
          createSseResponse([
            `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'lookup', arguments: '{}' } }] } }] })}\n\n`,
            'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
            'data: [DONE]\n\n',
          ]),
        );
      const service = provider.createChatService({
        apiKey: 'test-key',
        model,
        tools,
      });
      const result = await service.chatOnce!(messages, true);
      expect(post).toHaveBeenCalledWith(
        ENDPOINT_OPENROUTER_API,
        expect.objectContaining({
          model,
          messages,
          stream: true,
          reasoning: { effort, exclude: true },
          tools: [
            {
              type: 'function',
              function: { name: 'lookup', parameters: { type: 'object' } },
            },
          ],
          tool_choice: 'auto',
        }),
        { Authorization: 'Bearer test-key' },
      );
      expect(result.blocks).toContainEqual({
        type: 'tool_use',
        id: 'call_1',
        name: 'lookup',
        input: {},
      });
      expect(result.stop_reason).toBe('tool_use');
    });

    it('preserves explicit effort and image input on the one-shot vision route', async () => {
      const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue({
        json: async () => ({
          choices: [
            { message: { content: 'image described' }, finish_reason: 'stop' },
          ],
        }),
      } as Response);
      const visionMessages: MessageWithVision[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'describe' },
            {
              type: 'image_url',
              image_url: { url: 'data:image/png;base64,AAAA' },
            },
          ],
        },
      ];
      const service = provider.createChatService({
        apiKey: 'test-key',
        model,
        visionModel: model,
        reasoning_effort: maximum,
      });
      const result = await service.visionChatOnce!(visionMessages, false);
      expect(post).toHaveBeenCalledWith(
        ENDPOINT_OPENROUTER_API,
        expect.objectContaining({
          model,
          messages: visionMessages,
          stream: false,
          reasoning: { effort: maximum, exclude: true },
        }),
        { Authorization: 'Bearer test-key' },
      );
      expect(result.blocks).toContainEqual({
        type: 'text',
        text: 'image described',
      });
    });
  },
);

it('preserves an explicit OpenRouter FlashX output-token limit', async () => {
  const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue({
    json: async () => ({ choices: [{ message: { content: 'Hello' } }] }),
  } as Response);
  const service = provider.createChatService({
    apiKey: 'test-key',
    model: MODEL_ZAI_GLM_5_3_FLASHX,
  });
  await service.chatOnce!(messages, false, () => {}, 1234);
  expect(post).toHaveBeenCalledWith(
    ENDPOINT_OPENROUTER_API,
    expect.objectContaining({
      model: MODEL_ZAI_GLM_5_3_FLASHX,
      max_tokens: 1234,
    }),
    { Authorization: 'Bearer test-key' },
  );
});
