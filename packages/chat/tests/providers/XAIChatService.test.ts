import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_XAI_CHAT_COMPLETIONS_API,
  MODEL_GROK_4_3,
  MODEL_GROK_4_20_REASONING,
  MODEL_GROK_4_1_FAST_NON_REASONING,
} from '../../src/constants';
import { XAIChatService } from '../../src/services/providers/xai/XAIChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message, ToolDefinition } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const createOkResponse = () =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    text: async () =>
      JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
  }) as Response;

describe('XAIChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds an OpenAI-compatible request body for xAI chat completions', () => {
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
    const service = new XAIChatService(
      'test-key',
      MODEL_GROK_4_20_REASONING,
      MODEL_GROK_4_20_REASONING,
      tools,
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_GROK_4_20_REASONING,
      true,
    );

    expect(body).toEqual(
      expect.objectContaining({
        model: MODEL_GROK_4_20_REASONING,
        stream: true,
        messages,
        tools: [
          {
            type: 'function',
            function: expect.objectContaining({
              name: 'lookupWeather',
            }),
          },
        ],
        tool_choice: 'auto',
      }),
    );
  });

  it('sends requests to the xAI chat completions endpoint', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new XAIChatService(
      'test-key',
      MODEL_GROK_4_1_FAST_NON_REASONING,
    );

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_XAI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_GROK_4_1_FAST_NON_REASONING,
        stream: false,
        messages,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('sends Grok 4.3 requests through the xAI chat completions endpoint', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new XAIChatService('test-key', MODEL_GROK_4_3);

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_XAI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_GROK_4_3,
        stream: false,
        messages,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('returns parsed one-shot output from chatOnce', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createOkResponse(),
    );
    const service = new XAIChatService('test-key');

    const result = await service.chatOnce(messages, false);

    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'ok' }],
      stop_reason: 'end',
      truncated: false,
      finish_reason: undefined,
      usage: undefined,
    });
  });
});
