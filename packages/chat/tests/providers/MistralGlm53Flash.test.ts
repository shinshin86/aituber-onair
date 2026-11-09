import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  MODEL_MISTRAL_ZAI_GLM_5_3_FLASH,
  MODEL_MISTRAL_ZAI_GLM_5_3,
  MODEL_MISTRAL_SMALL_LATEST,
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  getMistralSupportedReasoningEfforts,
  type Message,
  type MessageWithVision,
} from '../../src';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import { MistralChatService } from '../../src/services/providers/mistral/MistralChatService';

const messages: Message[] = [{ role: 'user', content: 'Hello' }];
const images: MessageWithVision[] = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Describe this' },
      {
        type: 'image_url',
        image_url: { url: 'https://example.test/image.png' },
      },
    ],
  },
];
const tools = [
  {
    name: 'lookup',
    description: 'Lookup data',
    parameters: { type: 'object', properties: {} },
  },
];
const content = [
  { type: 'thinking', thinking: [{ type: 'text', text: 'hidden reasoning' }] },
  { type: 'text', text: 'Flash answer' },
];
const toolCall = {
  id: 'lookup-call',
  type: 'function',
  function: { name: 'lookup', arguments: '{}' },
};
const reply = (stream = false) =>
  new Response(
    stream
      ? `data: ${JSON.stringify({ choices: [{ delta: { content, tool_calls: [{ ...toolCall, index: 0 }] } }] })}\n\ndata: [DONE]\n\n`
      : JSON.stringify({
          choices: [
            {
              message: { content, tool_calls: [toolCall] },
              finish_reason: 'tool_calls',
            },
          ],
        }),
  );

afterEach(() => vi.restoreAllMocks());

describe('Mistral-hosted GLM-5.3 Flash', () => {
  it('is explicit, image-capable and exposes only its documented efforts', () => {
    const capabilities = ChatServiceFactory.getProviderCapabilities(
      'mistral',
      MODEL_MISTRAL_ZAI_GLM_5_3_FLASH,
    )!;
    expect(capabilities.models).toContain(MODEL_MISTRAL_ZAI_GLM_5_3_FLASH);
    expect(capabilities.defaultModel).toBe(MODEL_MISTRAL_SMALL_LATEST);
    expect(capabilities.vision).toBe('supported');
    expect(capabilities.reasoningEffort).toEqual(['low', 'high', 'max']);
    expect(
      getMistralSupportedReasoningEfforts(MODEL_MISTRAL_ZAI_GLM_5_3),
    ).toEqual([]);
    expect(
      getMistralSupportedReasoningEfforts(MODEL_MISTRAL_SMALL_LATEST),
    ).toEqual(['none', 'high']);
  });

  it.each([undefined, 'none', 'low', 'high', 'max'] as const)(
    'normalizes %s effort with low as the default',
    async (effort) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(reply());
      const chat = ChatServiceFactory.createChatService('mistral', {
        apiKey: 'test-key',
        model: MODEL_MISTRAL_ZAI_GLM_5_3_FLASH,
        reasoning_effort: effort,
      });
      await chat.chatOnce!(messages, false);
      expect(post.mock.calls[0][1]).toMatchObject({
        model: 'zai-glm-5-3-flash',
        reasoning_effort:
          effort === 'none' || effort === undefined ? 'low' : effort,
      });
      expect(post.mock.calls[0][1]).not.toHaveProperty('reasoning');
    },
  );

  it('also defaults to low when constructing the service directly', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(reply());
    await new MistralChatService(
      'test-key',
      MODEL_MISTRAL_ZAI_GLM_5_3_FLASH,
    ).chatOnce(messages, false);
    expect(post.mock.calls[0][1]).toHaveProperty('reasoning_effort', 'low');
  });

  it.each([false, true])(
    'sends text/tools to Chat Completions and hides thinking (stream=%s)',
    async (stream) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(reply(stream));
      const chat = ChatServiceFactory.createChatService('mistral', {
        apiKey: 'test-key',
        model: MODEL_MISTRAL_ZAI_GLM_5_3_FLASH,
        tools,
      });
      const result = await chat.chatOnce!(messages, stream);
      expect(post.mock.calls[0][0]).toBe(ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API);
      expect(post.mock.calls[0][2]).toMatchObject({
        Authorization: 'Bearer test-key',
      });
      expect(post.mock.calls[0][1]).toMatchObject({
        model: 'zai-glm-5-3-flash',
        messages,
        stream,
        reasoning_effort: 'low',
        tools: [{ type: 'function', function: { name: 'lookup' } }],
      });
      if (stream)
        expect(result.blocks).toContainEqual({
          type: 'text',
          text: 'Flash answer',
        });
      expect(result.blocks).toContainEqual({
        type: 'tool_use',
        id: 'lookup-call',
        name: 'lookup',
        input: {},
      });
      expect(JSON.stringify(result.blocks)).not.toContain('hidden reasoning');
    },
  );

  it.each([false, true])(
    'passes documented image_url input to the same route (stream=%s)',
    async (stream) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(reply(stream));
      const chat = ChatServiceFactory.createChatService('mistral', {
        apiKey: 'test-key',
        model: MODEL_MISTRAL_ZAI_GLM_5_3_FLASH,
      });
      expect(chat.getVisionModel()).toBe(MODEL_MISTRAL_ZAI_GLM_5_3_FLASH);
      await chat.visionChatOnce!(images, stream, () => {});
      expect(post.mock.calls[0][0]).toBe(ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API);
      expect(post.mock.calls[0][1]).toMatchObject({
        model: 'zai-glm-5-3-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this' },
              {
                type: 'image_url',
                image_url: 'https://example.test/image.png',
              },
            ],
          },
        ],
        stream,
        reasoning_effort: 'low',
      });
    },
  );
});

it('parses non-streaming Flash thinking/text chunks without exposing thinking', async () => {
  vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [{ message: { content }, finish_reason: 'stop' }],
      }),
    ),
  );
  const chat = ChatServiceFactory.createChatService('mistral', {
    apiKey: 'test-key',
    model: MODEL_MISTRAL_ZAI_GLM_5_3_FLASH,
  });
  const result = await chat.chatOnce!(messages, false);
  expect(result.blocks).toEqual([{ type: 'text', text: 'Flash answer' }]);
});
