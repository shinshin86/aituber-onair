import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_OPENROUTER_API,
  MODEL_GPT_OSS_20B_FREE,
  MODEL_OPENAI_GPT_4O,
} from '../../src/constants/openrouter';
import { OpenRouterChatService } from '../../src/services/providers/openrouter/OpenRouterChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const createOkResponse = () =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    text: async () =>
      JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
  }) as Response;

describe('OpenRouterChatService request body', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends max_tokens for models that support token limits', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new OpenRouterChatService('test-key', MODEL_OPENAI_GPT_4O);

    await service.chatOnce(messages, false, () => {}, 128);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      ENDPOINT_OPENROUTER_API,
      expect.objectContaining({
        model: MODEL_OPENAI_GPT_4O,
        stream: false,
        messages,
        max_tokens: 128,
      }),
      { Authorization: 'Bearer test-key' },
    );
  });

  it('omits max_tokens only for gpt-oss-20b due to OpenRouter issue', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new OpenRouterChatService(
      'test-key',
      MODEL_GPT_OSS_20B_FREE,
    );

    await service.chatOnce(messages, false, () => {}, 128);

    const [, body] = postSpy.mock.calls[0];
    expect(body).toEqual(
      expect.objectContaining({
        model: MODEL_GPT_OSS_20B_FREE,
        stream: false,
        messages,
      }),
    );
    expect(body).not.toHaveProperty('max_tokens');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(MODEL_GPT_OSS_20B_FREE),
    );
  });
});
