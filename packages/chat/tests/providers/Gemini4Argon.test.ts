import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  MODEL_GEMINI_4_ARGON,
  MODEL_GOOGLE_GEMINI_4_ARGON,
  MODEL_GEMINI_3_1_FLASH_LITE,
  MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
  type ChatResponseLength,
  type Message,
} from '../../src';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

const messages: Message[] = [{ role: 'user', content: 'Hello' }];
const payload = (parts = [{ text: 'Hello from Argon' }] as any[]) => ({
  candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }],
});
const response = (stream: boolean, parts?: any[]) =>
  new Response(
    stream
      ? `data: ${JSON.stringify(payload(parts))}\n\n`
      : JSON.stringify(payload(parts)),
  );
const service = (
  responseLength?: ChatResponseLength,
  reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high',
) =>
  ChatServiceFactory.createChatService('gemini', {
    apiKey: 'test-key',
    model: MODEL_GEMINI_4_ARGON,
    responseLength,
    reasoning_effort,
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Gemini 4 Argon', () => {
  it('is explicit and image-capable through both providers, preserving defaults', () => {
    for (const [provider, model, defaultModel] of [
      ['gemini', MODEL_GEMINI_4_ARGON, MODEL_GEMINI_3_1_FLASH_LITE],
      [
        'openrouter',
        MODEL_GOOGLE_GEMINI_4_ARGON,
        MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
      ],
    ] as const) {
      expect(ChatServiceFactory.getSupportedModels(provider)).toContain(model);
      const capabilities =
        ChatServiceFactory.getProviderCapabilities(provider)!;
      expect(capabilities.defaultModel).toBe(defaultModel);
      expect(
        ChatServiceFactory.getVisionSupportLevelForModel(provider, model),
      ).toBe('supported');
    }
  });

  it.each([false, true])(
    'uses documented v1beta transport (stream=%s) and low thinking',
    async (stream) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(response(stream));
      const result = await service('veryShort').chatOnce!(messages, stream);
      expect(post).toHaveBeenCalledTimes(1);
      expect(post.mock.calls[0][0]).toBe(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-4-argon:${stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'}key=test-key`,
      );
      const body = post.mock.calls[0][1] as any;
      expect(body.generationConfig).toEqual({
        maxOutputTokens: 32_768,
        thinkingConfig: { includeThoughts: false, thinkingLevel: 'LOW' },
      });
      expect(body.contents).toEqual([
        { role: 'user', parts: [{ text: 'Hello' }] },
      ]);
      expect(body).not.toHaveProperty('cachedContents');
      expect(body).not.toHaveProperty('cachedContent');
      expect(body).not.toHaveProperty('cached_content');
      expect(result.blocks).toEqual([
        { type: 'text', text: 'Hello from Argon' },
      ]);
    },
  );

  it.each([
    [undefined, 'LOW'],
    ['minimal', 'LOW'],
    ['low', 'LOW'],
    ['medium', 'MEDIUM'],
    ['high', 'HIGH'],
  ] as const)(
    'normalizes %s thinking without sending thinkingBudget',
    async (effort, level) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(response(false));
      await service(undefined, effort).chatOnce!(messages, false);
      const config = (post.mock.calls[0][1] as any).generationConfig;
      expect(config.thinkingConfig).toEqual({
        includeThoughts: false,
        thinkingLevel: level,
      });
      expect(config).not.toHaveProperty('thinkingBudget');
    },
  );

  it.each([
    [false, undefined, 32_768],
    [true, undefined, 32_768],
    [false, 100_000, 32_768],
    [true, 100_000, 65_536],
    [false, 1234, 1234],
    [true, 1234, 1234],
  ] as const)(
    'applies per-request caps (stream=%s, explicit=%s)',
    async (stream, maxTokens, expected) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(response(stream));
      await service('short').chatOnce!(messages, stream, undefined, maxTokens);
      expect(
        (post.mock.calls[0][1] as any).generationConfig.maxOutputTokens,
      ).toBe(expected);
    },
  );

  it('sends inline image input through the same Argon route', async () => {
    vi.stubGlobal(
      'FileReader',
      class {
        result = 'data:image/png;base64,AQID';
        onloadend?: () => void;
        readAsDataURL() {
          this.onloadend?.();
        }
      },
    );
    vi.spyOn(ChatServiceHttpClient, 'get').mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'Content-Type': 'image/png' },
      }),
    );
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(response(false));
    const result = await service().visionChatOnce!(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this' },
            {
              type: 'image_url',
              image_url: { url: 'https://example.test/image.png' },
            },
          ],
        },
      ],
      false,
      () => {},
    );
    expect(post.mock.calls[0][0]).toContain(
      '/v1beta/models/gemini-4-argon:generateContent?',
    );
    expect(post.mock.calls[0][1]).toMatchObject({
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Describe this' },
            { inlineData: { mimeType: 'image/png', data: 'AQID' } },
          ],
        },
      ],
    });
    expect(result.blocks).toEqual([{ type: 'text', text: 'Hello from Argon' }]);
  });

  it.each([false, true])(
    'replays mandatory function-call signatures (stream=%s)',
    async (stream) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValueOnce(
          response(stream, [
            {
              functionCall: {
                id: 'argon-call',
                name: 'weather',
                args: { city: 'Tokyo' },
              },
              thoughtSignature: 'opaque-signature',
            },
          ]),
        )
        .mockResolvedValueOnce(response(stream));
      const chat = ChatServiceFactory.createChatService('gemini', {
        apiKey: 'test-key',
        model: MODEL_GEMINI_4_ARGON,
        tools: [
          {
            name: 'weather',
            description: 'Get weather',
            parameters: {
              type: 'object',
              properties: { city: { type: 'string' } },
            },
          },
        ],
      });
      const first = await chat.chatOnce!(messages, stream);
      expect(first.blocks).toEqual([
        {
          type: 'tool_use',
          id: 'argon-call',
          name: 'weather',
          input: { city: 'Tokyo' },
        },
      ]);
      await chat.chatOnce!(
        [
          ...messages,
          {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'argon-call',
                type: 'function',
                function: { name: 'weather', arguments: '{"city":"Tokyo"}' },
              },
            ],
          },
          {
            role: 'tool',
            content: '{"temperature":25}',
            tool_call_id: 'argon-call',
          },
        ] as Message[],
        stream,
      );
      expect(post.mock.calls[1][1]).toMatchObject({
        contents: [
          { role: 'user', parts: [{ text: 'Hello' }] },
          {
            role: 'model',
            parts: [
              {
                function_call: {
                  id: 'argon-call',
                  name: 'weather',
                  args: { city: 'Tokyo' },
                },
                thought_signature: 'opaque-signature',
              },
            ],
          },
          {
            role: 'user',
            parts: [
              {
                function_response: {
                  id: 'argon-call',
                  name: 'weather',
                  response: { temperature: 25 },
                },
              },
            ],
          },
        ],
      });
    },
  );
});

it('keeps OpenRouter Argon thinking enabled without an undocumented reasoning budget', async () => {
  const post = vi.spyOn(ChatServiceHttpClient, 'post').mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Hello' }, finish_reason: 'stop' }],
        }),
      ),
  );
  const chat = ChatServiceFactory.createChatService('openrouter', {
    apiKey: 'test-key',
    model: MODEL_GOOGLE_GEMINI_4_ARGON,
    responseLength: 'short',
    reasoning_effort: 'none',
    reasoningMaxTokens: 2048,
  });
  await chat.chatOnce!(messages, false);
  expect(post.mock.calls[0][0]).toBe(
    'https://openrouter.ai/api/v1/chat/completions',
  );
  expect(post.mock.calls[0][1]).toMatchObject({
    model: 'google/gemini-4-argon',
    max_tokens: 32768,
    stream: false,
    reasoning: { effort: 'low', exclude: true },
  });
  expect(post.mock.calls[0][1]).not.toHaveProperty('reasoning.max_tokens');
  await chat.chatOnce!(messages, false, () => {}, 1234);
  expect(post.mock.calls[1][1]).toHaveProperty('max_tokens', 1234);
});
