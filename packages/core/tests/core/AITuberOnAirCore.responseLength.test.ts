import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  type ChatService,
  type ToolChatCompletion,
} from '@aituber-onair/chat';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  type AITuberOnAirCoreOptions,
} from '../../src/core/AITuberOnAirCore';

const completion: ToolChatCompletion = {
  blocks: [{ type: 'text', text: 'Hello' }],
  stop_reason: 'end',
};

function createService() {
  return {
    provider: 'openai',
    getModel: vi.fn().mockReturnValue('gpt-4.1-mini'),
    getVisionModel: vi.fn().mockReturnValue('gpt-4.1-mini'),
    processChat: vi.fn(),
    processVisionChat: vi.fn(),
    chatOnce: vi.fn().mockResolvedValue(completion),
    visionChatOnce: vi.fn().mockResolvedValue(completion),
    dispose: vi.fn(),
  } satisfies ChatService;
}

function createCore(overrides: Partial<AITuberOnAirCoreOptions> = {}) {
  return new AITuberOnAirCore({
    apiKey: 'test-key',
    model: 'gpt-4.1-mini',
    chatOptions: { systemPrompt: 'Be helpful.', responseLength: 'short' },
    ...overrides,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Core response length provider options', () => {
  beforeEach(() => {
    vi.spyOn(ChatServiceFactory, 'createChatService').mockImplementation(() =>
      createService(),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Unexpected HTTP')),
    );
  });

  it.each<NonNullable<AITuberOnAirCoreOptions['chatProvider']>>([
    'openai',
    'openrouter',
    'gemini',
    'gemini-nano',
    'claude',
    'zai',
    'kimi',
    'deepseek',
    'mistral',
    'xai',
    'sakana',
    'plamo',
    'codex-sdk',
    'claude-agent-sdk',
    'copilot-sdk',
  ])('forwards and updates responseLength for %s', (chatProvider) => {
    const core = createCore({ chatProvider, apiKey: undefined });
    expect(ChatServiceFactory.createChatService).toHaveBeenLastCalledWith(
      chatProvider,
      expect.objectContaining({ responseLength: 'short' }),
    );

    core.updateChatOptions({ responseLength: 'long' });

    expect(ChatServiceFactory.createChatService).toHaveBeenLastCalledWith(
      chatProvider,
      expect.objectContaining({ responseLength: 'long' }),
    );
  });

  it('inherits the chat preset when the provider preset is undefined', () => {
    const core = createCore({ providerOptions: { responseLength: undefined } });
    expect(ChatServiceFactory.createChatService).toHaveBeenLastCalledWith(
      'openai',
      expect.objectContaining({ responseLength: 'short' }),
    );
    core.updateChatOptions({ responseLength: 'long' });
    expect(ChatServiceFactory.createChatService).toHaveBeenLastCalledWith(
      'openai',
      expect.objectContaining({ responseLength: 'long' }),
    );
  });

  it.each([
    { providerOptions: { responseLength: 'medium' as const } },
    { chatProvider: 'openai-compatible' as const },
  ])(
    'does not rebuild when the chat preset is overridden or ignored: %j',
    (options) => {
      const core = createCore(options);
      core.updateChatOptions({ responseLength: 'long' });
      expect(ChatServiceFactory.createChatService).toHaveBeenCalledTimes(1);
    },
  );

  it('does not rebuild for unrelated options or an unchanged preset', () => {
    const core = createCore();
    core.updateChatOptions({ systemPrompt: 'New prompt', maxTokens: 500 });
    core.updateChatOptions({ responseLength: 'short' });
    expect(ChatServiceFactory.createChatService).toHaveBeenCalledTimes(1);
  });

  it('preserves provider options, memory, tools, history and event wiring', async () => {
    const handler = vi.fn().mockResolvedValue('tool result');
    const tool = { name: 'lookup', parameters: { type: 'object' as const } };
    const mcpServers = [
      {
        type: 'url' as const,
        name: 'remote',
        url: 'https://example.invalid/mcp',
      },
    ];
    const storage = {
      load: vi
        .fn()
        .mockResolvedValue([
          { type: 'short', summary: 'Remember this', timestamp: Date.now() },
        ]),
      save: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };
    const core = createCore({
      providerOptions: {
        visionModel: 'gpt-4.1',
        responseFormat: { type: 'json_object' },
      },
      tools: [{ definition: tool, handler }],
      mcpServers,
      memoryOptions: {
        enableSummarization: true,
        shortTermDuration: 60_000,
        midTermDuration: 240_000,
        longTermDuration: 540_000,
        maxMessagesBeforeSummarization: 100,
      },
      memoryStorage: storage,
    });
    const memoryManager = (core as any).memoryManager;
    await vi.waitFor(() =>
      expect(memoryManager.getMemoryForPrompt()).toContain('Remember this'),
    );
    const history = [{ role: 'user' as const, content: 'Earlier question' }];
    core.setChatHistory(history);
    const onResponse = vi.fn();
    const onToolResult = vi.fn();
    const onError = vi.fn();
    core.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, onResponse);
    core.on(AITuberOnAirCoreEvent.TOOL_RESULT, onToolResult);
    core.on(AITuberOnAirCoreEvent.ERROR, onError);
    const factory = vi.mocked(ChatServiceFactory.createChatService);
    const originalOptions = factory.mock.calls[0][1];
    const oldService = factory.mock.results[0].value;

    core.updateChatOptions({ responseLength: 'long' });

    expect(factory).toHaveBeenLastCalledWith('openai', {
      ...originalOptions,
      responseLength: 'long',
    });
    expect(core.getChatHistory()).toEqual(history);
    expect((core as any).memoryManager).toBe(memoryManager);
    expect(oldService.dispose).toHaveBeenCalledOnce();
    expect(storage.load).toHaveBeenCalledOnce();
    expect(storage.clear).not.toHaveBeenCalled();
    const nextService = factory.mock.results[1].value;
    nextService.chatOnce.mockResolvedValueOnce({
      blocks: [
        {
          type: 'tool_use',
          id: 'call-1',
          name: 'lookup',
          input: { query: 'test' },
        },
      ],
      stop_reason: 'tool_use',
    });
    await core.processChat('Next question');

    expect(onError).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith({ query: 'test' });
    expect(onToolResult).toHaveBeenCalledOnce();
    expect(onResponse).toHaveBeenCalledOnce();
    expect(nextService.chatOnce.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        history[0],
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('Remember this'),
        }),
      ]),
    );
    expect(core.getChatHistory()).toHaveLength(3);
    expect(oldService.chatOnce).not.toHaveBeenCalled();
  });

  it('keeps the old service and options when replacement creation fails', async () => {
    const core = createCore();
    const factory = vi.mocked(ChatServiceFactory.createChatService);
    const oldService = factory.mock.results[0].value;
    factory.mockImplementationOnce(() => {
      throw new Error('Cannot create service');
    });

    expect(() =>
      core.updateChatOptions({
        responseLength: 'long',
        systemPrompt: 'Changed',
      }),
    ).toThrow('Cannot create service');
    await core.processChat('Hello');
    expect(oldService.chatOnce.mock.calls[0][0][0].content).toBe('Be helpful.');
    expect(oldService.dispose).not.toHaveBeenCalled();
    core.updateChatOptions({ responseLength: 'long' });
    expect(factory).toHaveBeenCalledTimes(3);
  });

  it('finishes an active tool loop before replacing and disposing its service', async () => {
    const core = createCore({
      tools: [
        {
          definition: { name: 'lookup', parameters: { type: 'object' } },
          handler: async () => 'result',
        },
      ],
    });
    const factory = vi.mocked(ChatServiceFactory.createChatService);
    const oldService = factory.mock.results[0].value;
    let resolve!: (value: ToolChatCompletion) => void;
    oldService.chatOnce.mockReturnValueOnce(
      new Promise<ToolChatCompletion>((done) => {
        resolve = done;
      }),
    );
    const pending = core.processChat('First');
    await vi.waitFor(() => expect(oldService.chatOnce).toHaveBeenCalledOnce());

    core.updateChatOptions({ responseLength: 'medium' });
    core.updateChatOptions({ responseLength: 'long' });
    const supersededService = factory.mock.results[1].value;
    const nextService = factory.mock.results[2].value;
    expect(supersededService.dispose).toHaveBeenCalledOnce();
    expect(oldService.dispose).not.toHaveBeenCalled();
    resolve({
      blocks: [{ type: 'tool_use', id: 'call-1', name: 'lookup', input: {} }],
      stop_reason: 'tool_use',
    });
    await pending;

    expect(oldService.chatOnce).toHaveBeenCalledTimes(2);
    expect(oldService.dispose).toHaveBeenCalledOnce();
    expect(nextService.chatOnce).not.toHaveBeenCalled();
    await core.processChat('Second');
    expect(nextService.chatOnce).toHaveBeenCalledOnce();
    expect(core.getChatHistory()).toHaveLength(4);
  });

  it('waits for all active one-shot requests, including failures', async () => {
    const core = createCore();
    const factory = vi.mocked(ChatServiceFactory.createChatService);
    const oldService = factory.mock.results[0].value;
    let resolve!: (value: ToolChatCompletion) => void;
    let reject!: (error: Error) => void;
    oldService.chatOnce
      .mockReturnValueOnce(
        new Promise<ToolChatCompletion>((done) => {
          resolve = done;
        }),
      )
      .mockReturnValueOnce(
        new Promise<ToolChatCompletion>((_done, fail) => {
          reject = fail;
        }),
      );
    const first = core.generateOneShotContentFromHistory('First', []);
    const second = core.generateOneShotContentFromHistory('Second', []);
    const failed = expect(second).rejects.toThrow('Request failed');
    core.updateChatOptions({ responseLength: 'long' });
    resolve(completion);
    await first;
    expect(oldService.dispose).not.toHaveBeenCalled();
    reject(new Error('Request failed'));
    await failed;
    expect(oldService.dispose).toHaveBeenCalledOnce();

    await core.generateOneShotContentFromHistory('Third', []);
    expect(factory.mock.results[1].value.chatOnce).toHaveBeenCalledOnce();
    expect(core.getChatHistory()).toEqual([]);
  });
});

describe('Core response length HTTP requests', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (_url: string, request: RequestInit) => {
      const body = JSON.parse(request.body as string);
      if (body.stream) {
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello' }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`,
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: 'assistant', content: 'Hello' },
              finish_reason: 'stop',
            },
          ],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  function bodyAt(index: number) {
    return JSON.parse(fetchMock.mock.calls[index][1].body as string);
  }

  it.each([
    { name: 'chat preset', options: {}, tokens: 100 },
    {
      name: 'provider override',
      options: { providerOptions: { responseLength: 'long' as const } },
      tokens: 300,
    },
    {
      name: 'explicit maxTokens',
      options: {
        chatOptions: {
          systemPrompt: 'Test',
          responseLength: 'short' as const,
          maxTokens: 250,
        },
        providerOptions: { responseLength: 'long' as const },
      },
      tokens: 250,
    },
    {
      name: 'provider default',
      options: { chatOptions: { systemPrompt: 'Test' } },
      tokens: 5000,
    },
  ])('uses $name in the OpenAI request', async ({ options, tokens }) => {
    const core = createCore(options);
    await core.processChat('Hello');
    expect(bodyAt(0).max_completion_tokens).toBe(tokens);
    expect(core.getChatHistory().at(-1)?.content).toBe('Hello');
  });

  it('updates text and one-shot requests while preserving chat history', async () => {
    const core = createCore();
    await core.processChat('First');
    const history = core.getChatHistory();
    core.updateChatOptions({ responseLength: 'long' });
    expect(core.getChatHistory()).toEqual(history);
    await core.processChat('Second');
    expect(bodyAt(0).max_completion_tokens).toBe(100);
    expect(bodyAt(1).max_completion_tokens).toBe(300);
    expect(bodyAt(1).messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'First' }),
        expect.objectContaining({ role: 'assistant', content: 'Hello' }),
      ]),
    );
    await core.generateOneShotContentFromHistory('Summarize', []);
    expect(bodyAt(2).max_completion_tokens).toBe(300);
    expect(core.getChatHistory()).toHaveLength(4);
  });

  it('restores the provider default when the chat preset is cleared', async () => {
    const core = createCore();
    core.updateChatOptions({ responseLength: undefined });
    await core.processChat('Hello');
    expect(bodyAt(0).max_completion_tokens).toBe(5000);
  });

  it('keeps explicit maxTokens effective after a preset update', async () => {
    const core = createCore({
      chatOptions: {
        systemPrompt: 'Test',
        responseLength: 'short',
        maxTokens: 250,
      },
    });
    core.updateChatOptions({ responseLength: 'long' });
    await core.processChat('Hello');
    expect(bodyAt(0).max_completion_tokens).toBe(250);
  });

  it('keeps visionResponseLength independent of the text preset', async () => {
    const core = createCore({
      chatOptions: {
        systemPrompt: 'Test',
        responseLength: 'short',
        visionResponseLength: 'long',
      },
    });
    await core.processVisionChat('data:image/png;base64,test');
    core.updateChatOptions({ responseLength: 'medium' });
    await core.processVisionChat('data:image/png;base64,test');
    await core.processChat('Hello');
    expect(bodyAt(0).max_completion_tokens).toBe(300);
    expect(bodyAt(1).max_completion_tokens).toBe(300);
    expect(bodyAt(2).max_completion_tokens).toBe(200);
  });

  it.each([
    { providerLength: undefined, maxTokens: undefined, expected: undefined },
    { providerLength: 'short' as const, maxTokens: undefined, expected: 100 },
    { providerLength: 'short' as const, maxTokens: 250, expected: 250 },
  ])(
    'keeps compatible endpoint token limits opt-in: %j',
    async ({ providerLength, maxTokens, expected }) => {
      const core = createCore({
        chatProvider: 'openai-compatible',
        apiKey: undefined,
        model: 'local-model',
        chatOptions: {
          systemPrompt: 'Test',
          responseLength: 'short',
          maxTokens,
        },
        providerOptions: {
          endpoint: 'https://example.invalid/v1/chat/completions',
          responseLength: providerLength,
        },
      });
      await core.processChat('First');
      core.updateChatOptions({ responseLength: 'long' });
      await core.processChat('Second');
      for (const index of [0, 1]) {
        expect(bodyAt(index).max_tokens).toBe(expected);
        expect(bodyAt(index)).not.toHaveProperty('max_completion_tokens');
        if (expected === undefined)
          expect(bodyAt(index)).not.toHaveProperty('max_tokens');
      }
    },
  );
});
