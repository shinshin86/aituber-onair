import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
  MODEL_GLM_4_6,
  MODEL_GLM_5_3,
  MODEL_GLM_5_3_FLASH,
  MODEL_GLM_5_1,
  MODEL_GLM_5_2,
  MODEL_GLM_5_TURBO,
  MODEL_GLM_5V_TURBO,
} from '../../src/constants';
import { ZAIChatService } from '../../src/services/providers/zai/ZAIChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type {
  Message,
  MessageWithVision,
  ToolDefinition,
} from '../../src/types';

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

  it('sends always-on low thinking for glm-5.3 chat requests', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ZAIChatService(
      'test-key',
      MODEL_GLM_5_3,
      MODEL_GLM_5_3_FLASH,
      undefined,
      undefined,
      undefined,
      undefined,
      { type: 'enabled', clear_thinking: true },
      'low',
    );

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_GLM_5_3,
        stream: false,
        messages,
        thinking: { type: 'enabled', clear_thinking: true },
        reasoning_effort: 'low',
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('sends low thinking and image messages to glm-5.3-flash', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const visionMessages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image.' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/image.png' },
          },
        ],
      },
    ];
    const service = new ZAIChatService(
      'test-key',
      MODEL_GLM_5_3,
      MODEL_GLM_5_3_FLASH,
      undefined,
      undefined,
      undefined,
      undefined,
      { type: 'enabled', clear_thinking: true },
      'low',
    );

    await service.visionChatOnce(visionMessages, false);

    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_GLM_5_3_FLASH,
        messages: visionMessages,
        thinking: { type: 'enabled', clear_thinking: true },
        reasoning_effort: 'low',
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('sends normalized reasoning effort only for glm-5.2 text requests', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ZAIChatService(
      'test-key',
      MODEL_GLM_5_2,
      MODEL_GLM_5V_TURBO,
      undefined,
      undefined,
      undefined,
      undefined,
      { type: 'enabled' },
      'high',
    );

    await service.chatOnce(messages, false);

    const [, body] = postSpy.mock.calls[0];
    expect(body).toEqual(
      expect.objectContaining({
        model: MODEL_GLM_5_2,
        thinking: { type: 'enabled' },
        reasoning_effort: 'high',
      }),
    );
  });

  it('does not send glm-5.2 reasoning effort to a vision fallback model', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ZAIChatService(
      'test-key',
      MODEL_GLM_5_2,
      MODEL_GLM_5V_TURBO,
      undefined,
      undefined,
      undefined,
      undefined,
      { type: 'enabled' },
      'high',
    );
    const visionMessages: MessageWithVision[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Describe this image.' }],
      },
    ];

    await service.visionChatOnce(visionMessages, false);

    const [, body] = postSpy.mock.calls[0];
    expect(body).not.toHaveProperty('reasoning_effort');
  });

  it('sends glm-5.1 with OpenAI-compatible chat completions payload', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ZAIChatService('test-key', MODEL_GLM_5_1);

    await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_GLM_5_1,
        stream: false,
        messages,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('sends glm-5v-turbo vision messages through chat completions', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const visionMessages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image.' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/image.png' },
          },
        ],
      },
    ];
    const service = new ZAIChatService(
      'test-key',
      MODEL_GLM_5_1,
      MODEL_GLM_5V_TURBO,
    );

    await service.visionChatOnce(visionMessages, false);

    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_GLM_5V_TURBO,
        stream: false,
        messages: visionMessages,
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
