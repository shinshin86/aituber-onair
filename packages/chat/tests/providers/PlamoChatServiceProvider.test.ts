import { describe, expect, it } from 'vitest';
import {
  ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
  MODEL_PLAMO_2_2_PRIME,
  MODEL_PLAMO_3_0_PRIME,
} from '../../src/constants';
import { PlamoChatService } from '../../src/services/providers/plamo/PlamoChatService';
import { PlamoChatServiceProvider } from '../../src/services/providers/plamo/PlamoChatServiceProvider';

describe('PlamoChatServiceProvider', () => {
  const provider = new PlamoChatServiceProvider();

  it('returns provider name', () => {
    expect(provider.getProviderName()).toBe('plamo');
  });

  it('returns supported PLaMo models', () => {
    expect(provider.getSupportedModels()).toEqual([
      MODEL_PLAMO_3_0_PRIME,
      MODEL_PLAMO_2_2_PRIME,
    ]);
  });

  it('returns PLaMo 3.0 Prime as the default model', () => {
    expect(provider.getDefaultModel()).toBe(MODEL_PLAMO_3_0_PRIME);
  });

  it('reports vision as unsupported', () => {
    expect(provider.supportsVision()).toBe(false);
    expect(provider.supportsVisionForModel(MODEL_PLAMO_3_0_PRIME)).toBe(false);
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
