import { describe, it, expect } from 'vitest';
import { OpenAICompatibleChatServiceProvider } from '../../src/services/providers/openaiCompatible/OpenAICompatibleChatServiceProvider';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

describe('OpenAICompatibleChatServiceProvider', () => {
  const provider = new OpenAICompatibleChatServiceProvider();

  it('should return provider name', () => {
    expect(provider.getProviderName()).toBe('openai-compatible');
  });

  it('should return empty supported models', () => {
    expect(provider.getSupportedModels()).toEqual([]);
  });

  it('should report vision as unsupported', () => {
    expect(provider.supportsVision()).toBe(false);
  });

  it('should require endpoint', () => {
    expect(() => {
      provider.createChatService({
        apiKey: 'test-key',
        model: 'local-model',
      } as any);
    }).toThrow('openai-compatible provider requires endpoint');
  });

  it('should require model', () => {
    expect(() => {
      provider.createChatService({
        apiKey: 'test-key',
        endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
      } as any);
    }).toThrow('openai-compatible provider requires model');
  });

  it('should require full URL endpoint', () => {
    expect(() => {
      provider.createChatService({
        apiKey: 'test-key',
        endpoint: 'responses',
        model: 'local-model',
      });
    }).toThrow('openai-compatible provider requires endpoint to be a full URL');
  });

  it('should create chat service with endpoint and model', () => {
    const service = provider.createChatService({
      apiKey: 'test-key',
      endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
      model: 'local-model',
    });

    expect(service).toBeDefined();
    expect(service.getModel()).toBe('local-model');
    expect(service.getVisionModel()).toBe('local-model');
    expect((service as any).provider).toBe('openai-compatible');
  });

  it('should reject mcpServers', () => {
    expect(() => {
      provider.createChatService({
        apiKey: 'test-key',
        endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
        model: 'local-model',
        mcpServers: [],
      } as any);
    }).toThrow('openai-compatible provider does not support mcpServers');
  });

  it('should send max_tokens only when token limit is explicitly configured', async () => {
    const nativeFetch = (url: string, init?: RequestInit) => fetch(url, init);
    let body: Record<string, unknown> = {};

    ChatServiceHttpClient.setFetch(async (_url, init = {}) => {
      body = JSON.parse(String(init.body));
      throw new Error('request-captured');
    });

    try {
      const service = provider.createChatService({
        apiKey: 'test-key',
        endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
        model: 'local-model',
        responseLength: 'short',
      });

      await expect(
        service.chatOnce([{ role: 'user', content: 'hello' }], false, () => {}),
      ).rejects.toThrow('request-captured');

      expect(body.max_tokens).toBeDefined();
      expect(body.max_completion_tokens).toBeUndefined();

      const serviceWithoutLimit = provider.createChatService({
        apiKey: 'test-key',
        endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
        model: 'local-model',
      });

      await expect(
        serviceWithoutLimit.chatOnce(
          [{ role: 'user', content: 'hello' }],
          false,
          () => {},
        ),
      ).rejects.toThrow('request-captured');

      expect(body.max_tokens).toBeUndefined();
      expect(body.max_completion_tokens).toBeUndefined();
    } finally {
      ChatServiceHttpClient.setFetch(nativeFetch);
    }
  });
});
