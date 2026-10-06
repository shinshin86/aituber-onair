import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDefaultOpenRouterReasoningEffort,
  getOpenRouterSupportedReasoningEfforts,
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENROUTER_API,
  MODEL_MISTRAL_ZAI_GLM_5_3,
  MODEL_UNBIASED_PARETO_26_10_PREVIEW,
  MODEL_INCLUSIONAI_LING_3_1_FLASH,
  MODEL_UPSTAGE_SOLAR_PRO4,
  MODEL_UPSTAGE_SOLAR_MINI4,
  MODEL_XIAOMI_MIMO_V2_6_FLASH,
  MODEL_APODEX_1_1_MINI_FREE,
  MODEL_NVIDIA_NEMOTRON_3_5_LIGHTNING,
  MODEL_QWEN_QWEN_3_8_27B,
  MODEL_QWEN_QWEN_3_8_OMNI_FLASH,
} from '../../src/constants';
import { buildToolContinuationMessages } from '../../src/backend';
import { ChatServiceFactory } from '../../src/services/ChatServiceFactory';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message, MessageWithVision } from '../../src/types';

const candidates = [
  {
    provider: 'openrouter',
    model: MODEL_UNBIASED_PARETO_26_10_PREVIEW,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    model: MODEL_UPSTAGE_SOLAR_PRO4,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: false,
  },
  {
    provider: 'openrouter',
    model: MODEL_INCLUSIONAI_LING_3_1_FLASH,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: false,
  },
  {
    provider: 'openrouter',
    model: MODEL_UPSTAGE_SOLAR_MINI4,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: false,
  },
  {
    provider: 'mistral',
    model: MODEL_MISTRAL_ZAI_GLM_5_3,
    endpoint: ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
    vision: false,
  },
  {
    provider: 'openrouter',
    model: MODEL_NVIDIA_NEMOTRON_3_5_LIGHTNING,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: false,
  },
  {
    provider: 'openrouter',
    model: MODEL_QWEN_QWEN_3_8_27B,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    model: MODEL_QWEN_QWEN_3_8_OMNI_FLASH,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    model: MODEL_XIAOMI_MIMO_V2_6_FLASH,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    model: MODEL_APODEX_1_1_MINI_FREE,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: false,
  },
] as const;
const messages: Message[] = [{ role: 'user', content: 'Hello' }];
const images: MessageWithVision[] = [
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
const tools = [
  {
    name: 'lookup',
    description: 'Lookup a value',
    parameters: { type: 'object', properties: {} },
  },
];
const data = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;

afterEach(() => {
  vi.restoreAllMocks();
  ChatServiceHttpClient.setFetch((url, init) => fetch(url, init));
});

describe.each(candidates)(
  '$provider $model explicit support',
  ({ provider, model, endpoint, vision }) => {
    const service = () =>
      ChatServiceFactory.createChatService(provider, {
        apiKey: 'EXAMPLE_API_KEY',
        model,
        tools,
        reasoning_effort: model === MODEL_UPSTAGE_SOLAR_PRO4 ? 'none' : 'high',
      });

    it('sends a direct authenticated JSON request and parses tools without unsupported effort', async () => {
      const transport = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: 'Found',
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
          { status: 200 },
        ),
      );
      ChatServiceHttpClient.setFetch(transport);
      const result = await service().chatOnce!(messages, false);
      const [url, init] = transport.mock.calls[0];
      expect(url).toBe(endpoint);
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer EXAMPLE_API_KEY',
        'Content-Type': 'application/json',
      });
      const body = JSON.parse(init.body);
      expect(body).toMatchObject({
        model,
        messages,
        stream: false,
        tools: [{ type: 'function', function: { name: 'lookup' } }],
      });
      if (provider === 'openrouter') expect(body.tool_choice).toBe('auto');
      expect(body.reasoning_effort).toBeUndefined();
      expect(body.reasoning?.effort).toBe(
        model === MODEL_UPSTAGE_SOLAR_PRO4
          ? 'none'
          : model === MODEL_UPSTAGE_SOLAR_MINI4
            ? 'high'
            : undefined,
      );
      expect(result.blocks).toContainEqual({
        type: 'tool_use',
        id: 'call-1',
        name: 'lookup',
        input: {},
      });
    });

    it('parses fragmented SSE text and tool arguments through DONE', async () => {
      const encoded = new TextEncoder().encode(
        data({
          choices: [
            {
              delta: {
                content: 'Hello',
                tool_calls: [
                  {
                    index: 0,
                    id: 'call-1',
                    type: 'function',
                    function: { name: 'lookup', arguments: '{' },
                  },
                ],
              },
            },
          ],
        }) +
          data({
            choices: [
              {
                delta: {
                  content: ' world',
                  tool_calls: [{ index: 0, function: { arguments: '}' } }],
                },
                finish_reason: 'tool_calls',
              },
            ],
          }) +
          'data: [DONE]\n\n',
      );
      const transport = vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoded.slice(0, 37));
              controller.enqueue(encoded.slice(37));
              controller.close();
            },
          }),
          { status: 200 },
        ),
      );
      ChatServiceHttpClient.setFetch(transport);
      const partial = vi.fn();
      const result = await service().chatOnce!(messages, true, partial);
      expect(transport.mock.calls[0][0]).toBe(endpoint);
      expect(JSON.parse(transport.mock.calls[0][1].body)).toMatchObject({
        model,
        stream: true,
      });
      expect(partial).toHaveBeenCalled();
      expect(
        result.blocks
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join(''),
      ).toBe('Hello world');
      expect(result.blocks).toContainEqual({
        type: 'tool_use',
        id: 'call-1',
        name: 'lookup',
        input: {},
      });
    });

    it.each([401, 429, 500])(
      'propagates HTTP %s without returning a successful completion',
      async (status) => {
        const transport = vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ error: { message: 'Request failed' } }),
              { status, statusText: 'Request failed' },
            ),
          );
        ChatServiceHttpClient.setFetch(transport);
        await expect(service().chatOnce!(messages, true)).rejects.toThrow(
          `HTTP ${status}`,
        );
        expect(transport.mock.calls[0][0]).toBe(endpoint);
      },
    );

    it.each([undefined, true, false])(
      'sends only documented reasoning fields and preserves includeReasoning=%s',
      async (includeReasoning) => {
        const transport = vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
              { status: 200 },
            ),
          );
        ChatServiceHttpClient.setFetch(transport);
        const configured = ChatServiceFactory.createChatService(provider, {
          apiKey: 'EXAMPLE_API_KEY',
          model,
          reasoning_effort: 'high',
          reasoningMaxTokens: 2048,
          includeReasoning,
        });
        await configured.chatOnce!(messages, false);
        const body = JSON.parse(transport.mock.calls[0][1].body);
        expect(body.reasoning_effort).toBeUndefined();
        expect(body.reasoning?.effort).toBe(
          [MODEL_UPSTAGE_SOLAR_MINI4, MODEL_UPSTAGE_SOLAR_PRO4].includes(model)
            ? 'high'
            : undefined,
        );
        expect(body.reasoning?.max_tokens).toBeUndefined();
        if (model === MODEL_UNBIASED_PARETO_26_10_PREVIEW) {
          expect(body.reasoning).toBeUndefined();
        } else if (provider === 'openrouter') {
          expect(body.reasoning?.exclude).toBe(
            includeReasoning === true ? undefined : true,
          );
        } else {
          expect(body.reasoning).toBeUndefined();
        }
      },
    );

    it('advertises only documented vision and routes supported image input', async () => {
      expect(
        ChatServiceFactory.getProviderCapabilities(provider, model)?.vision,
      ).toBe(vision ? 'supported' : 'unsupported');
      if (!vision) {
        if (provider === 'openrouter') {
          const transport = vi.fn();
          ChatServiceHttpClient.setFetch(transport);
          await expect(
            service().visionChatOnce!(images, false),
          ).rejects.toThrow('does not support vision');
          expect(transport).not.toHaveBeenCalled();
        }
        return;
      }
      const transport = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Image description' } }],
          }),
          { status: 200 },
        ),
      );
      ChatServiceHttpClient.setFetch(transport);
      const result = await service().visionChatOnce!(images, false);
      expect(transport.mock.calls[0][0]).toBe(endpoint);
      expect(JSON.parse(transport.mock.calls[0][1].body)).toMatchObject({
        model,
        messages: images,
      });
      expect(result.blocks).toContainEqual({
        type: 'text',
        text: 'Image description',
      });
    });
  },
);

describe('Ling 3.1 Flash response constraints', () => {
  const createService = () =>
    ChatServiceFactory.createChatService('openrouter', {
      apiKey: 'EXAMPLE_API_KEY',
      model: MODEL_INCLUSIONAI_LING_3_1_FLASH,
    });

  it('preserves a documented output-token limit without inventing reasoning controls', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
        ),
      );
    ChatServiceHttpClient.setFetch(transport);
    await createService().chatOnce!(messages, false, undefined, 32768);
    expect(transport.mock.calls[0][0]).toBe(ENDPOINT_OPENROUTER_API);
    expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({
      model: 'inclusionai/ling-3.1-flash',
      messages,
      stream: false,
      max_tokens: 32768,
      reasoning: { exclude: true },
    });
  });

  it('propagates an API error received inside an HTTP-success stream', async () => {
    const transport = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                data({
                  error: { message: 'Mock upstream failure', code: 503 },
                }) + 'data: [DONE]\n\n',
              ),
            );
            controller.close();
          },
        }),
      ),
    );
    ChatServiceHttpClient.setFetch(transport);
    await expect(createService().chatOnce!(messages, true)).rejects.toThrow(
      'Mock upstream failure',
    );
  });
});

it('keeps Pareto preview explicit with vision and no reasoning controls', () => {
  const model = MODEL_UNBIASED_PARETO_26_10_PREVIEW;
  expect(model).toBe('unbiased/pareto-26.10-preview');
  expect(ChatServiceFactory.getSupportedModels('openrouter')).toContain(model);
  expect(
    ChatServiceFactory.getProviderCapabilities('openrouter')?.defaultModel,
  ).not.toBe(model);
  expect(getOpenRouterSupportedReasoningEfforts(model)).toEqual([]);
  expect(getDefaultOpenRouterReasoningEffort(model)).toBeUndefined();
});

it.each([
  { stream: false, vision: false },
  { stream: true, vision: false },
  { stream: false, vision: true },
  { stream: true, vision: true },
])(
  'continues Pareto tool results after stream=$stream vision=$vision',
  async ({ stream, vision }) => {
    const first = {
      choices: [
        {
          message: {
            content: '',
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
    };
    const transport = vi
      .fn()
      .mockResolvedValueOnce(
        stream
          ? new Response(
              data({
                choices: [
                  {
                    delta: {
                      tool_calls: [
                        { index: 0, ...first.choices[0].message.tool_calls[0] },
                      ],
                    },
                    finish_reason: 'tool_calls',
                  },
                ],
              }) + 'data: [DONE]\n\n',
            )
          : new Response(JSON.stringify(first)),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: { content: 'Lookup complete' },
                finish_reason: 'stop',
              },
            ],
          }),
        ),
      );
    ChatServiceHttpClient.setFetch(transport);
    const service = ChatServiceFactory.createChatService('openrouter', {
      apiKey: 'EXAMPLE_API_KEY',
      model: MODEL_UNBIASED_PARETO_26_10_PREVIEW,
      tools,
    });
    const input = vision ? images : messages;
    const completion = vision
      ? await service.visionChatOnce!(input, stream)
      : await service.chatOnce!(input, stream);
    const continuation = buildToolContinuationMessages({
      provider: 'openrouter',
      messages: input,
      completion,
      toolResults: [
        { type: 'tool_result', tool_use_id: 'call-1', content: '{"value":42}' },
      ],
    });
    const result = vision
      ? await service.visionChatOnce!(continuation, false)
      : await service.chatOnce!(continuation, false);
    expect(transport.mock.calls[1][0]).toBe(ENDPOINT_OPENROUTER_API);
    const body = JSON.parse(transport.mock.calls[1][1].body);
    expect(body.model).toBe(MODEL_UNBIASED_PARETO_26_10_PREVIEW);
    expect(body.messages).toEqual(continuation);
    expect(body.messages[0]).toEqual(input[0]);
    expect(body.messages[1].tool_calls[0]).toEqual(
      first.choices[0].message.tool_calls[0],
    );
    expect(body.messages[2]).toEqual({
      role: 'tool',
      tool_call_id: 'call-1',
      content: '{"value":42}',
    });
    expect(body.reasoning).toBeUndefined();
    expect(body.tool_choice).toBe('auto');
    expect(result.blocks).toContainEqual({
      type: 'text',
      text: 'Lookup complete',
    });
  },
);
