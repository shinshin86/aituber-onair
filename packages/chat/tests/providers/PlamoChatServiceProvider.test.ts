import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
  MODEL_PLAMO_3_0_PRIME,
  MODEL_PLAMO_3_1_PRIME,
} from '../../src/constants';
import { PlamoChatService } from '../../src/services/providers/plamo/PlamoChatService';
import { PlamoChatServiceProvider } from '../../src/services/providers/plamo/PlamoChatServiceProvider';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

describe('PlamoChatServiceProvider', () => {
  const provider = new PlamoChatServiceProvider();

  beforeEach(() => vi.restoreAllMocks());

  describe.each([MODEL_PLAMO_3_0_PRIME, MODEL_PLAMO_3_1_PRIME])(
    '%s reasoning defaults',
    (model) => {
      it.each([undefined, 'none', 'medium'] as const)(
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
            ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
          );
          expect(post.mock.calls[0][1].reasoning_effort).toBe(effort ?? 'none');
          expect(post.mock.calls[0][1].reasoning).toBeUndefined();
        },
      );
    },
  );

  it('returns provider name', () => {
    expect(provider.getProviderName()).toBe('plamo');
  });

  it('returns supported PLaMo models', () => {
    expect(provider.getSupportedModels()).toEqual([
      MODEL_PLAMO_3_0_PRIME,
      MODEL_PLAMO_3_1_PRIME,
    ]);
  });

  it('returns PLaMo 3.0 Prime as the default model', () => {
    expect(provider.getDefaultModel()).toBe(MODEL_PLAMO_3_0_PRIME);
  });

  it('reports vision as unsupported', () => {
    expect(provider.supportsVision()).toBe(false);
    expect(provider.supportsVisionForModel(MODEL_PLAMO_3_0_PRIME)).toBe(false);
    expect(provider.supportsVisionForModel(MODEL_PLAMO_3_1_PRIME)).toBe(false);
    expect(provider.getVisionSupportLevel()).toBe('unsupported');
    expect(provider.getVisionSupportLevelForModel(MODEL_PLAMO_3_0_PRIME)).toBe(
      'unsupported',
    );
  });

  it('requires an apiKey', () => {
    expect(() => {
      provider.createChatService({ apiKey: '' });
    }).toThrow('plamo provider requires apiKey');
  });

  it('creates a chat service with default model and endpoint', () => {
    const service = provider.createChatService({ apiKey: 'test-key' });

    expect(service).toBeInstanceOf(PlamoChatService);
    expect(service.getModel()).toBe(MODEL_PLAMO_3_0_PRIME);
    expect(service.getVisionModel()).toBe(MODEL_PLAMO_3_0_PRIME);
    expect((service as any).endpoint).toBe(ENDPOINT_PLAMO_CHAT_COMPLETIONS_API);
    expect((service as any).provider).toBe('plamo');
  });

  it('uses /chat/completions when baseUrl is provided', () => {
    const service = provider.createChatService({
      apiKey: 'test-key',
      baseUrl: 'https://api.plamo.example/v1/',
    });

    expect((service as any).endpoint).toBe(
      'https://api.plamo.example/v1/chat/completions',
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
