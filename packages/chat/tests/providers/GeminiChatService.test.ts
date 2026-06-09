import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiChatService } from '../../src/services/providers/gemini/GeminiChatService';
import {
  ChatServiceHttpClient,
  HttpError,
} from '../../src/utils/chatServiceHttpClient';
import { MCPSchemaFetcher } from '../../src/utils/mcpSchemaFetcher';
import {
  MODEL_GEMMA_4_31B_IT,
  MODEL_GEMMA_4_26B_A4B_IT,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_3_5_FLASH,
  MODEL_GEMINI_3_1_FLASH_LITE,
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  MODEL_GEMINI_3_FLASH_PREVIEW,
} from '../../src/constants';
import type { Message } from '../../src/types';
import type { MCPServerConfig } from '../../src/types/mcp';

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

  it('uses v1beta for stable Gemini 3.5 Flash', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_3_5_FLASH,
      MODEL_GEMINI_3_5_FLASH,
    );

    await (service as any).callGemini(messages, MODEL_GEMINI_3_5_FLASH, true);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=test-key',
    );
    expect(postSpy.mock.calls[0][1]).toMatchObject({
      generationConfig: {
        thinkingConfig: {
          includeThoughts: false,
          thinkingLevel: 'MINIMAL',
        },
      },
    });
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
          thinkingLevel: 'MINIMAL',
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

  it('uses v1beta for stable Gemini 3.1 Flash-Lite', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_3_1_FLASH_LITE,
      MODEL_GEMINI_3_1_FLASH_LITE,
    );

    await (service as any).callGemini(
      messages,
      MODEL_GEMINI_3_1_FLASH_LITE,
      true,
    );

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1beta/models/gemini-3.1-flash-lite:streamGenerateContent?alt=sse&key=test-key',
    );
  });

  it('uses v1 first for custom legacy Gemini models', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const legacyModel = 'gemini-custom-legacy';
    const service = new GeminiChatService(
      'test-key',
      legacyModel,
      MODEL_GEMINI_3_1_FLASH_LITE,
    );

    await (service as any).callGemini(messages, legacyModel, true);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1/models/gemini-custom-legacy:streamGenerateContent?alt=sse&key=test-key',
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
    const legacyModel = 'gemini-custom-legacy';
    const service = new GeminiChatService(
      'test-key',
      legacyModel,
      MODEL_GEMINI_3_1_FLASH_LITE,
    );

    await (service as any).callGemini(messages, legacyModel, true);

    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(postSpy.mock.calls[0][0]).toContain(
      '/v1/models/gemini-custom-legacy:streamGenerateContent?alt=sse&key=test-key',
    );
    expect(postSpy.mock.calls[1][0]).toContain(
      '/v1beta/models/gemini-custom-legacy:streamGenerateContent?alt=sse&key=test-key',
    );
  });

  it('preserves the v1 error as cause when v1beta fallback also fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const firstError = new HttpError(404, 'Not Found', '{"error":"v1"}');
    const fallbackError = new HttpError(
      500,
      'Internal Server Error',
      '{"error":"v1beta"}',
    );
    const postSpy = vi.spyOn(ChatServiceHttpClient, 'post');
    postSpy
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(fallbackError);
    const legacyModel = 'gemini-custom-legacy';
    const service = new GeminiChatService(
      'test-key',
      legacyModel,
      MODEL_GEMINI_3_1_FLASH_LITE,
    );

    await expect(
      (service as any).callGemini(messages, legacyModel, true),
    ).rejects.toBe(fallbackError);

    expect((fallbackError as Error & { cause?: unknown }).cause).toBe(
      firstError,
    );
    expect(postSpy).toHaveBeenCalledTimes(2);
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
      MODEL_GEMINI_2_5_FLASH,
      MODEL_GEMINI_2_5_FLASH,
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
      MODEL_GEMINI_2_5_FLASH,
    );

    expect(completion.blocks).toEqual([
      { type: 'text', text: 'existing behavior' },
      { type: 'text', text: 'visible text' },
    ]);
  });
});

describe('GeminiChatService MCP schema initialization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('records schema initialization failures while using fallback tools', async () => {
    const schemaError = new Error('schema fetch failed');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(MCPSchemaFetcher, 'fetchAllToolSchemas').mockRejectedValue(
      schemaError,
    );
    const mcpServers: MCPServerConfig[] = [
      {
        type: 'url',
        name: 'docs',
        url: 'https://mcp.example.test',
      },
    ];
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_3_1_FLASH_LITE,
      MODEL_GEMINI_3_1_FLASH_LITE,
      [],
      mcpServers,
    );

    expect(service.getMCPSchemaInitializationError()).toBeUndefined();

    await (service as any).initializeMCPSchemas();

    expect(service.getMCPSchemaInitializationError()).toBe(schemaError);
    expect((service as any).mcpToolSchemas).toEqual([
      {
        name: 'mcp_docs_search',
        description: 'Search using docs MCP server (fallback)',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
    ]);
  });

  it('clears the schema initialization error after a successful retry', async () => {
    const schemaError = new Error('schema fetch failed');
    const mcpServers: MCPServerConfig[] = [
      {
        type: 'url',
        name: 'docs',
        url: 'https://mcp.example.test',
      },
    ];
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_3_1_FLASH_LITE,
      MODEL_GEMINI_3_1_FLASH_LITE,
      [],
      mcpServers,
    );

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(MCPSchemaFetcher, 'fetchAllToolSchemas');
    fetchSpy.mockRejectedValueOnce(schemaError).mockResolvedValueOnce([
      {
        name: 'mcp_docs_lookup',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    ]);

    await (service as any).initializeMCPSchemas();
    expect(service.getMCPSchemaInitializationError()).toBe(schemaError);

    service.addMCPServer({
      type: 'url',
      name: 'more_docs',
      url: 'https://mcp-more.example.test',
    });
    await (service as any).initializeMCPSchemas();

    expect(service.getMCPSchemaInitializationError()).toBeUndefined();
  });
});
