import { describe, expect, it } from 'vitest';
import {
  ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
  MODEL_DEEPSEEK_V4_FLASH,
  MODEL_DEEPSEEK_V4_PRO,
} from '../../src/constants';
import { DeepSeekChatService } from '../../src/services/providers/deepseek/DeepSeekChatService';
import { DeepSeekChatServiceProvider } from '../../src/services/providers/deepseek/DeepSeekChatServiceProvider';

describe('DeepSeekChatServiceProvider', () => {
  const provider = new DeepSeekChatServiceProvider();

  it('returns provider name', () => {
    expect(provider.getProviderName()).toBe('deepseek');
  });

  it('returns current DeepSeek V4 supported models', () => {
    expect(provider.getSupportedModels()).toEqual([
      MODEL_DEEPSEEK_V4_FLASH,
      MODEL_DEEPSEEK_V4_PRO,
    ]);
  });

  it('returns DeepSeek V4 Flash as the default model', () => {
    expect(provider.getDefaultModel()).toBe(MODEL_DEEPSEEK_V4_FLASH);
  });

  it('reports vision as unsupported', () => {
    expect(provider.supportsVision()).toBe(false);
    expect(provider.supportsVisionForModel(MODEL_DEEPSEEK_V4_FLASH)).toBe(
      false,
    );
    expect(provider.getVisionSupportLevel()).toBe('unsupported');
    expect(
      provider.getVisionSupportLevelForModel(MODEL_DEEPSEEK_V4_FLASH),
    ).toBe('unsupported');
  });

  it('requires an apiKey', () => {
    expect(() => {
      provider.createChatService({ apiKey: '' });
    }).toThrow('deepseek provider requires apiKey');
  });

  it('creates a chat service with default model and endpoint', () => {
    const service = provider.createChatService({ apiKey: 'test-key' });

    expect(service).toBeInstanceOf(DeepSeekChatService);
    expect(service.getModel()).toBe(MODEL_DEEPSEEK_V4_FLASH);
    expect(service.getVisionModel()).toBe(MODEL_DEEPSEEK_V4_FLASH);
    expect((service as any).endpoint).toBe(
      ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
    );
    expect((service as any).provider).toBe('deepseek');
  });

  it('uses /chat/completions when baseUrl is provided', () => {
    const service = provider.createChatService({
      apiKey: 'test-key',
      baseUrl: 'https://example.deepseek.test/',
    });

    expect((service as any).endpoint).toBe(
      'https://example.deepseek.test/chat/completions',
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
