import { describe, expect, it } from 'vitest';
import {
  ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
  MODEL_FUGU,
  MODEL_FUGU_ULTRA,
  MODEL_FUGU_ULTRA_20260615,
} from '../../src/constants';
import { SakanaChatService } from '../../src/services/providers/sakana/SakanaChatService';
import { SakanaChatServiceProvider } from '../../src/services/providers/sakana/SakanaChatServiceProvider';

describe('SakanaChatServiceProvider', () => {
  const provider = new SakanaChatServiceProvider();

  it('returns provider name', () => {
    expect(provider.getProviderName()).toBe('sakana');
  });

  it('returns supported Fugu models', () => {
    expect(provider.getSupportedModels()).toEqual([
      MODEL_FUGU,
      MODEL_FUGU_ULTRA,
      MODEL_FUGU_ULTRA_20260615,
    ]);
  });

  it('returns Fugu as the default model', () => {
    expect(provider.getDefaultModel()).toBe(MODEL_FUGU);
  });

  it('reports vision as unsupported', () => {
    expect(provider.supportsVision()).toBe(false);
    expect(provider.supportsVisionForModel(MODEL_FUGU)).toBe(false);
    expect(provider.getVisionSupportLevel()).toBe('unsupported');
    expect(provider.getVisionSupportLevelForModel(MODEL_FUGU)).toBe(
      'unsupported',
    );
  });

  it('requires an apiKey', () => {
    expect(() => {
      provider.createChatService({ apiKey: '' });
    }).toThrow('sakana provider requires apiKey');
  });

  it('creates a chat service with default model and endpoint', () => {
    const service = provider.createChatService({ apiKey: 'test-key' });

    expect(service).toBeInstanceOf(SakanaChatService);
    expect(service.getModel()).toBe(MODEL_FUGU);
    expect(service.getVisionModel()).toBe(MODEL_FUGU);
    expect((service as any).endpoint).toBe(
      ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
    );
    expect((service as any).provider).toBe('sakana');
  });

  it('uses /chat/completions when baseUrl is provided', () => {
    const service = provider.createChatService({
      apiKey: 'test-key',
      baseUrl: 'https://api.sakana.example/v1/',
    });

    expect((service as any).endpoint).toBe(
      'https://api.sakana.example/v1/chat/completions',
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
