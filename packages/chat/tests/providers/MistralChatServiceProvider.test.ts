import { describe, expect, it } from 'vitest';
import {
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  MODEL_MINISTRAL_14B_2512,
  MODEL_MINISTRAL_3B_2512,
  MODEL_MINISTRAL_8B_2512,
  MODEL_MISTRAL_LARGE_2512,
  MODEL_MISTRAL_LARGE_LATEST,
  MODEL_MISTRAL_MEDIUM_2508,
  MODEL_MISTRAL_MEDIUM_3_5,
  MODEL_MISTRAL_SMALL_2603,
  MODEL_MISTRAL_SMALL_LATEST,
} from '../../src/constants';
import { MistralChatService } from '../../src/services/providers/mistral/MistralChatService';
import { MistralChatServiceProvider } from '../../src/services/providers/mistral/MistralChatServiceProvider';

describe('MistralChatServiceProvider', () => {
  const provider = new MistralChatServiceProvider();

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
      MODEL_MISTRAL_LARGE_2512,
      MODEL_MISTRAL_SMALL_2603,
      MODEL_MISTRAL_MEDIUM_2508,
    ]);
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
