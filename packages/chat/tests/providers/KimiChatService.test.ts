import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
  MODEL_KIMI_K3,
  MODEL_KIMI_K2_6,
  MODEL_KIMI_K2_7_CODE,
} from '../../src/constants';
import { KimiChatService } from '../../src/services/providers/kimi/KimiChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message, ToolDefinition } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

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

const createOneShotResponse = (message: Record<string, unknown>) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ finish_reason: 'stop', message }],
    }),
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

describe('KimiChatService request body', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.TextDecoder = class {
      decode(value?: Uint8Array): string {
        if (!value) return '';
        return Buffer.from(value).toString('utf-8');
      }
    } as typeof TextDecoder;
  });

  it('sends Kimi K3 through Chat Completions with max reasoning', async () => {
    const postSpy = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createOneShotResponse({
        role: 'assistant',
        content: 'K3 response',
        reasoning_content: 'K3 reasoning',
      }),
    );
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K3,
      MODEL_KIMI_K3,
      undefined,
      ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
      'short',
      undefined,
      undefined,
      'max',
    );

    const result = await service.chatOnce(messages, false);

    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
      expect.objectContaining({
        model: MODEL_KIMI_K3,
        stream: false,
        messages,
        reasoning_effort: 'max',
        max_completion_tokens: expect.any(Number),
      }),
      { Authorization: 'Bearer test-key' },
    );
    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.thinking).toBeUndefined();
    expect(body.max_tokens).toBeUndefined();
    expect(result.assistant_message).toEqual({
      role: 'assistant',
      content: 'K3 response',
      reasoning_content: 'K3 reasoning',
    });
  });

  it('preserves Kimi K3 reasoning in streaming completion metadata', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"role":"assistant","reasoning_content":"Think "}}]}\n\n',
        'data: {"choices":[{"delta":{"reasoning_content":"more"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" K3"},"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K3,
      MODEL_KIMI_K3,
      undefined,
      ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
      undefined,
      undefined,
      undefined,
      'max',
    );
    const onComplete = vi.fn().mockResolvedValue(undefined);

    await service.processChat(messages, vi.fn(), onComplete);

    expect(onComplete).toHaveBeenCalledWith(
      'Hello K3',
      expect.objectContaining({
        assistant_message: {
          role: 'assistant',
          content: 'Hello K3',
          reasoning_content: 'Think more',
        },
      }),
    );
  });

  it('keeps thinking enabled for Kimi K2.7 Code when tools are provided', () => {
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K2_7_CODE,
      MODEL_KIMI_K2_7_CODE,
      tools,
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_KIMI_K2_7_CODE,
      true,
    );

    expect(body).toEqual(
      expect.objectContaining({
        model: MODEL_KIMI_K2_7_CODE,
        stream: true,
        thinking: { type: 'enabled' },
        tool_choice: 'auto',
      }),
    );
  });

  it('throws when Kimi K2.7 Code explicitly disables thinking', () => {
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K2_7_CODE,
      MODEL_KIMI_K2_7_CODE,
      undefined,
      undefined,
      undefined,
      undefined,
      { type: 'disabled' },
    );

    expect(() =>
      (service as any).buildRequestBody(messages, MODEL_KIMI_K2_7_CODE, true),
    ).toThrow('requires thinking mode');
  });

  it('keeps existing tool behavior for older Kimi models', () => {
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K2_6,
      MODEL_KIMI_K2_6,
      tools,
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_KIMI_K2_6,
      true,
    );

    expect(body.thinking).toEqual({ type: 'disabled' });
  });
});
