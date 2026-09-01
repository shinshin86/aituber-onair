import { describe, expect, it } from 'vitest';
import {
  ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
  MODEL_FUGU,
  MODEL_FUGU_ULTRA_V1_1,
  MODEL_SAKANA_NAMAZU,
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
      MODEL_FUGU_ULTRA_V1_1,
      MODEL_SAKANA_NAMAZU,
    ]);
  });

  it('returns Fugu as the default model', () => {
    expect(provider.getDefaultModel()).toBe(MODEL_FUGU);
  });

  it('reports vision support only for Sakana Namazu', () => {
    expect(provider.supportsVision()).toBe(true);
    expect(provider.supportsVisionForModel(MODEL_FUGU)).toBe(false);
    expect(provider.supportsVisionForModel(MODEL_SAKANA_NAMAZU)).toBe(true);
    expect(provider.getVisionSupportLevel()).toBe('supported');
    expect(provider.getVisionSupportLevelForModel(MODEL_FUGU)).toBe(
      'unsupported',
    );
    expect(provider.getVisionSupportLevelForModel(MODEL_SAKANA_NAMAZU)).toBe(
      'supported',
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
    expect(service.getVisionModel()).toBe(MODEL_SAKANA_NAMAZU);
    expect((service as any).endpoint).toBe(
      ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
    );
    expect((service as any).provider).toBe('sakana');
  });

  it('disables Sakana Namazu thinking by default for responsive chat', () => {
    const service = provider.createChatService({
      apiKey: 'test-key',
      model: MODEL_SAKANA_NAMAZU,
    });

    expect(service.getVisionModel()).toBe(MODEL_SAKANA_NAMAZU);
    expect((service as any).chatTemplateThinking).toBe(false);
  });

  it('allows explicit Sakana Namazu thinking', () => {
    const service = provider.createChatService({
      apiKey: 'test-key',
      model: MODEL_SAKANA_NAMAZU,
      thinking: { type: 'enabled' },
    });

    expect((service as any).chatTemplateThinking).toBe(true);
  });

  it('rejects Sakana Namazu thinking controls for Fugu models', () => {
    expect(() =>
      provider.createChatService({
        apiKey: 'test-key',
        model: MODEL_FUGU,
        thinking: { type: 'enabled' },
      }),
    ).toThrow('only supported for sakana-namazu');
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
