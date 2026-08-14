import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MODEL_ANTHROPIC_CLAUDE_FABLE_5,
  MODEL_ANTHROPIC_CLAUDE_OPUS_5,
  ENDPOINT_OPENROUTER_API,
  MODEL_GPT_OSS_20B_FREE,
  MODEL_GOOGLE_GEMINI_3_5_FLASH_LITE,
  MODEL_GOOGLE_GEMINI_3_6_FLASH,
  MODEL_GOOGLE_GEMINI_3_7_FLASH,
  MODEL_KWAIPILOT_KAT_CODER_AIR_V2_5,
  MODEL_KWAIPILOT_KAT_CODER_PRO_V2_5,
  MODEL_MOONSHOTAI_KIMI_K3,
  MODEL_OPENROUTER_AUTO,
  MODEL_OPENROUTER_AUTO_BETA,
  MODEL_OPENAI_GPT_5_6_LUNA,
  MODEL_OPENAI_GPT_5_6_SOL,
  MODEL_OPENAI_GPT_5_6_TERRA,
  MODEL_OPENAI_GPT_4O,
  MODEL_XAI_GROK_4_5,
  MODEL_XAI_GROK_4_6,
  MODEL_XAI_GROK_LATEST,
  MODEL_ZAI_GLM_5_2,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
  MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813,
} from '../../src/constants/openrouter';
import { OpenRouterChatService } from '../../src/services/providers/openrouter/OpenRouterChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message } from '../../src/types';
import { createSseResponse } from '../helpers/sse';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const autoRouterModels = [MODEL_OPENROUTER_AUTO, MODEL_OPENROUTER_AUTO_BETA];

const recentOpenRouterModels = [
  MODEL_OPENROUTER_AUTO_BETA,
  MODEL_MOONSHOTAI_KIMI_K3,
  MODEL_KWAIPILOT_KAT_CODER_AIR_V2_5,
  MODEL_KWAIPILOT_KAT_CODER_PRO_V2_5,
  MODEL_OPENAI_GPT_5_6_SOL,
  MODEL_OPENAI_GPT_5_6_TERRA,
  MODEL_OPENAI_GPT_5_6_LUNA,
  MODEL_ANTHROPIC_CLAUDE_OPUS_5,
  MODEL_ANTHROPIC_CLAUDE_FABLE_5,
  MODEL_GOOGLE_GEMINI_3_7_FLASH,
  MODEL_GOOGLE_GEMINI_3_6_FLASH,
  MODEL_GOOGLE_GEMINI_3_5_FLASH_LITE,
  MODEL_XAI_GROK_LATEST,
  MODEL_XAI_GROK_4_6,
  MODEL_XAI_GROK_4_5,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
  MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813,
];

const createJsonResponse = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }) as Response;

const createOkResponse = () =>
  createJsonResponse({ choices: [{ message: { content: 'ok' } }] });

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

  it.each(autoRouterModels)(
    'omits responseLength max_tokens for dynamic router %s',
    async (model) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const postSpy = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(createOkResponse());
      const service = new OpenRouterChatService(
        'test-key',
        model,
        model,
        undefined,
        undefined,
        'medium',
      );

      await service.chatOnce(messages, false);

      const [, body] = postSpy.mock.calls[0];
      expect(body).toEqual(
        expect.objectContaining({
          model,
          stream: false,
          messages,
        }),
      );
      expect(body).not.toHaveProperty('max_tokens');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(model));
    },
  );

  it.each(autoRouterModels)(
    'honors explicit max_tokens for dynamic router %s',
    async (model) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const postSpy = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(createOkResponse());
      const service = new OpenRouterChatService('test-key', model);

      await service.chatOnce(messages, false, () => {}, 128);

      const [, body] = postSpy.mock.calls[0];
      expect(body).toEqual(
        expect.objectContaining({
          model,
          max_tokens: 128,
        }),
      );
      expect(warnSpy).not.toHaveBeenCalled();
    },
  );

  it.each(autoRouterModels)(
    'rejects empty visible content from dynamic router %s',
    async (model) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
        createSseResponse([
          'data: {"choices":[{"delta":{"reasoning":"hidden"}}]}\n\n',
          'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      );
      const service = new OpenRouterChatService('test-key', model);

      await expect(
        service.processChat(
          messages,
          () => {},
          async () => {},
        ),
      ).rejects.toThrow('Auto Router returned no visible content');
    },
  );

  it.each(autoRouterModels)(
    'surfaces stream errors from dynamic router %s',
    async (model) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
        createSseResponse([
          'data: {"error":{"code":429,"message":"Rate limit exceeded"},"choices":[{"delta":{"content":""},"finish_reason":"error"}]}\n\n',
        ]),
      );
      const service = new OpenRouterChatService('test-key', model);

      await expect(
        service.processChat(
          messages,
          () => {},
          async () => {},
        ),
      ).rejects.toThrow('Provider response error: Rate limit exceeded');
    },
  );

  it('surfaces Auto Router errors in tool-compatible streams', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createSseResponse([
        'data: {"error":{"code":502,"message":"Provider disconnected"},"choices":[{"delta":{"content":""},"finish_reason":"error"}]}\n\n',
      ]),
    );
    const service = new OpenRouterChatService(
      'test-key',
      MODEL_OPENROUTER_AUTO,
    );

    await expect(service.chatOnce(messages, true)).rejects.toThrow(
      'Provider response error: Provider disconnected',
    );
  });

  it('rejects whitespace-only Auto Router tool-compatible streams', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createSseResponse([
        'data: {"choices":[{"delta":{"content":"   "},"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new OpenRouterChatService(
      'test-key',
      MODEL_OPENROUTER_AUTO,
    );

    await expect(service.chatOnce(messages, true)).rejects.toThrow(
      'Auto Router returned no visible content',
    );
  });

  it('accepts Auto Router tool calls without visible text', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createSseResponse([
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"search","arguments":"{\\"q\\":\\"hello\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new OpenRouterChatService(
      'test-key',
      MODEL_OPENROUTER_AUTO,
    );

    const result = await service.chatOnce(messages, true);

    expect(result.blocks).toEqual([
      {
        type: 'tool_use',
        id: 'call_1',
        name: 'search',
        input: { q: 'hello' },
      },
    ]);
  });

  it.each(autoRouterModels)(
    'rejects empty one-shot responses from dynamic router %s',
    async (model) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
        createJsonResponse({
          choices: [{ message: { content: '' }, finish_reason: 'stop' }],
        }),
      );
      const service = new OpenRouterChatService('test-key', model);

      await expect(service.chatOnce(messages, false)).rejects.toThrow(
        'Auto Router returned no visible content',
      );
    },
  );

  it('surfaces one-shot errors from Auto Router', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createJsonResponse({
        error: { code: 503, message: 'Provider unavailable' },
        choices: [{ message: { content: '' }, finish_reason: 'error' }],
      }),
    );
    const service = new OpenRouterChatService(
      'test-key',
      MODEL_OPENROUTER_AUTO,
    );

    await expect(service.chatOnce(messages, false)).rejects.toThrow(
      'Provider response error: Provider unavailable',
    );
  });

  it('keeps direct model empty-stream behavior unchanged', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createSseResponse([
        'data: {"choices":[{"delta":{"reasoning":"hidden"}}]}\n\n',
        'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const onComplete = vi.fn(async () => {});
    const service = new OpenRouterChatService('test-key', MODEL_OPENAI_GPT_4O);

    await service.processChat(messages, () => {}, onComplete);

    expect(onComplete).toHaveBeenCalledWith('');
  });

  it('keeps direct model empty one-shot behavior unchanged', async () => {
    vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue(
      createJsonResponse({
        choices: [{ message: { content: '' }, finish_reason: 'stop' }],
      }),
    );
    const service = new OpenRouterChatService('test-key', MODEL_OPENAI_GPT_4O);

    const result = await service.chatOnce(messages, false);

    expect(result.blocks).toEqual([]);
  });

  it.each(recentOpenRouterModels)(
    'sends %s through OpenRouter chat completions and parses the response',
    async (model) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const postSpy = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(createOkResponse());
      const service = new OpenRouterChatService('test-key', model);

      const result = await service.chatOnce(messages, false);

      expect(postSpy).toHaveBeenCalledWith(
        ENDPOINT_OPENROUTER_API,
        expect.objectContaining({
          model,
          stream: false,
          messages,
        }),
        { Authorization: 'Bearer test-key' },
      );
      expect(result).toEqual({
        blocks: [{ type: 'text', text: 'ok' }],
        stop_reason: 'end',
        truncated: false,
        finish_reason: undefined,
        usage: undefined,
      });
      expect(warnSpy).toHaveBeenCalledTimes(
        model === MODEL_OPENROUTER_AUTO_BETA ? 1 : 0,
      );
    },
  );

  it('omits max_tokens for gpt-oss-20b due to OpenRouter issue', async () => {
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

  it('omits max_tokens and defaults reasoning effort to none for GLM-5.2', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new OpenRouterChatService('test-key', MODEL_ZAI_GLM_5_2);

    await service.chatOnce(messages, false, () => {}, 128);

    const [, body] = postSpy.mock.calls[0];
    expect(body).toEqual(
      expect.objectContaining({
        model: MODEL_ZAI_GLM_5_2,
        stream: false,
        messages,
        reasoning: { effort: 'none', exclude: true },
      }),
    );
    expect(body).not.toHaveProperty('max_tokens');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(MODEL_ZAI_GLM_5_2),
    );
  });

  it.each([
    MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
    MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
    MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813,
  ])('defaults %s to actual reasoning effort none', async (model) => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new OpenRouterChatService('test-key', model);

    await service.chatOnce(messages, false);

    const [, body] = postSpy.mock.calls[0];
    expect(body).toEqual(
      expect.objectContaining({
        model,
        reasoning: { effort: 'none', exclude: true },
      }),
    );
  });

  it('sends low reasoning for DeepSeek V4 Flash 0731', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new OpenRouterChatService(
      'test-key',
      MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
      MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'low',
    );

    await service.chatOnce(messages, false);

    const [, body] = postSpy.mock.calls[0];
    expect(body.reasoning).toEqual({ effort: 'low', exclude: true });
  });

  it('normalizes unsupported low effort to none for unversioned DeepSeek Flash', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new OpenRouterChatService(
      'test-key',
      MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
      MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'low',
    );

    await service.chatOnce(messages, false);

    const [, body] = postSpy.mock.calls[0];
    expect(body.reasoning).toEqual({ effort: 'none', exclude: true });
  });

  it('sends explicit reasoning none instead of only excluding it', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new OpenRouterChatService(
      'test-key',
      MODEL_OPENAI_GPT_4O,
      MODEL_OPENAI_GPT_4O,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'none',
    );

    await service.chatOnce(messages, false);

    const [, body] = postSpy.mock.calls[0];
    expect(body.reasoning).toEqual({ effort: 'none', exclude: true });
  });
});
