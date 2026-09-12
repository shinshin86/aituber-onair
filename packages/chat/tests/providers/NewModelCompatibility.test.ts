import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as models from '../../src/constants';
import { ChatServiceFactory } from '../../src/services/ChatServiceFactory';
import { OpenAIChatServiceProvider } from '../../src/services/providers/openai/OpenAIChatServiceProvider';
import { ClaudeChatServiceProvider } from '../../src/services/providers/claude/ClaudeChatServiceProvider';
import { DeepSeekChatServiceProvider } from '../../src/services/providers/deepseek/DeepSeekChatServiceProvider';
import { OpenRouterChatServiceProvider } from '../../src/services/providers/openrouter/OpenRouterChatServiceProvider';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import { createSseResponse } from '../helpers/sse';
import type {
  Message,
  MessageWithVision,
  ToolDefinition,
} from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'Hello' }];
const images: MessageWithVision[] = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Describe this image' },
      {
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,aW1hZ2U=' },
      },
    ],
  },
];
const tools: ToolDefinition[] = [
  {
    name: 'lookup',
    description: 'Lookup a value',
    parameters: { type: 'object', properties: {} },
  },
];
const jsonResponse = (data: unknown) =>
  ({ json: async () => data }) as Response;
const dataEvent = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;

const routerModels = [
  models.MODEL_OPENAI_GPT_6_ASTRA,
  models.MODEL_OPENAI_GPT_6_ASTRA_PRO,
  models.MODEL_ANTHROPIC_CLAUDE_FABLE_5_1,
  models.MODEL_OPENROUTER_DEEPSEEK_V4_1_FLASH,
  models.MODEL_GOOGLE_GEMINI_3_8_FLASH,
  models.MODEL_INCLUSIONAI_LING_3_0_FLASH_VL_FREE,
  models.MODEL_INCEPTION_MERCURY_2_5,
  models.MODEL_NEX_AGI_NEX_N2_5_MINI_FREE,
  models.MODEL_NEX_AGI_NEX_N2_5_PRO_FREE,
  models.MODEL_QWEN_QWEN_3_8_MAX_0902,
  models.MODEL_META_MUSE_SPARK_1_3,
];

describe('New model endpoint compatibility', () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each(['none', 'minimal', 'low', 'max'] as const)(
    'routes Astra tools to Responses and normalizes %s',
    async (effort) => {
      const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
        jsonResponse({
          output: [
            {
              type: 'function_call',
              id: 'item-1',
              call_id: 'call-1',
              name: 'lookup',
              arguments: '{}',
            },
          ],
        }),
      );
      const provider = new OpenAIChatServiceProvider();
      const service = provider.createChatService({
        apiKey: 'test-key',
        model: models.MODEL_GPT_6_ASTRA,
        tools,
        gpt5EndpointPreference: 'chat',
        reasoning_effort: effort,
      });
      const result = await service.chatOnce!(messages, false);
      expect(provider.getSupportedModels()).toContain(models.MODEL_GPT_6_ASTRA);
      expect(provider.supportsVisionForModel(models.MODEL_GPT_6_ASTRA)).toBe(
        true,
      );
      expect(models.isGPT5Model(models.MODEL_GPT_6_ASTRA)).toBe(false);
      expect(
        ChatServiceFactory.getProviderCapabilities(
          'openai',
          models.MODEL_GPT_6_ASTRA,
        )?.reasoningEffort,
      ).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
      expect(post.mock.calls[0][0]).toBe(models.ENDPOINT_OPENAI_RESPONSES_API);
      expect(post.mock.calls[0][1]).toMatchObject({
        model: models.MODEL_GPT_6_ASTRA,
        stream: false,
        reasoning: { effort: effort === 'max' ? 'max' : 'low' },
        tools: [{ type: 'function', name: 'lookup' }],
      });
      expect(post.mock.calls[0][1].temperature).toBeUndefined();
      expect(result.blocks).toContainEqual({
        type: 'tool_use',
        id: 'call-1',
        name: 'lookup',
        input: {},
      });
    },
  );

  it('routes an Astra vision model with a different text model and normalizes its effort', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(
        createSseResponse([
          'event: response.output_text.delta\n' +
            dataEvent({ delta: 'Image description' }),
        ]),
      );
    const service = new OpenAIChatServiceProvider().createChatService({
      apiKey: 'test-key',
      model: models.MODEL_GPT_5_NANO,
      visionModel: models.MODEL_GPT_6_ASTRA,
      reasoning_effort: 'minimal',
    });
    const partial = vi.fn();
    const result = await service.visionChatOnce!(images, true, partial);
    expect(post.mock.calls[0][0]).toBe(models.ENDPOINT_OPENAI_RESPONSES_API);
    expect(post.mock.calls[0][1]).toMatchObject({
      model: models.MODEL_GPT_6_ASTRA,
      reasoning: { effort: 'low' },
    });
    expect(post.mock.calls[0][1].input[0].content).toContainEqual(
      expect.objectContaining({ type: 'input_image' }),
    );
    expect(partial).toHaveBeenCalledWith('Image description');
    expect(result.blocks).toContainEqual({
      type: 'text',
      text: 'Image description',
    });
  });

  it('keeps Fable 5.1 thinking and tool blocks for continuation through Messages', async () => {
    const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createSseResponse([
        dataEvent({
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'thinking', thinking: '' },
        }),
        dataEvent({
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'thinking_delta', thinking: 'Reasoning' },
        }),
        dataEvent({
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'signature_delta', signature: 'test-signature' },
        }),
        dataEvent({
          type: 'content_block_start',
          index: 1,
          content_block: {
            type: 'tool_use',
            id: 'call-1',
            name: 'lookup',
            input: {},
          },
        }),
        dataEvent({
          type: 'content_block_delta',
          index: 1,
          delta: { type: 'input_json_delta', partial_json: '{}' },
        }),
        dataEvent({ type: 'content_block_stop', index: 1 }),
      ]),
    );
    const provider = new ClaudeChatServiceProvider();
    const service = provider.createChatService({
      apiKey: 'test-key',
      model: models.MODEL_CLAUDE_5_1_FABLE,
      reasoning_effort: 'max',
      tools,
    });
    const result = await service.chatOnce!(messages, true);
    expect(post.mock.calls[0][0]).toBe(models.ENDPOINT_CLAUDE_API);
    expect(post.mock.calls[0][1]).toMatchObject({
      model: models.MODEL_CLAUDE_5_1_FABLE,
      tool_choice: { type: 'auto' },
      output_config: { effort: 'max' },
    });
    expect(post.mock.calls[0][1].thinking).toBeUndefined();
    expect(result.assistant_message?.provider_content).toContainEqual({
      type: 'thinking',
      thinking: 'Reasoning',
      signature: 'test-signature',
    });
    post.mockResolvedValue(
      jsonResponse({ content: [{ type: 'text', text: 'Done' }] }),
    );
    await service.chatOnce!(
      [
        ...messages,
        result.assistant_message!,
        { role: 'tool', tool_call_id: 'call-1', content: 'value' },
      ],
      false,
    );
    expect(post.mock.calls[1][1].messages[1].content).toContainEqual({
      type: 'thinking',
      thinking: 'Reasoning',
      signature: 'test-signature',
    });
    expect(provider.supportsVisionForModel(models.MODEL_CLAUDE_5_1_FABLE)).toBe(
      true,
    );
  });

  it('sends DeepSeek Flash image input and parses non-thinking tool calls', async () => {
    const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content: '',
              reasoning_content: 'Reasoning',
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'lookup', arguments: '{}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
    );
    const provider = new DeepSeekChatServiceProvider();
    const service = provider.createChatService({
      apiKey: 'test-key',
      model: models.MODEL_DEEPSEEK_FLASH,
      tools,
      reasoning_effort: 'none',
    });
    const result = await service.visionChatOnce!(images, false);
    expect(provider.getSupportedModels()).toContain(
      models.MODEL_DEEPSEEK_FLASH,
    );
    expect(post.mock.calls[0][0]).toBe(
      models.ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
    );
    expect(post.mock.calls[0][1]).toMatchObject({
      model: models.MODEL_DEEPSEEK_FLASH,
      messages: images,
      thinking: { type: 'disabled' },
    });
    expect(() =>
      provider.createChatService({
        apiKey: 'test-key',
        model: models.MODEL_DEEPSEEK_FLASH,
        tools,
        reasoning_effort: 'low',
      }),
    ).toThrow('thinking with tools');
    expect(result.stop_reason).toBe('tool_use');
  });

  it.each([
    [models.MODEL_OPENAI_GPT_6_ASTRA, 'none', 'medium'],
    [models.MODEL_OPENAI_GPT_6_ASTRA_PRO, 'none', 'medium'],
    [models.MODEL_ANTHROPIC_CLAUDE_FABLE_5_1, 'none', 'high'],
    [models.MODEL_GOOGLE_GEMINI_3_8_FLASH, 'none', 'medium'],
    [models.MODEL_QWEN_QWEN_3_8_MAX_0902, 'none', 'xhigh'],
    [models.MODEL_META_MUSE_SPARK_1_3, 'none', 'medium'],
    [models.MODEL_QWEN_QWEN_3_8_MAX_0902, 'minimal', 'minimal'],
    [models.MODEL_META_MUSE_SPARK_1_3, 'minimal', 'minimal'],
    [models.MODEL_NEX_AGI_NEX_N2_5_MINI_FREE, 'low', 'none'],
    [models.MODEL_INCEPTION_MERCURY_2_5, 'max', 'none'],
    [models.MODEL_INCLUSIONAI_LING_3_0_FLASH_VL_FREE, 'high', undefined],
  ] as const)(
    'normalizes %s effort %s to %s on the wire',
    async (model, requested, expected) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(
          jsonResponse({ choices: [{ message: { content: 'ok' } }] }),
        );
      const service = new OpenRouterChatServiceProvider().createChatService({
        apiKey: 'test-key',
        model,
        reasoning_effort: requested,
      });
      await service.chatOnce!(messages, false);
      expect(post.mock.calls[0][1].reasoning.effort).toBe(expected);
    },
  );

  it.each(routerModels)(
    'streams %s tool calls with valid capabilities and options',
    async (model) => {
      const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
        createSseResponse([
          dataEvent({
            choices: [
              {
                delta: {
                  content: 'Checking. ',
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call-1',
                      type: 'function',
                      function: { name: 'lookup', arguments: '{}' },
                    },
                  ],
                },
              },
            ],
          }),
          dataEvent({
            choices: [{ delta: {}, finish_reason: 'tool_calls' }],
          }),
          'data: [DONE]\n\n',
        ]),
      );
      const provider = new OpenRouterChatServiceProvider();
      const vision = model !== models.MODEL_INCEPTION_MERCURY_2_5;
      expect(provider.getSupportedModels()).toContain(model);
      expect(provider.supportsVisionForModel(model)).toBe(vision);
      if (model.endsWith(':free'))
        expect(provider.getFreeModels()).toContain(model);
      const service = provider.createChatService({
        apiKey: 'test-key',
        model,
        tools,
        reasoning_effort: 'none',
      });
      const result = vision
        ? await service.visionChatOnce!(images, true)
        : await service.chatOnce!(messages, true);
      expect(post.mock.calls[0][0]).toBe(models.ENDPOINT_OPENROUTER_API);
      const body = post.mock.calls[0][1];
      expect(body).toMatchObject({
        model,
        stream: true,
        messages: vision ? images : messages,
      });
      expect(result.blocks).toContainEqual({
        type: 'tool_use',
        id: 'call-1',
        name: 'lookup',
        input: {},
      });
      const allowed = models.getOpenRouterSupportedReasoningEfforts(model);
      if (allowed.length) expect(allowed).toContain(body.reasoning.effort);
      else expect(body.reasoning.effort).toBeUndefined();
      if (model === models.MODEL_ANTHROPIC_CLAUDE_FABLE_5_1)
        expect(body.tool_choice).toBeUndefined();
    },
  );
});

describe('Existing public API compatibility', () => {
  it('preserves the GPT-5 helper return type and defaults', () => {
    const effort: 'none' | 'minimal' | 'medium' =
      models.getDefaultReasoningEffortForGPT5Model(models.MODEL_GPT_5_6);
    expect(effort).toBe('none');
    expect(
      models.getDefaultReasoningEffortForOpenAIModel(models.MODEL_GPT_6_ASTRA),
    ).toBe('low');
  });

  it.each(['toString', 'constructor', '__proto__'])(
    'preserves fallback reasoning for custom model %s',
    (model) => {
      expect(models.getOpenRouterSupportedReasoningEfforts(model)).toEqual(
        models.getOpenRouterSupportedReasoningEfforts('custom/model'),
      );
      expect(models.getDefaultOpenRouterReasoningEffort(model)).toBeUndefined();
      expect(models.normalizeOpenRouterReasoningEffort(model, 'low')).toBe(
        'low',
      );
    },
  );
});
