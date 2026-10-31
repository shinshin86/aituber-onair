import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as models from '../../src/constants';
import { ChatServiceFactory } from '../../src/services/ChatServiceFactory';
import { OpenAIChatServiceProvider } from '../../src/services/providers/openai/OpenAIChatServiceProvider';
import { ClaudeChatServiceProvider } from '../../src/services/providers/claude/ClaudeChatServiceProvider';
import { XAIChatServiceProvider } from '../../src/services/providers/xai/XAIChatServiceProvider';
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
  models.MODEL_OPENAI_GPT_6_1_TERRA,
  models.MODEL_ANTHROPIC_CLAUDE_HAIKU_5_5,
  models.MODEL_INCEPTION_MERCURY_3,
  models.MODEL_OPENROUTER_DEEPSEEK_V4_1_FLASH_1017,
  models.MODEL_MOONSHOTAI_KIMI_K3_1_PRO,
  models.MODEL_MINIMAX_M3_1_FLASH,
  models.MODEL_UNBIASED_PARETO_26_10,
  models.MODEL_INCLUSIONAI_LING_3_0_FLASH_VL,
  models.MODEL_NEX_AGI_NEX_N2_5_PRO,

  models.MODEL_OPENAI_GPT_6_ASTRA,
  models.MODEL_OPENAI_GPT_6_ASTRA_PRO,
  models.MODEL_ANTHROPIC_CLAUDE_FABLE_5_1,
  models.MODEL_OPENROUTER_DEEPSEEK_V4_1_FLASH,
  models.MODEL_GOOGLE_GEMINI_3_8_FLASH,
  models.MODEL_INCEPTION_MERCURY_2_5,
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

  it('defaults GPT-6 Sol to Responses with no reasoning and image input', async () => {
    const post = vi.spyOn(ChatServiceHttpClient, 'post');
    const solResponse = () =>
      createSseResponse([
        'event: response.output_text.delta\n' +
          dataEvent({ delta: 'Sol response' }),
      ]);
    post
      .mockResolvedValueOnce(solResponse())
      .mockResolvedValueOnce(solResponse());
    const provider = new OpenAIChatServiceProvider();
    const service = provider.createChatService({
      apiKey: 'test-key',
      model: models.MODEL_GPT_6_SOL,
    });
    const response = await service.chatOnce!(messages, true);
    const visionResponse = await service.visionChatOnce!(images, true);

    expect(provider.getSupportedModels()).toContain(models.MODEL_GPT_6_SOL);
    expect(provider.supportsVisionForModel(models.MODEL_GPT_6_SOL)).toBe(true);
    expect(post.mock.calls[0][0]).toBe(models.ENDPOINT_OPENAI_RESPONSES_API);
    expect(post.mock.calls[0][1]).toMatchObject({
      model: models.MODEL_GPT_6_SOL,
      reasoning: { effort: 'none' },
    });
    expect(post.mock.calls[1][0]).toBe(models.ENDPOINT_OPENAI_RESPONSES_API);
    expect(post.mock.calls[1][1].input[0].content).toContainEqual(
      expect.objectContaining({ type: 'input_image' }),
    );
    expect(response.blocks).toContainEqual({
      type: 'text',
      text: 'Sol response',
    });
    expect(visionResponse.blocks).toContainEqual({
      type: 'text',
      text: 'Sol response',
    });
    expect(
      ChatServiceFactory.getProviderCapabilities(
        'openai',
        models.MODEL_GPT_6_SOL,
      )?.reasoningEffort,
    ).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
  });

  it.each([undefined, 'none'] as const)(
    'uses GPT-6 Sol Chat Completions with effort %s',
    async (effort) => {
      const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
        jsonResponse({
          choices: [
            { message: { role: 'assistant', content: 'Sol response' } },
          ],
        }),
      );
      const service = new OpenAIChatServiceProvider().createChatService({
        apiKey: 'test-key',
        model: models.MODEL_GPT_6_SOL,
        gpt5EndpointPreference: 'chat',
        reasoning_effort: effort,
      });
      const response = await service.chatOnce!(messages, false);

      expect(post.mock.calls[0][0]).toBe(
        models.ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
      );
      expect(post.mock.calls[0][1]).toMatchObject({
        model: models.MODEL_GPT_6_SOL,
        reasoning_effort: 'none',
      });
      expect(response.blocks).toContainEqual({
        type: 'text',
        text: 'Sol response',
      });
    },
  );

  it('defaults GPT-6 Luna to Responses with tools, no reasoning, and vision', async () => {
    const post = vi.spyOn(ChatServiceHttpClient, 'post');
    const lunaResponse = () =>
      createSseResponse([
        'event: response.output_text.delta\n' +
          dataEvent({ delta: 'Luna response' }),
      ]);
    post
      .mockResolvedValueOnce(lunaResponse())
      .mockResolvedValueOnce(lunaResponse());
    const provider = new OpenAIChatServiceProvider();
    const service = provider.createChatService({
      apiKey: 'test-key',
      model: models.MODEL_GPT_6_LUNA,
      tools,
    });
    const response = await service.chatOnce!(messages, true);
    const visionResponse = await service.visionChatOnce!(images, true);

    expect(provider.getSupportedModels()).toContain(models.MODEL_GPT_6_LUNA);
    expect(provider.supportsVisionForModel(models.MODEL_GPT_6_LUNA)).toBe(true);
    expect(post.mock.calls[0][0]).toBe(models.ENDPOINT_OPENAI_RESPONSES_API);
    expect(post.mock.calls[0][1]).toMatchObject({
      model: models.MODEL_GPT_6_LUNA,
      reasoning: { effort: 'none' },
      tools: [expect.objectContaining({ type: 'function' })],
    });
    expect(post.mock.calls[1][0]).toBe(models.ENDPOINT_OPENAI_RESPONSES_API);
    expect(post.mock.calls[1][1].input[0].content).toContainEqual(
      expect.objectContaining({ type: 'input_image' }),
    );
    expect(response.blocks).toContainEqual({
      type: 'text',
      text: 'Luna response',
    });
    expect(visionResponse.blocks).toContainEqual({
      type: 'text',
      text: 'Luna response',
    });
    expect(
      ChatServiceFactory.getProviderCapabilities(
        'openai',
        models.MODEL_GPT_6_LUNA,
      )?.reasoningEffort,
    ).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
  });

  it.each([undefined, 'none'] as const)(
    'uses GPT-6 Luna Chat Completions with effort %s',
    async (effort) => {
      const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
        jsonResponse({
          choices: [
            { message: { role: 'assistant', content: 'Luna response' } },
          ],
        }),
      );
      const service = new OpenAIChatServiceProvider().createChatService({
        apiKey: 'test-key',
        model: models.MODEL_GPT_6_LUNA,
        tools,
        gpt5EndpointPreference: 'chat',
        reasoning_effort: effort,
      });
      const response = await service.chatOnce!(messages, false);

      expect(post.mock.calls[0][0]).toBe(
        models.ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
      );
      expect(post.mock.calls[0][1]).toMatchObject({
        model: models.MODEL_GPT_6_LUNA,
        reasoning_effort: 'none',
        tools: [expect.objectContaining({ type: 'function' })],
      });
      expect(response.blocks).toContainEqual({
        type: 'text',
        text: 'Luna response',
      });
    },
  );

  describe.each([models.MODEL_GPT_6_SOL, models.MODEL_GPT_6_LUNA])(
    '%s explicit reasoning',
    (model) => {
      it.each(['low', 'medium', 'high', 'xhigh', 'max'] as const)(
        'keeps %s effort on Responses even with a Chat Completions preference',
        async (effort) => {
          const post = vi
            .spyOn(ChatServiceHttpClient, 'post')
            .mockResolvedValue(
              jsonResponse({
                output: [
                  {
                    type: 'message',
                    content: [{ type: 'output_text', text: 'Hello' }],
                  },
                ],
              }),
            );
          const service = new OpenAIChatServiceProvider().createChatService({
            apiKey: 'test-key',
            model,
            tools,
            gpt5EndpointPreference: 'chat',
            reasoning_effort: effort,
          });
          await service.chatOnce!(messages, false);
          expect(post.mock.calls[0][0]).toBe(
            models.ENDPOINT_OPENAI_RESPONSES_API,
          );
          expect(post.mock.calls[0][1].reasoning).toEqual({ effort });
        },
      );
    },
  );

  it('sends Claude Opus 5.5 image requests through the Messages API', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(
        jsonResponse({ content: [{ type: 'text', text: 'Claude response' }] }),
      );
    const provider = new ClaudeChatServiceProvider();
    const service = provider.createChatService({
      apiKey: 'test-key',
      model: models.MODEL_CLAUDE_5_5_OPUS,
    });
    const response = await service.visionChatOnce!(images, false);

    expect(provider.getSupportedModels()).toContain(
      models.MODEL_CLAUDE_5_5_OPUS,
    );
    expect(provider.supportsVisionForModel(models.MODEL_CLAUDE_5_5_OPUS)).toBe(
      true,
    );
    expect(post.mock.calls[0][0]).toBe(models.ENDPOINT_CLAUDE_API);
    expect(post.mock.calls[0][1]).toMatchObject({
      model: models.MODEL_CLAUDE_5_5_OPUS,
      messages: [
        {
          content: expect.arrayContaining([
            expect.objectContaining({ type: 'image' }),
          ]),
        },
      ],
    });
    expect(post.mock.calls[0][1].output_config).toBeUndefined();
    expect(response.blocks).toContainEqual({
      type: 'text',
      text: 'Claude response',
    });
  });

  it('sends Claude Sonnet 5.5 image requests with effort through the Messages API', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(
        jsonResponse({ content: [{ type: 'text', text: 'Claude response' }] }),
      );
    const provider = new ClaudeChatServiceProvider();
    const service = provider.createChatService({
      apiKey: 'test-key',
      model: models.MODEL_CLAUDE_5_5_SONNET,
      reasoning_effort: 'medium',
    });
    const response = await service.visionChatOnce!(images, false);

    expect(provider.getSupportedModels()).toContain(
      models.MODEL_CLAUDE_5_5_SONNET,
    );
    expect(
      provider.supportsVisionForModel(models.MODEL_CLAUDE_5_5_SONNET),
    ).toBe(true);
    expect(post.mock.calls[0][0]).toBe(models.ENDPOINT_CLAUDE_API);
    expect(post.mock.calls[0][1]).toMatchObject({
      model: models.MODEL_CLAUDE_5_5_SONNET,
      output_config: { effort: 'medium' },
      messages: [
        {
          content: expect.arrayContaining([
            expect.objectContaining({ type: 'image' }),
          ]),
        },
      ],
    });
    expect(post.mock.calls[0][1].thinking).toBeUndefined();
    expect(response.blocks).toContainEqual({
      type: 'text',
      text: 'Claude response',
    });
  });

  it('keeps Claude Sonnet 5.5 tool selection automatic', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(
        jsonResponse({ content: [{ type: 'text', text: 'Claude response' }] }),
      );
    const service = new ClaudeChatServiceProvider().createChatService({
      apiKey: 'test-key',
      model: models.MODEL_CLAUDE_5_5_SONNET,
      tools,
    });
    await service.chatOnce!(messages, false);

    expect(post.mock.calls[0][1]).toMatchObject({
      model: models.MODEL_CLAUDE_5_5_SONNET,
      tools: [expect.objectContaining({ name: 'lookup' })],
      tool_choice: { type: 'auto' },
    });
  });

  it('sends Grok 4.7 through xAI Chat Completions with vision and default effort', async () => {
    const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      jsonResponse({
        choices: [{ message: { role: 'assistant', content: 'Grok response' } }],
      }),
    );
    const provider = new XAIChatServiceProvider();
    const service = provider.createChatService({
      apiKey: 'test-key',
      model: models.MODEL_GROK_4_7,
    });
    const response = await service.visionChatOnce!(images, false);

    expect(provider.getSupportedModels()).toContain(models.MODEL_GROK_4_7);
    expect(provider.supportsVisionForModel(models.MODEL_GROK_4_7)).toBe(true);
    expect(post.mock.calls[0][0]).toBe(
      models.ENDPOINT_XAI_CHAT_COMPLETIONS_API,
    );
    expect(post.mock.calls[0][1]).toMatchObject({
      model: models.MODEL_GROK_4_7,
      reasoning_effort: 'low',
      messages: [
        {
          content: expect.arrayContaining([
            expect.objectContaining({ type: 'image_url' }),
          ]),
        },
      ],
    });
    expect(response.blocks).toContainEqual({
      type: 'text',
      text: 'Grok response',
    });
    expect(
      models.getXaiSupportedReasoningEfforts(models.MODEL_GROK_4_7),
    ).toEqual(['low', 'medium', 'high', 'xhigh']);
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
      const vision = ![
        models.MODEL_INCEPTION_MERCURY_2_5,
        models.MODEL_INCEPTION_MERCURY_3,
      ].includes(model);
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
      else expect(body.reasoning?.effort).toBeUndefined();
      if (model === models.MODEL_ANTHROPIC_CLAUDE_FABLE_5_1)
        expect(body.tool_choice).toBeUndefined();
    },
  );
});

describe('October explicit OpenRouter reasoning profiles', () => {
  beforeEach(() => vi.restoreAllMocks());

  const profiles = [
    {
      model: models.MODEL_OPENAI_GPT_6_1_TERRA,
      efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      defaultEffort: 'none',
    },
    {
      model: models.MODEL_ANTHROPIC_CLAUDE_HAIKU_5_5,
      efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      defaultEffort: 'low',
    },
    {
      model: models.MODEL_INCEPTION_MERCURY_3,
      efforts: ['none', 'low', 'medium', 'high'],
      defaultEffort: 'none',
    },
    {
      model: models.MODEL_OPENROUTER_DEEPSEEK_V4_1_FLASH_1017,
      efforts: ['none', 'low', 'high', 'max'],
      defaultEffort: 'none',
    },
    {
      model: models.MODEL_MOONSHOTAI_KIMI_K3_1_PRO,
      efforts: ['none', 'low', 'high', 'max'],
      defaultEffort: 'none',
    },
    {
      model: models.MODEL_MINIMAX_M3_1_FLASH,
      efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
      defaultEffort: 'low',
    },
    {
      model: models.MODEL_UNBIASED_PARETO_26_10,
      efforts: [],
      defaultEffort: undefined,
    },
    {
      model: models.MODEL_INCLUSIONAI_LING_3_0_FLASH_VL,
      efforts: [],
      defaultEffort: undefined,
    },
    {
      model: models.MODEL_NEX_AGI_NEX_N2_5_PRO,
      efforts: ['none', 'medium', 'high'],
      defaultEffort: 'none',
    },
  ] as const;

  it.each(profiles)(
    '$model sends only catalog effort values',
    async ({ model, efforts, defaultEffort }) => {
      expect(models.getOpenRouterSupportedReasoningEfforts(model)).toEqual(
        efforts,
      );
      expect(models.getDefaultOpenRouterReasoningEffort(model)).toBe(
        defaultEffort,
      );
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockImplementation(async () =>
          jsonResponse({ choices: [{ message: { content: 'ok' } }] }),
        );
      for (const requested of [
        undefined,
        'none',
        'minimal',
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
      ] as const) {
        const service = new OpenRouterChatServiceProvider().createChatService({
          apiKey: 'test-key',
          model,
          reasoning_effort: requested,
        });
        await service.chatOnce!(messages, false);
        const body = post.mock.calls.at(-1)![1];
        const allowed: readonly string[] = efforts;
        expect(body.reasoning?.effort).toBe(
          requested && allowed.includes(requested) ? requested : defaultEffort,
        );
        if (model === models.MODEL_UNBIASED_PARETO_26_10)
          expect(body.reasoning).toBeUndefined();
      }
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
