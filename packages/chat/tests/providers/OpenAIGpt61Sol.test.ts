import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  MODEL_GPT_6_1_SOL,
  MODEL_GPT_6_1_TERRA,
  MODEL_GPT_5_NANO,
  MODEL_GPT_5_6_LUNA,
  MODEL_GPT_4O_MINI,
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  allowsReasoningNone,
  allowsReasoningMinimal,
  allowsReasoningLow,
  allowsReasoningXHigh,
  allowsReasoningMax,
  getDefaultReasoningEffortForOpenAIModel,
  isGPT5Model,
  isOpenAIReasoningModel,
} from '../../src';
import { OpenAIChatService } from '../../src/services/providers/openai/OpenAIChatService';
import { OpenAIChatServiceProvider } from '../../src/services/providers/openai/OpenAIChatServiceProvider';
import { OpenAICompatibleChatServiceProvider } from '../../src/services/providers/openaiCompatible/OpenAICompatibleChatServiceProvider';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import { createSseResponse } from '../helpers/sse';
import type {
  OpenAIReasoningEffort,
  Message,
  MessageWithVision,
  ToolDefinition,
} from '../../src';

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
const mcpServers = [{ name: 'lookup', url: 'https://example.com/mcp' }];
const jsonResponse = (data: unknown) =>
  ({ json: async () => data }) as Response;
const event = (type: string, data: unknown) =>
  `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
const textOutput = [
  { type: 'message', content: [{ type: 'output_text', text: 'Hello' }] },
];

// Mocked transports only: no provider API requests are made by these tests.
describe.each([
  {
    model: MODEL_GPT_6_1_SOL,
    id: 'gpt-6.1-sol',
    label: 'GPT-6.1 Sol',
    none: false,
  },
  {
    model: MODEL_GPT_6_1_TERRA,
    id: 'gpt-6.1-terra',
    label: 'GPT-6.1 Terra',
    none: true,
  },
])('$label compatibility', ({ model, id, label, none }) => {
  const normalized = (effort?: OpenAIReasoningEffort) => {
    if (effort === undefined) return 'low';
    if (effort === 'minimal') return none ? 'none' : 'low';
    if (effort === 'none' && !none) return 'low';
    return effort;
  };

  beforeEach(() => vi.restoreAllMocks());

  it('exports an explicit vision/reasoning option without changing the provider default', () => {
    const provider = new OpenAIChatServiceProvider();
    expect(model).toBe(id);
    expect(provider.getSupportedModels()).toContain(model);
    expect(provider.getDefaultModel()).toBe(MODEL_GPT_5_6_LUNA);
    expect(provider.supportsVisionForModel(model)).toBe(true);
    expect(isGPT5Model(model)).toBe(false);
    expect(isOpenAIReasoningModel(model)).toBe(true);
    expect(allowsReasoningNone(model)).toBe(none);
    expect(allowsReasoningMinimal(model)).toBe(false);
    expect(allowsReasoningLow(model)).toBe(true);
    expect(allowsReasoningXHigh(model)).toBe(true);
    expect(allowsReasoningMax(model)).toBe(true);
    expect(getDefaultReasoningEffortForOpenAIModel(model)).toBe('low');
    expect(
      ChatServiceFactory.getProviderCapabilities('openai', model),
    ).toMatchObject({
      vision: 'supported',
      streaming: true,
      tools: true,
      reasoningEffort: [
        ...(none ? ['none'] : []),
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
      ],
    });
  });

  it.each([
    undefined,
    'none',
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
  ] as const)(
    'normalizes %s reasoning and uses Responses by default',
    async (effort) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(jsonResponse({ output: textOutput }));
      const service = new OpenAIChatServiceProvider().createChatService({
        apiKey: 'test-key',
        model,
        reasoning_effort: effort,
        responseLength: 'short',
      });
      const result = await service.chatOnce!(messages, false);
      const body = post.mock.calls[0][1];
      expect(post.mock.calls[0][0]).toBe(ENDPOINT_OPENAI_RESPONSES_API);
      expect(body).toMatchObject({
        model,
        input: messages,
        stream: false,
        reasoning: {
          effort: normalized(effort),
        },
      });
      expect(body.max_output_tokens).toBeGreaterThanOrEqual(
        normalized(effort) === 'none' ? 1200 : 2500,
      );
      for (const key of [
        'temperature',
        'top_p',
        'logprobs',
        'top_logprobs',
        'messages',
        'reasoning_effort',
      ]) {
        expect(body[key]).toBeUndefined();
      }
      expect(result.blocks).toEqual([{ type: 'text', text: 'Hello' }]);
    },
  );

  it('normalizes the casual GPT-5 preset without changing the user options', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(jsonResponse({ output: textOutput }));
    const options = {
      apiKey: 'test-key',
      model,
      gpt5Preset: 'casual' as const,
    };
    const service = new OpenAIChatServiceProvider().createChatService(options);
    await service.chatOnce!(messages, false);
    expect(post.mock.calls[0][1].reasoning).toEqual({
      effort: normalized('none'),
    });
    expect(options).toEqual({
      apiKey: 'test-key',
      model,
      gpt5Preset: 'casual',
    });
  });

  it('streams chat and vision text through Responses', async () => {
    const response = () =>
      createSseResponse([
        event('response.output_text.delta', { delta: 'Hello' }),
        event('response.completed', { response: { status: 'completed' } }),
      ]);
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response());
    const service = new OpenAIChatServiceProvider().createChatService({
      apiKey: 'test-key',
      model,
    });
    const partial = vi.fn();
    const complete = vi.fn(async () => {});
    await service.processChat(messages, partial, complete);
    await service.processVisionChat(images, partial, complete);
    expect(partial).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenNthCalledWith(1, 'Hello');
    expect(complete).toHaveBeenNthCalledWith(2, 'Hello');
    expect(post.mock.calls[1][0]).toBe(ENDPOINT_OPENAI_RESPONSES_API);
    expect(post.mock.calls[1][1].input[0].content).toEqual([
      { type: 'input_text', text: 'Describe this image' },
      { type: 'input_image', image_url: 'data:image/png;base64,aW1hZ2U=' },
    ]);
  });

  it.each([false, true])(
    'supports tool-free Chat Completions with stream=%s',
    async (stream) => {
      const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
        stream
          ? createSseResponse([
              `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] })}\n\n`,
              'data: [DONE]\n\n',
            ])
          : jsonResponse({
              choices: [{ message: { role: 'assistant', content: 'Hello' } }],
            }),
      );
      const service = new OpenAIChatServiceProvider().createChatService({
        apiKey: 'test-key',
        model,
        gpt5EndpointPreference: 'chat',
        reasoning_effort: 'max',
      });
      const result = await service.visionChatOnce!(images, stream);
      expect(post.mock.calls[0][0]).toBe(ENDPOINT_OPENAI_CHAT_COMPLETIONS_API);
      expect(post.mock.calls[0][1]).toMatchObject({
        model,
        messages: images,
        reasoning_effort: 'max',
        stream,
      });
      expect(post.mock.calls[0][1].tools).toBeUndefined();
      expect(result.blocks).toEqual([{ type: 'text', text: 'Hello' }]);
    },
  );

  it.each(['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const)(
    'uses tool-free Chat Completions with %s and no sampling fields',
    async (effort) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(
          jsonResponse({ choices: [{ message: { content: 'Hello' } }] }),
        );
      const service = new OpenAIChatServiceProvider().createChatService({
        apiKey: 'test-key',
        model,
        gpt5EndpointPreference: 'chat',
        reasoning_effort: effort,
      });
      await service.chatOnce!(messages, false);
      expect(post.mock.calls[0][0]).toBe(ENDPOINT_OPENAI_CHAT_COMPLETIONS_API);
      const body = post.mock.calls[0][1];
      expect(body.reasoning_effort).toBe(normalized(effort));
      for (const key of [
        'temperature',
        'top_p',
        'top_logprobs',
        'logprobs',
        'tools',
      ]) {
        expect(body[key]).toBeUndefined();
      }
    },
  );

  it.each([
    ['chat', undefined],
    ['auto', undefined],
    ['responses', undefined],
    ['chat', ENDPOINT_OPENAI_CHAT_COMPLETIONS_API],
    ['auto', ENDPOINT_OPENAI_CHAT_COMPLETIONS_API],
    ['responses', ENDPOINT_OPENAI_CHAT_COMPLETIONS_API],
  ] as const)(
    'routes tools to Responses with preference %s and endpoint %s',
    async (preference, endpoint) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(jsonResponse({ output: textOutput }));
      const service = new OpenAIChatServiceProvider().createChatService({
        apiKey: 'test-key',
        model,
        tools,
        gpt5EndpointPreference: preference,
        endpoint,
      });
      await service.chatOnce!(messages, false);
      expect(post.mock.calls[0][0]).toBe(ENDPOINT_OPENAI_RESPONSES_API);
      expect(post.mock.calls[0][1].tools).toEqual([
        { type: 'function', ...tools[0] },
      ]);
      expect(post.mock.calls[0][1].tool_choice).toBeUndefined();
    },
  );

  it('preserves streamed reasoning and function calls for a tool-result continuation', async () => {
    const reasoning = {
      type: 'reasoning',
      id: 'rs-1',
      encrypted_content: 'opaque-state',
    };
    const call = {
      type: 'function_call',
      id: 'fc-1',
      call_id: 'call-1',
      name: 'lookup',
      arguments: '{}',
    };
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValueOnce(
        createSseResponse([
          event('response.output_item.added', { item: reasoning }),
          event('response.output_item.added', {
            item: { ...call, arguments: '' },
          }),
          event('response.function_call_arguments.delta', {
            item_id: 'fc-1',
            delta: '{}',
          }),
          event('response.output_item.done', { item: call }),
        ]),
      )
      .mockResolvedValueOnce(jsonResponse({ output: textOutput }));
    const service = new OpenAIChatServiceProvider().createChatService({
      apiKey: 'test-key',
      model,
      tools,
    });
    const first = await service.chatOnce!(messages, true);
    expect(first.stop_reason).toBe('tool_use');
    expect(first.blocks).toEqual([
      { type: 'tool_use', id: 'call-1', name: 'lookup', input: {} },
    ]);
    expect(first.assistant_message?.provider_content).toEqual([
      reasoning,
      call,
    ]);
    const result = await service.chatOnce!(
      [
        ...messages,
        first.assistant_message!,
        { role: 'tool', tool_call_id: 'call-1', content: 'value' },
      ],
      false,
    );
    expect(post.mock.calls[1][1].input).toEqual([
      ...messages,
      reasoning,
      call,
      { type: 'function_call_output', call_id: 'call-1', output: 'value' },
    ]);
    expect(result.blocks).toEqual([{ type: 'text', text: 'Hello' }]);
  });

  it.each([undefined, 'none', 'minimal'] as const)(
    'protects direct service calls and normalizes %s effort',
    async (effort) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(jsonResponse({ output: textOutput }));
      const service = new OpenAIChatService(
        'test-key',
        model,
        model,
        tools,
        undefined,
        [],
        undefined,
        undefined,
        effort,
      );
      await service.chatOnce(messages, false);
      expect(post.mock.calls[0][0]).toBe(ENDPOINT_OPENAI_RESPONSES_API);
      expect(post.mock.calls[0][1].reasoning).toEqual({
        effort: normalized(effort),
      });
    },
  );

  it('normalizes and routes a different Responses-tool vision model', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(jsonResponse({ output: textOutput }));
    const service = new OpenAIChatServiceProvider().createChatService({
      apiKey: 'test-key',
      model: MODEL_GPT_5_NANO,
      visionModel: model,
      tools,
      reasoning_effort: 'minimal',
      gpt5EndpointPreference: 'chat',
    });
    await service.visionChatOnce!(images, false);
    expect(post.mock.calls[0][0]).toBe(ENDPOINT_OPENAI_RESPONSES_API);
    expect(post.mock.calls[0][1]).toMatchObject({
      model,
      reasoning: { effort: normalized('minimal') },
    });
  });

  it('routes MCP tools to Responses for direct service calls', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(jsonResponse({ output: textOutput }));
    const service = new OpenAIChatService(
      'test-key',
      model,
      MODEL_GPT_4O_MINI,
      undefined,
      undefined,
      mcpServers,
    );
    await service.chatOnce(messages, false);
    expect(post.mock.calls[0][0]).toBe(ENDPOINT_OPENAI_RESPONSES_API);
    expect(post.mock.calls[0][1].tools).toContainEqual({
      type: 'mcp',
      server_label: 'lookup',
      server_url: 'https://example.com/mcp',
    });
  });

  it.each([true, false])(
    'rejects custom Chat Completions endpoints with tools=%s before sending',
    async (useTools) => {
      const post = vi.spyOn(ChatServiceHttpClient, 'post');
      const service = new OpenAIChatServiceProvider().createChatService({
        apiKey: 'test-key',
        model,
        endpoint: 'https://example.com/v1/chat/completions',
        tools: useTools ? tools : undefined,
        mcpServers: useTools ? undefined : mcpServers,
      });
      await expect(service.chatOnce!(messages, false)).rejects.toThrow(
        `${label} tool calling requires`,
      );
      expect(post).not.toHaveBeenCalled();
    },
  );

  it('preserves custom endpoints and credentials for tool-free requests', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(
        jsonResponse({ choices: [{ message: { content: 'Hello' } }] }),
      );
    const endpoint = 'https://example.com/v1/chat/completions';
    const service = new OpenAIChatServiceProvider().createChatService({
      apiKey: 'test-key',
      model,
      endpoint,
    });
    await service.chatOnce!(messages, false);
    expect(post).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        model,
        messages,
        reasoning_effort: 'low',
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('does not apply native endpoint/tool restrictions to compatible providers', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(
        jsonResponse({ choices: [{ message: { content: 'Hello' } }] }),
      );
    const endpoint = 'https://example.com/v1/chat/completions';
    const service = new OpenAICompatibleChatServiceProvider().createChatService(
      { apiKey: 'test-key', model, endpoint, tools },
    );
    await service.chatOnce!(messages, false);
    expect(post.mock.calls[0][0]).toBe(endpoint);
    expect(post.mock.calls[0][1].tools).toEqual([
      { type: 'function', function: tools[0] },
    ]);
    expect(post.mock.calls[0][1].reasoning_effort).toBeUndefined();
  });
});
