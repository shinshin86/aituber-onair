import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  MODEL_MISTRAL_DEEPSEEK_V4_1_FLASH_1017,
  MODEL_MISTRAL_SMALL_LATEST,
  getMistralSupportedReasoningEfforts,
  type Message,
  type MessageWithVision,
} from '../../src';
import { MistralChatService } from '../../src/services/providers/mistral/MistralChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

const model = MODEL_MISTRAL_DEEPSEEK_V4_1_FLASH_1017;
const messages: Message[] = [{ role: 'user', content: 'Hello' }];
const content = [
  { type: 'thinking', thinking: [{ type: 'text', text: 'hidden reasoning' }] },
  { type: 'text', text: 'Flash answer' },
];
const tools = [
  { name: 'lookup', parameters: { type: 'object' as const, properties: {} } },
];
const call = {
  id: 'call12345',
  type: 'function' as const,
  function: { name: 'lookup', arguments: '{}' },
};
const reply = (stream: boolean, withTools = false) =>
  new Response(
    stream
      ? `data: ${JSON.stringify({ choices: [{ delta: { content, ...(withTools ? { tool_calls: [{ ...call, index: 0 }] } : {}) } }] })}\n\ndata: [DONE]\n\n`
      : JSON.stringify({
          choices: [
            {
              message: {
                content,
                ...(withTools ? { tool_calls: [call] } : {}),
              },
              finish_reason: withTools ? 'tool_calls' : 'stop',
            },
          ],
        }),
  );

afterEach(() => vi.restoreAllMocks());

describe('Mistral-hosted DeepSeek V4.1 Flash 1017', () => {
  it('exports an explicit vision-capable option without invented reasoning levels', () => {
    expect(model).toBe('deepseek-v4-1-flash-1017');
    const capabilities = ChatServiceFactory.getProviderCapabilities(
      'mistral',
      model,
    )!;
    expect(capabilities.models).toContain(model);
    expect(capabilities.defaultModel).toBe(MODEL_MISTRAL_SMALL_LATEST);
    expect(capabilities.vision).toBe('supported');
    expect(capabilities.streaming).toBe(true);
    expect(capabilities.tools).toBe(true);
    expect(capabilities.reasoningEffort).toEqual([]);
    expect(getMistralSupportedReasoningEfforts(model)).toEqual([]);
  });

  it.each([undefined, 'none', 'low', 'high', 'max'] as const)(
    'omits undocumented reasoning settings for effort %s through factory and constructor',
    async (effort) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockImplementation(async () => reply(false));
      const services = [
        ChatServiceFactory.createChatService('mistral', {
          apiKey: 'test-key',
          model,
          reasoning_effort: effort,
        }),
        new MistralChatService(
          'test-key',
          model,
          model,
          undefined,
          ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
          undefined,
          effort,
        ),
      ];
      for (const service of services) await service.chatOnce!(messages, false);
      for (const [, body] of post.mock.calls) {
        expect(body).toMatchObject({ model, messages, stream: false });
        for (const key of [
          'reasoning_effort',
          'thinking',
          'reasoning',
          'max_tokens',
        ])
          expect(body).not.toHaveProperty(key);
      }
    },
  );

  it.each([false, true])(
    'routes text and parses only visible answer text (stream=%s)',
    async (stream) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(reply(stream));
      const service = ChatServiceFactory.createChatService('mistral', {
        apiKey: 'test-key',
        model,
      });
      const onPartial = vi.fn();
      const result = await service.chatOnce!(messages, stream, onPartial);
      expect(post).toHaveBeenCalledWith(
        ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
        expect.objectContaining({ model, messages, stream }),
        { Authorization: 'Bearer test-key' },
      );
      expect(result.blocks).toEqual([{ type: 'text', text: 'Flash answer' }]);
      expect(result.stop_reason).toBe('end');
      expect(JSON.stringify(onPartial.mock.calls)).not.toContain(
        'hidden reasoning',
      );
    },
  );

  it.each([false, true])(
    'keeps image input on the same model and route (stream=%s)',
    async (stream) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(reply(stream));
      const service = ChatServiceFactory.createChatService('mistral', {
        apiKey: 'test-key',
        model,
      });
      const images: MessageWithVision[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this' },
            {
              type: 'image_url',
              image_url: {
                url: 'https://example.com/image.png',
                detail: 'low',
              },
            },
          ],
          timestamp: 123,
        },
      ];
      expect(service.getVisionModel()).toBe(model);
      const result = await service.visionChatOnce!(
        images,
        stream,
        () => {},
        1024,
      );
      expect(post.mock.calls[0][0]).toBe(ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API);
      expect(post.mock.calls[0][1]).toEqual({
        model,
        stream,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this' },
              { type: 'image_url', image_url: 'https://example.com/image.png' },
            ],
          },
        ],
      });
      expect(result.blocks).toEqual([{ type: 'text', text: 'Flash answer' }]);
    },
  );

  it.each([false, true])(
    'preserves function-call and result history on the second request (stream=%s)',
    async (stream) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValueOnce(reply(stream, true))
        .mockResolvedValueOnce(reply(stream));
      const service = ChatServiceFactory.createChatService('mistral', {
        apiKey: 'test-key',
        model,
        tools,
      });
      const first = await service.chatOnce!(messages, stream);
      expect(first.blocks).toContainEqual({
        type: 'tool_use',
        id: call.id,
        name: call.function.name,
        input: {},
      });
      expect(post.mock.calls[0][1].tools).toEqual([
        { type: 'function', function: tools[0] },
      ]);
      const history: Message[] = [
        ...messages,
        { role: 'assistant', content: '', tool_calls: [call], timestamp: 123 },
        {
          role: 'tool',
          content: 'Found',
          tool_call_id: call.id,
          name: 'lookup',
          timestamp: 124,
        },
      ];
      const second = await service.chatOnce!(history, stream);
      expect(post.mock.calls[1][1].messages).toEqual([
        ...messages,
        { role: 'assistant', content: '', tool_calls: [call] },
        {
          role: 'tool',
          content: 'Found',
          tool_call_id: call.id,
          name: 'lookup',
        },
      ]);
      expect(second.blocks).toEqual([{ type: 'text', text: 'Flash answer' }]);
    },
  );

  it('preserves function history alongside vision blocks without leaking unrelated metadata', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(reply(false));
    const service = ChatServiceFactory.createChatService('mistral', {
      apiKey: 'test-key',
      model,
      tools,
    });
    await service.visionChatOnce!(
      [
        {
          role: 'assistant',
          content: [{ type: 'text', text: '' }],
          tool_calls: [call],
          reasoning_content: 'private state',
          timestamp: 123,
        },
        { role: 'tool', content: 'Found', tool_call_id: call.id },
      ],
      false,
    );
    expect(post.mock.calls[0][1].messages).toEqual([
      {
        role: 'assistant',
        content: [{ type: 'text', text: '' }],
        tool_calls: [call],
      },
      { role: 'tool', content: 'Found', tool_call_id: call.id },
    ]);
  });
});
