import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  MODEL_MISTRAL_ZAI_GLM_5_3,
  MODEL_MINISTRAL_14B_2512,
  MODEL_MINISTRAL_3B_2512,
  MODEL_MINISTRAL_8B_2512,
  MODEL_MISTRAL_LARGE_2512,
  MODEL_MISTRAL_LARGE_4_0,
  MISTRAL_DEPRECATED_MODELS,
  MODEL_MISTRAL_LARGE_LATEST,
  MODEL_MISTRAL_MEDIUM_3_5,
  MODEL_MISTRAL_SMALL_2603,
  MODEL_MISTRAL_SMALL_LATEST,
  MISTRAL_SUPPORTED_MODELS,
  isMistralReasoningEffortModel,
} from '../../src/constants';
import { MistralChatService } from '../../src/services/providers/mistral/MistralChatService';
import { MistralChatServiceProvider } from '../../src/services/providers/mistral/MistralChatServiceProvider';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

describe('MistralChatServiceProvider', () => {
  const provider = new MistralChatServiceProvider();

  beforeEach(() => vi.restoreAllMocks());

  describe.each([MODEL_MISTRAL_SMALL_LATEST, MODEL_MISTRAL_MEDIUM_3_5])(
    '%s reasoning defaults',
    (model) => {
      it.each([undefined, 'none', 'high'] as const)(
        'sends effort %s with none as the default',
        async (effort) => {
          const post = vi
            .spyOn(ChatServiceHttpClient, 'post')
            .mockResolvedValue({
              json: async () => ({
                choices: [{ message: { content: 'Hello' } }],
              }),
            } as Response);
          const service = provider.createChatService({
            apiKey: 'test-key',
            model,
            reasoning_effort: effort,
          });
          await service.chatOnce!([{ role: 'user', content: 'Hello' }], false);
          expect(post.mock.calls[0][0]).toBe(
            ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
          );
          expect(post.mock.calls[0][1].reasoning_effort).toBe(effort ?? 'none');
          expect(post.mock.calls[0][1].reasoning).toBeUndefined();
        },
      );
    },
  );

  it.each([undefined, 'none', 'high'] as const)(
    'omits effort %s for every model without adjustable reasoning',
    async (effort) => {
      const post = vi.spyOn(ChatServiceHttpClient, 'post').mockResolvedValue({
        json: async () => ({ choices: [{ message: { content: 'Hello' } }] }),
      } as Response);
      for (const model of MISTRAL_SUPPORTED_MODELS.filter(
        (candidate) => !isMistralReasoningEffortModel(candidate),
      )) {
        const service = provider.createChatService({
          apiKey: 'test-key',
          model,
          reasoning_effort: effort,
        });
        await service.chatOnce!([{ role: 'user', content: 'Hello' }], false);
        expect(post.mock.calls.at(-1)![1].model).toBe(model);
        expect(post.mock.calls.at(-1)![1].reasoning_effort).toBeUndefined();
        expect(post.mock.calls.at(-1)![1].reasoning).toBeUndefined();
      }
    },
  );

  it('returns provider name', () => {
    expect(provider.getProviderName()).toBe('mistral');
  });

  it('returns current Mistral supported models', () => {
    expect(provider.getSupportedModels()).toEqual([
      MODEL_MISTRAL_SMALL_LATEST,
      MODEL_MINISTRAL_3B_2512,
      MODEL_MINISTRAL_8B_2512,
      MODEL_MINISTRAL_14B_2512,
      MODEL_MISTRAL_MEDIUM_3_5,
      MODEL_MISTRAL_LARGE_LATEST,
      MODEL_MISTRAL_LARGE_4_0,
      MODEL_MISTRAL_SMALL_2603,
      MODEL_MISTRAL_ZAI_GLM_5_3,
    ]);
  });

  it('does not advertise deprecated Mistral models', () => {
    const models = provider.getSupportedModels();
    expect(MISTRAL_DEPRECATED_MODELS).toContain(MODEL_MISTRAL_LARGE_2512);
    for (const model of MISTRAL_DEPRECATED_MODELS) {
      expect(models).not.toContain(model);
    }
  });

  it('returns Mistral Small Latest as the default model', () => {
    expect(provider.getDefaultModel()).toBe(MODEL_MISTRAL_SMALL_LATEST);
  });

  it('reports vision support for supported Mistral models', () => {
    expect(provider.supportsVision()).toBe(true);
    expect(provider.supportsVisionForModel(MODEL_MISTRAL_SMALL_LATEST)).toBe(
      true,
    );
    expect(provider.supportsVisionForModel(MODEL_MINISTRAL_3B_2512)).toBe(true);
    expect(provider.supportsVisionForModel(MODEL_MINISTRAL_8B_2512)).toBe(true);
    expect(provider.supportsVisionForModel(MODEL_MINISTRAL_14B_2512)).toBe(
      true,
    );
    expect(provider.supportsVisionForModel(MODEL_MISTRAL_LARGE_4_0)).toBe(true);
    expect(provider.getVisionSupportLevel()).toBe('supported');
    expect(
      provider.getVisionSupportLevelForModel(MODEL_MISTRAL_SMALL_LATEST),
    ).toBe('supported');
    expect(provider.getVisionSupportLevelForModel('unknown-model')).toBe(
      'unsupported',
    );
  });

  it('requires an apiKey', () => {
    expect(() => {
      provider.createChatService({ apiKey: '' });
    }).toThrow('mistral provider requires apiKey');
  });

  it('creates a chat service with default model and endpoint', () => {
    const service = provider.createChatService({ apiKey: 'test-key' });

    expect(service).toBeInstanceOf(MistralChatService);
    expect(service.getModel()).toBe(MODEL_MISTRAL_SMALL_LATEST);
    expect(service.getVisionModel()).toBe(MODEL_MISTRAL_SMALL_LATEST);
    expect((service as any).endpoint).toBe(
      ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
    );
    expect((service as any).provider).toBe('mistral');
  });

  it('uses /chat/completions when baseUrl is provided', () => {
    const service = provider.createChatService({
      apiKey: 'test-key',
      baseUrl: 'https://example.mistral.test/v1/',
    });

    expect((service as any).endpoint).toBe(
      'https://example.mistral.test/v1/chat/completions',
    );
  });

  it('allows explicit endpoint override', () => {
    const service = provider.createChatService({
      apiKey: 'test-key',
      endpoint: 'https://proxy.example.test/v1/chat/completions',
    });

    expect((service as any).endpoint).toBe(
      'https://proxy.example.test/v1/chat/completions',
    );
  });
});
