import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiChatService } from '../../src/services/providers/gemini/GeminiChatService';
import { ChatServiceHttpClient, HttpError } from '../../src/utils/chatServiceHttpClient';
import {
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_3_FLASH_PREVIEW,
} from '../../src/constants';
import type { Message } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const createOkResponse = () =>
  new Response(JSON.stringify({ candidates: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('GeminiChatService API version selection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses v1beta for Gemini 3 preview models', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_3_FLASH_PREVIEW,
      MODEL_GEMINI_3_FLASH_PREVIEW,
    );

    await (service as any).callGemini(messages, MODEL_GEMINI_3_FLASH_PREVIEW, true);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=test-key',
    );
  });

  it('uses v1 first for Gemini 2.0 flash', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_2_0_FLASH,
      MODEL_GEMINI_2_0_FLASH,
    );

    await (service as any).callGemini(messages, MODEL_GEMINI_2_0_FLASH, true);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=test-key',
    );
  });

  it('falls back from v1 to v1beta on 404 for non-v1beta-default models', async () => {
    const postSpy = vi.spyOn(ChatServiceHttpClient, 'post');
    postSpy
      .mockRejectedValueOnce(new HttpError(404, 'Not Found', '{}'))
      .mockResolvedValueOnce(createOkResponse());
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_2_0_FLASH,
      MODEL_GEMINI_2_0_FLASH,
    );

    await (service as any).callGemini(messages, MODEL_GEMINI_2_0_FLASH, true);

    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=test-key',
    );
    expect(postSpy.mock.calls[1][0]).toContain(
      '/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=test-key',
    );
  });
});
