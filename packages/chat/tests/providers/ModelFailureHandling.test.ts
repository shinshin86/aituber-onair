import { TextDecoder, TextEncoder } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatServiceFactory } from '../../src';
import {
  parseOpenAIResponsesOneShot,
  parseOpenAIResponsesStream,
} from '../../src/services/providers/openai/responsesParser';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import { createSseResponse } from '../helpers/sse';

const messages = [{ role: 'user' as const, content: 'Hello' }];
const error = { message: 'Mock provider failure' };
const routes = [
  {
    provider: 'openrouter',
    model: 'unbiased/pareto-26.10-preview',
    responses: false,
  },
  { provider: 'openai', model: 'gpt-6.1-sol', responses: true },
  { provider: 'openai', model: 'gpt-6.1-sol', responses: false },
  { provider: 'zai', model: 'glm-5.3-flashx', responses: false },
  { provider: 'openrouter', model: 'openai/gpt-6.1-sol', responses: false },
];

beforeEach(() => {
  // Other provider tests install simplified global encoders; byte-splitting
  // regressions need the runtime's actual incremental UTF-8 decoder.
  vi.stubGlobal('TextDecoder', TextDecoder);
  vi.stubGlobal('TextEncoder', TextEncoder);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('provider failure propagation', () => {
  it.each(routes)(
    '$provider responses=$responses rejects one-shot and tool-compatible stream failures',
    async (route) => {
      const body = route.responses
        ? { status: 'failed', error }
        : { error, choices: [{ finish_reason: 'error' }] };
      const sse = route.responses
        ? `event: response.failed\ndata: ${JSON.stringify({ response: body })}\n\n`
        : `data: ${JSON.stringify(body)}\n\n`;
      vi.spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValueOnce({ json: async () => body } as Response)
        .mockResolvedValueOnce(createSseResponse([sse]));
      const service = ChatServiceFactory.createChatService(route.provider, {
        apiKey: 'mock-only-key',
        model: route.model,
        gpt5EndpointPreference: route.responses ? 'responses' : 'chat',
        tools:
          route.provider === 'openai' && !route.responses
            ? []
            : [
                {
                  name: 'lookup',
                  description: 'Mock tool',
                  parameters: { type: 'object', properties: {} },
                },
              ],
      });
      await expect(service.chatOnce!(messages, false)).rejects.toThrow(
        error.message,
      );
      await expect(service.chatOnce!(messages, true)).rejects.toThrow(
        error.message,
      );
    },
  );

  it.each([
    ['error', { message: 'Mock failure' }],
    [
      'response.failed',
      { response: { status: 'failed', error: { message: 'Mock failure' } } },
    ],
  ])(
    'surfaces Responses %s events without treating them as JSON parse errors',
    async (type, data) => {
      const onJsonError = vi.fn();
      const response = createSseResponse([
        `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`,
      ]);
      await expect(
        parseOpenAIResponsesStream(response, () => {}, { onJsonError }),
      ).rejects.toThrow('Mock failure');
      expect(onJsonError).not.toHaveBeenCalled();
    },
  );

  it('rejects failed one-shot Responses even when output is missing', () => {
    expect(() => parseOpenAIResponsesOneShot({ status: 'failed' })).toThrow(
      'provider response failed',
    );
  });

  it('preserves Responses events across every byte boundary including UTF-8 and metadata', async () => {
    const sse =
      'event: response.output_text.delta\ndata: {"delta":"こんにちは"}\n\n' +
      'event: response.completed\ndata: {"response":{"status":"completed","usage":{"output_tokens":3}}}\n\n';
    const bytes = new TextEncoder().encode(sse);
    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
          controller.close();
        },
      }),
    );
    const partial = vi.fn();
    const result = await parseOpenAIResponsesStream(response, partial);
    expect(partial).toHaveBeenCalledWith('こんにちは');
    expect(result).toMatchObject({
      blocks: [{ type: 'text', text: 'こんにちは' }],
      response_status: 'completed',
      usage: { output_tokens: 3 },
    });
  });

  it('continues after malformed JSON but does not hide consumer callback failures', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onJsonError = vi.fn();
    const response = createSseResponse([
      'event: response.output_text.delta\ndata: {invalid}\n\n',
      'event: response.output_text.delta\ndata: {"delta":"Hello"}\n\n',
    ]);
    await expect(
      parseOpenAIResponsesStream(
        response,
        () => {
          throw new Error('Mock callback failure');
        },
        { onJsonError },
      ),
    ).rejects.toThrow('Mock callback failure');
    expect(onJsonError).toHaveBeenCalledTimes(1);
  });
});
