import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiChatService } from '../../src/services/providers/gemini/GeminiChatService';
import {
  ChatServiceHttpClient,
  HttpError,
} from '../../src/utils/chatServiceHttpClient';
import {
  MODEL_GEMMA_4_31B_IT,
  MODEL_GEMMA_4_26B_A4B_IT,
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  MODEL_GEMINI_3_FLASH_PREVIEW,
} from '../../src/constants';
import type { Message } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const createOkResponse = () =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [] }),
    text: async () => JSON.stringify({ candidates: [] }),
  }) as Response;

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

    await (service as any).callGemini(
      messages,
      MODEL_GEMINI_3_FLASH_PREVIEW,
      true,
    );

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=test-key',
    );
  });

  it('uses v1beta for Gemma 4 31B IT', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMMA_4_31B_IT,
      MODEL_GEMMA_4_31B_IT,
    );

    await (service as any).callGemini(messages, MODEL_GEMMA_4_31B_IT, true);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1beta/models/gemma-4-31b-it:streamGenerateContent?alt=sse&key=test-key',
    );
    expect(postSpy.mock.calls[0][1]).toMatchObject({
      generationConfig: {
        thinkingConfig: {
          includeThoughts: false,
          thinkingLevel: 'minimal',
        },
      },
    });
  });

  it('uses v1beta for Gemma 4 26B A4B IT', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMMA_4_26B_A4B_IT,
      MODEL_GEMMA_4_26B_A4B_IT,
    );

    await (service as any).callGemini(messages, MODEL_GEMMA_4_26B_A4B_IT, true);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1beta/models/gemma-4-26b-a4b-it:streamGenerateContent?alt=sse&key=test-key',
    );
  });

  it('uses v1beta for Gemini 3.1 Flash-Lite Preview', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
      MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
    );

    await (service as any).callGemini(
      messages,
      MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
      true,
    );

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1beta/models/gemini-3.1-flash-lite-preview:streamGenerateContent?alt=sse&key=test-key',
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
    expect(postSpy.mock.calls[0][1]).not.toHaveProperty(
      'generationConfig.thinkingConfig',
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

describe('GeminiChatService thought filtering', () => {
  it('filters Gemma 4 thought parts from non-stream output', () => {
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMMA_4_31B_IT,
      MODEL_GEMMA_4_31B_IT,
    );

    const completion = (service as any).parseOneShot(
      {
        candidates: [
          {
            content: {
              parts: [
                { text: 'internal draft', thought: true },
                { text: 'こんにちは！' },
              ],
            },
          },
        ],
      },
      MODEL_GEMMA_4_31B_IT,
    );

    expect(completion.blocks).toEqual([{ type: 'text', text: 'こんにちは！' }]);
  });

  it('treats Gemma 4 thought parts as hidden text', () => {
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMMA_4_31B_IT,
      MODEL_GEMMA_4_31B_IT,
    );

    expect(
      (service as any).shouldExposeTextPart(
        { text: 'internal draft', thought: true },
        MODEL_GEMMA_4_31B_IT,
      ),
    ).toBe(false);
    expect(
      (service as any).shouldExposeTextPart(
        { text: 'こんにちは！' },
        MODEL_GEMMA_4_31B_IT,
      ),
    ).toBe(true);
  });

  it('keeps non-Gemma thought parts unchanged', () => {
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_2_0_FLASH,
      MODEL_GEMINI_2_0_FLASH,
    );

    const completion = (service as any).parseOneShot(
      {
        candidates: [
          {
            content: {
              parts: [
                { text: 'existing behavior', thought: true },
                { text: 'visible text' },
              ],
            },
          },
        ],
      },
      MODEL_GEMINI_2_0_FLASH,
    );

    expect(completion.blocks).toEqual([
      { type: 'text', text: 'existing behavior' },
      { type: 'text', text: 'visible text' },
    ]);
  });
});
