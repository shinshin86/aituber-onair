import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
  MODEL_GLM_4_6,
  MODEL_GLM_5_2,
  MODEL_GLM_5_TURBO,
} from '../../src/constants';
import { ZAIChatService } from '../../src/services/providers/zai/ZAIChatService';
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

describe('ZAIChatService request body', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends glm-5-turbo with OpenAI-compatible chat completions payload', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ZAIChatService('test-key', MODEL_GLM_5_TURBO);

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_GLM_5_TURBO,
        stream: false,
        messages,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('sends glm-5.2 with OpenAI-compatible chat completions payload', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ZAIChatService('test-key', MODEL_GLM_5_2);

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_GLM_5_2,
        stream: false,
        messages,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('does not enable tool_stream for glm-5-turbo tool calls', async () => {
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
    const service = new ZAIChatService(
      'test-key',
      MODEL_GLM_5_TURBO,
      MODEL_GLM_4_6,
      tools,
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_GLM_5_TURBO,
      true,
    );

    expect(body).toEqual(
      expect.objectContaining({
        model: MODEL_GLM_5_TURBO,
        stream: true,
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
    expect(body).not.toHaveProperty('tool_stream');
  });
});
