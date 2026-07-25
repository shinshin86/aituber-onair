import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_CLAUDE_API,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_8_OPUS,
  MODEL_CLAUDE_5_OPUS,
  MODEL_CLAUDE_5_SONNET,
} from '../../src/constants';
import { ClaudeChatService } from '../../src/services/providers/claude/ClaudeChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message, ToolDefinition } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const createOkResponse = (content: Record<string, unknown>[] = []) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ content }),
    text: async () => JSON.stringify({ content }),
  }) as Response;

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

describe('ClaudeChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to Claude Haiku 4.5 for text and vision', () => {
    const service = new ClaudeChatService('test-key');

    expect(service.getModel()).toBe(MODEL_CLAUDE_4_5_HAIKU);
    expect(service.getVisionModel()).toBe(MODEL_CLAUDE_4_5_HAIKU);
  });

  it('sends the selected Claude model id to the Messages API', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ClaudeChatService(
      'test-key',
      MODEL_CLAUDE_4_8_OPUS,
      MODEL_CLAUDE_4_8_OPUS,
    );

    await (service as any).callClaude(messages, MODEL_CLAUDE_4_8_OPUS, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toBe(ENDPOINT_CLAUDE_API);
    expect(postSpy.mock.calls[0][1]).toMatchObject({
      model: MODEL_CLAUDE_4_8_OPUS,
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });
    expect(postSpy.mock.calls[0][2]).toMatchObject({
      'x-api-key': 'test-key',
      'anthropic-version': '2023-06-01',
    });
  });

  it('sends Claude Sonnet 5 through the same Messages API route', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ClaudeChatService(
      'test-key',
      MODEL_CLAUDE_5_SONNET,
      MODEL_CLAUDE_5_SONNET,
    );

    await (service as any).callClaude(messages, MODEL_CLAUDE_5_SONNET, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toBe(ENDPOINT_CLAUDE_API);
    expect(postSpy.mock.calls[0][1]).toMatchObject({
      model: MODEL_CLAUDE_5_SONNET,
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });
    expect(postSpy.mock.calls[0][2]).toMatchObject({
      'x-api-key': 'test-key',
      'anthropic-version': '2023-06-01',
    });
  });

  it('sends Claude Opus 5 through the same Messages API route', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ClaudeChatService(
      'test-key',
      MODEL_CLAUDE_5_OPUS,
      MODEL_CLAUDE_5_OPUS,
    );

    await (service as any).callClaude(messages, MODEL_CLAUDE_5_OPUS, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toBe(ENDPOINT_CLAUDE_API);
    expect(postSpy.mock.calls[0][1]).toMatchObject({
      model: MODEL_CLAUDE_5_OPUS,
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });
    expect(postSpy.mock.calls[0][2]).toMatchObject({
      'x-api-key': 'test-key',
      'anthropic-version': '2023-06-01',
    });
  });

  it('preserves Opus 5 thinking blocks for a tool result continuation', async () => {
    const thinkingBlock = {
      type: 'thinking',
      thinking: '',
      signature: 'signed-thinking',
    };
    const toolUseBlock = {
      type: 'tool_use',
      id: 'tool-1',
      name: 'lookupWeather',
      input: { city: 'Tokyo' },
    };
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValueOnce(createOkResponse([thinkingBlock, toolUseBlock]))
      .mockResolvedValueOnce(
        createOkResponse([{ type: 'text', text: 'Sunny' }]),
      );
    const service = new ClaudeChatService(
      'test-key',
      MODEL_CLAUDE_5_OPUS,
      MODEL_CLAUDE_5_OPUS,
      tools,
    );

    const first = await service.chatOnce(messages, false);

    expect(first.stop_reason).toBe('tool_use');
    expect(first.assistant_message).toEqual({
      role: 'assistant',
      content: '',
      provider_content: [thinkingBlock, toolUseBlock],
    });

    const continuation = [
      ...messages,
      first.assistant_message as Message,
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: '25°C and sunny',
          },
        ],
      } as unknown as Message,
    ];

    await service.chatOnce(continuation, false);

    expect(postSpy.mock.calls[1][1]).toMatchObject({
      model: MODEL_CLAUDE_5_OPUS,
      messages: [
        { role: 'user', content: 'hello' },
        {
          role: 'assistant',
          content: [thinkingBlock, toolUseBlock],
        },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: '25°C and sunny',
            },
          ],
        },
      ],
      stream: false,
    });
  });

  it('parses Opus 5 streaming text after omitted thinking', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createStreamResponse([
        'data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"","signature":""}}\n\n',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"signed-thinking"}}\n\n',
        'data: {"type":"content_block_stop","index":0}\n\n',
        'data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}\n\n',
        'data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Hello from Opus 5"}}\n\n',
        'data: {"type":"content_block_stop","index":1}\n\n',
      ]),
    );
    const service = new ClaudeChatService(
      'test-key',
      MODEL_CLAUDE_5_OPUS,
      MODEL_CLAUDE_5_OPUS,
    );
    const onPartial = vi.fn();

    const result = await service.chatOnce(messages, true, onPartial);

    expect(onPartial).toHaveBeenCalledWith('Hello from Opus 5');
    expect(result.blocks).toEqual([
      { type: 'text', text: 'Hello from Opus 5' },
    ]);
    expect(result.assistant_message).toEqual({
      role: 'assistant',
      content: 'Hello from Opus 5',
      provider_content: [
        {
          type: 'thinking',
          thinking: '',
          signature: 'signed-thinking',
        },
        { type: 'text', text: 'Hello from Opus 5' },
      ],
    });
  });
});
