import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ChatService,
  OpenRouterChatServiceOptions,
} from '@aituber-onair/core';

type Entry = {
  id: string;
  architecture: { input_modalities: string[]; output_modalities: string[] };
  pricing: { prompt: string; completion: string };
  supported_parameters: string[];
  reasoning?: { supported_efforts: string[] };
};
const knownVision = 'openai/gpt-4o';
const dynamic = 'sample/new-chat:free';
const entry = (id: string, overrides: Partial<Entry> = {}): Entry => ({
  id,
  architecture: { input_modalities: ['text'], output_modalities: ['text'] },
  pricing: { prompt: '0', completion: '0' },
  supported_parameters: [],
  ...overrides,
});
let sdk: typeof import('@aituber-onair/core');
let catalog: typeof import('../openrouterCatalog/catalog');
let runtime: typeof import('./openRouterRuntime');
let delegateFactory: { mock: { calls: unknown[][] } };
let entries: Entry[];
let generationBodies: Record<string, unknown>[];

beforeEach(async () => {
  vi.resetModules();
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  entries = [entry(dynamic)];
  generationBodies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === 'https://openrouter.ai/api/v1/models') {
        return Response.json({ data: entries });
      }
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      generationBodies.push(body);
      if (body.stream) {
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }
      return Response.json({
        choices: [
          {
            message: { role: 'assistant', content: 'Hello' },
            finish_reason: 'stop',
          },
        ],
      });
    }),
  );
  sdk = await import('@aituber-onair/core');
  catalog = await import('../openrouterCatalog/catalog');
  runtime = await import('./openRouterRuntime');
  await catalog.refreshCatalog(true);
  delegateFactory = vi.spyOn(
    sdk.ChatServiceFactory.getProviders().get('openrouter')!,
    'createChatService',
  );
  runtime.installOpenRouterRuntimeGuard();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function service(
  options: Partial<OpenRouterChatServiceOptions> = {},
): ChatService {
  return sdk.ChatServiceFactory.createChatService('openrouter', {
    apiKey: 'test-key',
    model: dynamic,
    ...options,
  });
}

const calls = {
  processChat: (chat: ChatService) =>
    chat.processChat(
      [],
      () => {},
      async () => {},
    ),
  chatOnce: (chat: ChatService) => chat.chatOnce([], false, () => {}),
  processVisionChat: (chat: ChatService) =>
    chat.processVisionChat(
      [],
      () => {},
      async () => {},
    ),
  visionChatOnce: (chat: ChatService) =>
    chat.visionChatOnce([], false, () => {}),
};

describe('OpenRouter avatar generation-time guard', () => {
  it('installs once without changing the SDK model registry or other providers', () => {
    const before = sdk.ChatServiceFactory.getProviders().get('openrouter');
    const models = sdk.ChatServiceFactory.getSupportedModels('openrouter');
    const other = sdk.ChatServiceFactory.getProviders().get('openai');
    runtime.installOpenRouterRuntimeGuard();
    runtime.installOpenRouterRuntimeGuard();
    expect(sdk.ChatServiceFactory.getProviders().get('openrouter')).toBe(
      before,
    );
    expect(sdk.ChatServiceFactory.getSupportedModels('openrouter')).toEqual(
      models,
    );
    expect(models).not.toContain(dynamic);
    expect(sdk.ChatServiceFactory.getProviders().get('openai')).toBe(other);
  });

  it('reuses the SDK delegate and its free-tier rate-limit state', async () => {
    const chat = service();
    await calls.chatOnce(chat);
    await calls.chatOnce(chat);
    await catalog.refreshCatalog(true);
    await calls.chatOnce(chat);
    expect(delegateFactory).toHaveBeenCalledTimes(1);
    expect(generationBodies).toHaveLength(3);
  });

  it('retains the SDK free-tier wait after twenty consecutive requests', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const chat = service();
    for (let i = 0; i < 20; i++) await calls.chatOnce(chat);
    const delayed = calls.chatOnce(chat);
    await vi.advanceTimersByTimeAsync(0);
    expect(generationBodies).toHaveLength(20);
    expect(delegateFactory).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_001);
    await delayed;
    expect(generationBodies).toHaveLength(21);
  });

  it('sends a newly discovered text model with stale advanced options stripped', async () => {
    const chat = service({
      reasoning_effort: 'high',
      includeReasoning: true,
      reasoningMaxTokens: 8192,
      visionModel: dynamic,
      tools: [
        {
          name: 'test_tool',
          description: 'test',
          parameters: { type: 'object' },
        },
      ],
    });
    await calls.chatOnce(chat);
    expect(generationBodies).toHaveLength(1);
    expect(generationBodies[0]).toMatchObject({ model: dynamic });
    expect(generationBodies[0]).not.toHaveProperty('tools');
    expect(generationBodies[0]).not.toHaveProperty('tool_choice');
    expect(generationBodies[0].reasoning).toEqual({ exclude: true });
  });

  it.each(Object.entries(calls))(
    'blocks a removed model at %s invocation without a rerender',
    async (_name, call) => {
      const chat = service();
      entries = [];
      await catalog.refreshCatalog(true);
      await expect(call(chat)).rejects.toThrow('absent');
      expect(generationBodies).toHaveLength(0);
    },
  );

  it('blocks repriced previously free model until current pricing is acknowledged', async () => {
    const chat = service();
    await calls.chatOnce(chat);
    entries = [
      entry(dynamic, { pricing: { prompt: '0.01', completion: '0.02' } }),
    ];
    await catalog.refreshCatalog(true);
    await expect(calls.chatOnce(chat)).rejects.toThrow('Pricing');
    expect(generationBodies).toHaveLength(1);
    catalog.acknowledgeOpenRouterModel(dynamic);
    await calls.chatOnce(chat);
    expect(generationBodies).toHaveLength(2);
  });

  it('rechecks a queued generation after catalog refresh', async () => {
    const chat = service();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const request = pending.then(() => calls.chatOnce(chat));
    entries = [];
    await catalog.refreshCatalog(true);
    release();
    await expect(request).rejects.toThrow('absent');
    expect(generationBodies).toHaveLength(0);
  });

  it('guards later tool-loop/comment-analysis calls on the same service', async () => {
    const chat = service();
    await calls.processChat(chat);
    entries = [];
    await catalog.refreshCatalog(true);
    await expect(calls.chatOnce(chat)).rejects.toThrow('absent');
    expect(generationBodies).toHaveLength(1);
  });

  it('requires exact SDK vision support as well as catalog image metadata', async () => {
    entries = [
      entry(knownVision, {
        architecture: {
          input_modalities: ['text', 'image'],
          output_modalities: ['text'],
        },
      }),
      entry(`new/${knownVision}-lookalike`, {
        architecture: {
          input_modalities: ['text', 'image'],
          output_modalities: ['text'],
        },
      }),
    ];
    await catalog.refreshCatalog(true);
    const chat = service({ model: knownVision });
    await calls.visionChatOnce(chat);
    await expect(
      calls.visionChatOnce(service({ model: `new/${knownVision}-lookalike` })),
    ).rejects.toThrow('Screen vision');
    entries = [entry(knownVision)];
    await catalog.refreshCatalog(true);
    await expect(calls.visionChatOnce(chat)).rejects.toThrow('Screen vision');
    expect(generationBodies).toHaveLength(1);
  });

  it('drops stale tool/reasoning settings when refreshed metadata removes support', async () => {
    entries = [
      entry(knownVision, {
        supported_parameters: ['tools', 'tool_choice', 'reasoning'],
        reasoning: { supported_efforts: ['low'] },
      }),
    ];
    await catalog.refreshCatalog(true);
    const options: OpenRouterChatServiceOptions = {
      apiKey: 'test-key',
      model: knownVision,
      reasoning_effort: 'high',
      includeReasoning: true,
      reasoningMaxTokens: 8192,
      tools: [
        {
          name: 'test_tool',
          description: 'test',
          parameters: { type: 'object' },
        },
      ],
    };
    // An effort accepted by the SDK but not this catalog record is stripped.
    expect(runtime.sanitizeOpenRouterOptions(options)).not.toHaveProperty(
      'reasoning_effort',
    );
    expect(
      runtime.sanitizeOpenRouterOptions({
        ...options,
        reasoning_effort: 'low',
      }),
    ).toHaveProperty('reasoning_effort', 'low');
    const chat = service(options);
    await calls.chatOnce(chat);
    expect(generationBodies[0]).toHaveProperty('tools');
    entries = [entry(knownVision)];
    await catalog.refreshCatalog(true);
    await calls.chatOnce(chat);
    expect(generationBodies[1]).not.toHaveProperty('tools');
    expect(generationBodies[1].reasoning).toEqual({ exclude: true });
    expect(delegateFactory).toHaveBeenCalledTimes(2);
  });

  it('sanitizes advanced options for the actual vision model independently', async () => {
    const imageOnly = 'openai/gpt-4.1-mini';
    entries = [
      entry(knownVision, {
        architecture: {
          input_modalities: ['text', 'image'],
          output_modalities: ['text'],
        },
        supported_parameters: ['tools', 'tool_choice', 'reasoning'],
        reasoning: { supported_efforts: ['low'] },
      }),
      entry(imageOnly, {
        architecture: {
          input_modalities: ['text', 'image'],
          output_modalities: ['text'],
        },
      }),
    ];
    await catalog.refreshCatalog(true);
    const chat = service({
      model: knownVision,
      visionModel: imageOnly,
      reasoning_effort: 'low',
      tools: [
        {
          name: 'test_tool',
          description: 'test',
          parameters: { type: 'object' },
        },
      ],
    });
    await calls.chatOnce(chat);
    await calls.visionChatOnce(chat);
    expect(generationBodies[0]).toMatchObject({
      model: knownVision,
      reasoning: { effort: 'low' },
    });
    expect(generationBodies[0]).toHaveProperty('tools');
    expect(generationBodies[1]).toMatchObject({
      model: imageOnly,
      reasoning: { exclude: true },
    });
    expect(generationBodies[1]).not.toHaveProperty('tools');
    expect(generationBodies[1].reasoning).not.toHaveProperty('effort');
  });

  it('guards the Core orchestrator itself after creation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const core = new sdk.AITuberOnAirCore({
      chatProvider: 'openrouter',
      apiKey: 'test-key',
      model: dynamic,
      chatOptions: { systemPrompt: 'Be brief.' },
    });
    const errors: unknown[] = [];
    core.on(sdk.AITuberOnAirCoreEvent.ERROR, (error) => errors.push(error));
    expect(await core.processChat('Hello')).toBe(true);
    entries = [];
    await catalog.refreshCatalog(true);
    await core.processChat('Still there?');
    expect(generationBodies).toHaveLength(1);
    expect(String(errors.at(-1))).toContain('absent');
    core.offAll();
  });

  it('keeps unrelated providers outside the catalog gate', () => {
    expect(
      runtime.getOpenRouterRuntimeBlockReason('openai', 'not-in-catalog', true),
    ).toBeNull();
  });
});
