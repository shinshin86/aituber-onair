import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENROUTER_API,
  MODEL_MISTRAL_ZAI_GLM_5_3,
  MODEL_NVIDIA_NEMOTRON_3_5_LIGHTNING,
  MODEL_QWEN_QWEN_3_8_27B,
  MODEL_QWEN_QWEN_3_8_OMNI_FLASH,
} from '../../src/constants';
import { ChatServiceFactory } from '../../src/services/ChatServiceFactory';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message, MessageWithVision } from '../../src/types';

const candidates = [
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
        reasoning_effort: 'high',
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
      expect(body.reasoning_effort).toBeUndefined();
      expect(body.reasoning?.effort).toBeUndefined();
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
      'omits unverified reasoning fields and preserves includeReasoning=%s',
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
        expect(body.reasoning?.effort).toBeUndefined();
        expect(body.reasoning?.max_tokens).toBeUndefined();
        if (provider === 'openrouter') {
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
      if (!vision) return;
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
