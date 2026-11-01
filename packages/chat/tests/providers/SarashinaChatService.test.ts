import { TextDecoder, TextEncoder } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  ChatServiceHttpClient,
  SarashinaChatService,
  SarashinaChatServiceProvider,
  ENDPOINT_SARASHINA_CHAT_COMPLETIONS_API,
  MODEL_SARASHINA_3_NANO,
  MODEL_SARASHINA_3_MINI,
  MODEL_SARASHINA_3_2_MINI_THINKING,
  SARASHINA_SUPPORTED_MODELS,
  getDefaultSarashinaReasoningEffort,
  getSarashinaSupportedReasoningEfforts,
  getChatBackendProviderCapabilities,
  buildToolContinuationMessages,
  type Message,
  type ToolDefinition,
} from '../../src';

const messages: Message[] = [{ role: 'user', content: 'Hello' }];
const secret = 'mock-only-provider-key';
const encrypted = 'b3BhcXVlLXN0YXRl+/==';
const tool: ToolDefinition = {
  name: 'get_status',
  description: 'Return a mock status',
  parameters: { type: 'object', properties: {}, required: [] },
};
const toolCall = {
  id: 'call_mock',
  type: 'function' as const,
  function: { name: tool.name, arguments: '{}' },
};
let responses: Response[];
let requests: { url: string; headers: Headers; body: any }[];

function jsonReply(message: Record<string, unknown>, finish = 'stop') {
  responses.push(
    new Response(
      JSON.stringify({
        choices: [
          {
            index: 0,
            message: { role: 'assistant', ...message },
            finish_reason: finish,
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    ),
  );
}
function streamReply(payloads: unknown[], done = true) {
  const text =
    payloads.map((data) => `data: ${JSON.stringify(data)}\r\n\r\n`).join('') +
    (done ? 'data: [DONE]\r\n\r\n' : '');
  const bytes = new TextEncoder().encode(text);
  responses.push(
    new Response(
      new ReadableStream({
        start(controller) {
          for (let offset = 0; offset < bytes.length; offset += 3)
            controller.enqueue(bytes.slice(offset, offset + 3));
          controller.close();
        },
      }),
    ),
  );
}
const delta = (
  value: Record<string, unknown>,
  finish_reason: string | null = null,
) => ({
  choices: [{ index: 0, delta: value, finish_reason }],
});
const createThinking = () =>
  ChatServiceFactory.createChatService('sarashina', {
    apiKey: secret,
    model: MODEL_SARASHINA_3_2_MINI_THINKING,
  });

beforeEach(() => {
  requests = [];
  responses = [];
  vi.stubGlobal('TextDecoder', TextDecoder);
  vi.stubGlobal('TextEncoder', TextEncoder);
  ChatServiceHttpClient.setFetch(async (url, init) => {
    const response = responses.shift();
    if (!response) throw new Error(`Unexpected request blocked: ${url}`);
    expect(init?.method).toBe('POST');
    requests.push({
      url,
      headers: new Headers(init!.headers),
      body: JSON.parse(init!.body as string),
    });
    return response;
  });
});
afterEach(() => {
  ChatServiceHttpClient.setFetch((url, init) => fetch(url, init));
  vi.unstubAllGlobals();
  expect(responses).toEqual([]);
});

describe('Sarashina provider and transport (offline)', () => {
  it('registers text/streaming/tools with nano as the lightest conversational default', () => {
    const provider = new SarashinaChatServiceProvider();
    const service = ChatServiceFactory.createChatService('sarashina', {
      apiKey: secret,
    });
    expect(service).toBeInstanceOf(SarashinaChatService);
    expect(service.provider).toBe('sarashina');
    expect(service.getModel()).toBe(MODEL_SARASHINA_3_NANO);
    expect(provider.getDefaultModel()).toBe(MODEL_SARASHINA_3_NANO);
    expect(provider.getProviderName()).toBe('sarashina');
    expect(ChatServiceFactory.getAvailableProviders()).toContain('sarashina');
    expect(ChatServiceFactory.getSupportedModels('sarashina')).toEqual([
      MODEL_SARASHINA_3_NANO,
      MODEL_SARASHINA_3_MINI,
      MODEL_SARASHINA_3_2_MINI_THINKING,
    ]);
    expect(provider.getSupportedModels()).not.toContain('sarashina3-guard');
    expect(getChatBackendProviderCapabilities('sarashina')).toEqual({
      text: true,
      tools: true,
      streaming: true,
    });
  });

  it.each(['', '   '])('requires a nonempty API key (%j)', (apiKey) => {
    expect(() =>
      ChatServiceFactory.createChatService('sarashina', { apiKey }),
    ).toThrow('requires apiKey');
    expect(() => new SarashinaChatService(apiKey)).toThrow('requires apiKey');
    expect(requests).toEqual([]);
  });

  it.each(SARASHINA_SUPPORTED_MODELS)(
    'sends the exact endpoint, authentication and model %s',
    async (model) => {
      jsonReply({ content: 'Hello' });
      const service = ChatServiceFactory.createChatService('sarashina', {
        apiKey: secret,
        model,
        responseLength: 'short',
      });
      const result = await service.chatOnce(messages, false, () => {});
      expect(requests[0].url).toBe(ENDPOINT_SARASHINA_CHAT_COMPLETIONS_API);
      expect(requests[0].headers.get('Authorization')).toBe(`Bearer ${secret}`);
      expect(requests[0].headers.get('Content-Type')).toBe('application/json');
      expect(requests[0].body).toMatchObject({
        model,
        messages,
        stream: false,
        max_completion_tokens: 100,
      });
      expect(requests[0].body.max_tokens).toBeUndefined();
      expect(requests[0].body.reasoning_effort).toBe(
        model === MODEL_SARASHINA_3_2_MINI_THINKING ? 'low' : undefined,
      );
      expect(result.blocks).toEqual([{ type: 'text', text: 'Hello' }]);
      expect(result.usage?.total_tokens).toBe(30);
    },
  );

  it.each([undefined, 'low', 'medium', 'high'] as const)(
    'sends thinking effort %s without changing its value',
    async (reasoning_effort) => {
      jsonReply({ content: 'ok' });
      const service = ChatServiceFactory.createChatService('sarashina', {
        apiKey: secret,
        model: MODEL_SARASHINA_3_2_MINI_THINKING,
        reasoning_effort,
      });
      await service.chatOnce(messages, false, () => {});
      expect(requests[0].body.reasoning_effort).toBe(reasoning_effort ?? 'low');
      expect(
        getDefaultSarashinaReasoningEffort(MODEL_SARASHINA_3_2_MINI_THINKING),
      ).toBe('low');
      expect(
        getSarashinaSupportedReasoningEfforts(
          MODEL_SARASHINA_3_2_MINI_THINKING,
        ),
      ).toEqual(['low', 'medium', 'high']);
    },
  );

  it.each([MODEL_SARASHINA_3_NANO, MODEL_SARASHINA_3_MINI])(
    'rejects explicit thinking effort on non-thinking model %s before sending',
    (model) => {
      expect(() =>
        ChatServiceFactory.createChatService('sarashina', {
          apiKey: secret,
          model,
          reasoning_effort: 'low',
        }),
      ).toThrow('does not support reasoning_effort');
      expect(getSarashinaSupportedReasoningEfforts(model)).toEqual([]);
      expect(getDefaultSarashinaReasoningEffort(model)).toBeUndefined();
      expect(requests).toEqual([]);
    },
  );

  it.each(['none', 'minimal', 'xhigh', 'max'])(
    'rejects unsupported effort %s at runtime',
    (reasoning_effort) => {
      expect(() =>
        ChatServiceFactory.createChatService('sarashina', {
          apiKey: secret,
          model: MODEL_SARASHINA_3_2_MINI_THINKING,
          reasoning_effort,
        } as any),
      ).toThrow('does not support reasoning_effort');
    },
  );

  it.each([
    [100000, 8000],
    [8000, 8000],
    [1, 1],
    [0, 1],
    [-4, 1],
    [12.9, 12],
  ])('clamps explicit token limit %s to %s', async (limit, expected) => {
    jsonReply({ content: 'ok' });
    await new SarashinaChatService(secret).chatOnce(
      messages,
      false,
      () => {},
      limit,
    );
    expect(requests[0].body.max_completion_tokens).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a non-finite token limit %s',
    async (limit) => {
      await expect(
        new SarashinaChatService(secret).chatOnce(
          messages,
          false,
          () => {},
          limit,
        ),
      ).rejects.toThrow('must be finite');
      expect(requests).toEqual([]);
    },
  );

  it('uses the shared 5000-token default when responseLength is omitted', async () => {
    jsonReply({ content: 'ok' });
    await new SarashinaChatService(secret).chatOnce(messages, false);
    expect(requests[0].body.max_completion_tokens).toBe(5000);
  });

  it.each([
    [
      { baseUrl: ' https://proxy.example.test/v1/ ' },
      'https://proxy.example.test/v1/chat/completions',
    ],
    [
      { baseUrl: 'https://proxy.example.test/v1/chat/completions/' },
      'https://proxy.example.test/v1/chat/completions',
    ],
    [
      {
        endpoint: 'https://proxy.example.test/chat/',
        baseUrl: 'https://ignored.example.test/v1',
      },
      'https://proxy.example.test/chat',
    ],
  ] as const)('normalizes endpoint settings %j', async (options, endpoint) => {
    jsonReply({ content: 'ok' });
    const service = ChatServiceFactory.createChatService('sarashina', {
      apiKey: secret,
      ...options,
    });
    await service.chatOnce(messages, false, () => {});
    expect(requests[0].url).toBe(endpoint);
  });

  it.each([false, true])(
    'preserves and replays encrypted reasoning with tool calls (stream=%s)',
    async (stream) => {
      if (stream)
        streamReply([
          delta({ reasoning: encrypted.slice(0, 7) }),
          delta({ reasoning: encrypted.slice(7) }),
          delta({
            tool_calls: [
              {
                index: 0,
                ...toolCall,
                function: { name: tool.name, arguments: '{' },
              },
            ],
          }),
          delta(
            { tool_calls: [{ index: 0, function: { arguments: '}' } }] },
            'tool_calls',
          ),
          { choices: [], usage: { total_tokens: 30 } },
        ]);
      else
        jsonReply(
          { content: null, reasoning: encrypted, tool_calls: [toolCall] },
          'tool_calls',
        );
      const service = ChatServiceFactory.createChatService('sarashina', {
        apiKey: secret,
        model: MODEL_SARASHINA_3_2_MINI_THINKING,
        tools: [tool],
      });
      const onPartial = vi.fn();
      const result = await service.chatOnce(messages, stream, onPartial);
      expect(result.blocks).toContainEqual({
        type: 'tool_use',
        id: toolCall.id,
        name: tool.name,
        input: {},
      });
      expect(result.stop_reason).toBe('tool_use');
      expect(result.assistant_message?.reasoning).toBe(encrypted);
      expect(result.assistant_message?.tool_calls).toEqual([toolCall]);
      expect(result.assistant_message?.reasoning_content).toBeUndefined();
      expect(onPartial).not.toHaveBeenCalled();
      expect(requests[0].body.tools).toEqual([
        { type: 'function', function: tool },
      ]);
      expect(requests[0].body.tool_choice).toBe('auto');
      const next = buildToolContinuationMessages({
        provider: 'sarashina',
        messages,
        completion: result,
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: 'Mock result',
          },
        ],
      });
      jsonReply({ content: 'Finished', reasoning: 'bmV4dA==' });
      await service.chatOnce(next, false, () => {});
      expect(requests[1].body.messages[1]).toEqual(result.assistant_message);
      expect(requests[1].body.messages[2]).toEqual({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: 'Mock result',
      });
    },
  );

  it('returns encrypted state through processChat without displaying it', async () => {
    streamReply([
      delta({ reasoning: encrypted }),
      delta({ content: 'こんにちは' }),
      delta({ content: '！' }, 'stop'),
    ]);
    const partial = vi.fn();
    const completed = vi.fn(async () => {});
    await createThinking().processChat(messages, partial, completed);
    expect(partial.mock.calls.map(([text]) => text).join('')).toBe(
      'こんにちは！',
    );
    expect(completed).toHaveBeenCalledWith(
      'こんにちは！',
      expect.objectContaining({
        assistant_message: {
          role: 'assistant',
          content: 'こんにちは！',
          reasoning: encrypted,
        },
      }),
    );
  });

  it('replays ordinary assistant reasoning exactly and strips unrelated metadata', async () => {
    jsonReply({ content: 'First', reasoning: encrypted });
    const service = createThinking();
    const first = await service.chatOnce(messages, false, () => {});
    jsonReply({ content: 'Second' });
    await service.chatOnce(
      [
        ...messages,
        { ...first.assistant_message!, timestamp: 123 },
        {
          role: 'user',
          content: 'Continue',
          reasoning: 'not-an-assistant-state',
        },
      ],
      false,
      () => {},
    );
    expect(requests[1].body.messages[1]).toEqual({
      role: 'assistant',
      content: 'First',
      reasoning: encrypted,
    });
    expect(requests[1].body.messages[2]).toEqual({
      role: 'user',
      content: 'Continue',
    });
  });

  it('reports output truncation without discarding encrypted state', async () => {
    jsonReply({ content: '', reasoning: encrypted }, 'length');
    const result = await createThinking().chatOnce(messages, false, () => {});
    expect(result.truncated).toBe(true);
    expect(result.finish_reason).toBe('length');
    expect(result.assistant_message?.reasoning).toBe(encrypted);
  });

  it('rejects vision configuration and all image paths before any request', async () => {
    const provider = new SarashinaChatServiceProvider();
    expect(provider.supportsVision()).toBe(false);
    expect(provider.getVisionSupportLevel()).toBe('unsupported');
    for (const model of SARASHINA_SUPPORTED_MODELS) {
      expect(provider.supportsVisionForModel(model)).toBe(false);
      expect(provider.getVisionSupportLevelForModel(model)).toBe('unsupported');
    }
    expect(() =>
      provider.createChatService({
        apiKey: secret,
        visionModel: MODEL_SARASHINA_3_NANO,
      } as any),
    ).toThrow('does not support vision');
    const service = new SarashinaChatService(secret);
    await expect(service.visionChatOnce([])).rejects.toThrow(
      'does not support vision',
    );
    await expect(
      service.processVisionChat(
        [],
        () => {},
        async () => {},
      ),
    ).rejects.toThrow('does not support vision');
    await expect(
      service.chatOnce(
        [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: 'https://image.example.test/a.png' },
              },
            ],
          },
        ] as any,
        false,
      ),
    ).rejects.toThrow('only supports text');
    expect(requests).toEqual([]);
  });

  it('rejects a stream that ends before DONE without completing or replaying partial state', async () => {
    streamReply(
      [delta({ reasoning: encrypted }), delta({ content: 'Partial' })],
      false,
    );
    const complete = vi.fn(async () => {});
    await expect(
      createThinking().processChat(messages, () => {}, complete),
    ).rejects.toThrow('missing [DONE]');
    expect(complete).not.toHaveBeenCalled();
  });

  it('surfaces errors embedded in a stream and allows a new request', async () => {
    streamReply([{ error: { message: 'Mock provider failure' } }]);
    const service = createThinking();
    await expect(service.chatOnce(messages, true, () => {})).rejects.toThrow(
      'Mock provider failure',
    );
    jsonReply({ content: 'Recovered' });
    expect((await service.chatOnce(messages, false, () => {})).blocks).toEqual([
      { type: 'text', text: 'Recovered' },
    ]);
  });

  it.each([401, 403, 429, 500])(
    'surfaces HTTP %s without silently completing',
    async (status) => {
      responses.push(
        new Response('{"message":"Mock rejection"}', {
          status,
          statusText: 'Mock error',
        }),
      );
      const complete = vi.fn(async () => {});
      await expect(
        createThinking().processChat(messages, () => {}, complete),
      ).rejects.toThrow(`HTTP ${status}`);
      expect(complete).not.toHaveBeenCalled();
    },
  );
});
