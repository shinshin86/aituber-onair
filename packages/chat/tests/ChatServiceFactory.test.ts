import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatServiceFactory } from '../src/services/ChatServiceFactory';
import type { ChatService } from '../src/services/ChatService';
import type {
  ChatServiceProvider,
  ChatServiceOptions,
  VisionSupportLevel,
} from '../src/services/providers/ChatServiceProvider';

// Mock provider for testing
class MockChatServiceProvider implements ChatServiceProvider {
  private models = ['mock-model-1', 'mock-model-2'];

  getProviderName(): string {
    return 'mock';
  }

  getSupportedModels(): string[] {
    return this.models;
  }

  createChatService(options: ChatServiceOptions): ChatService {
    return {} as ChatService; // Return a mock object
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'unknown';
  }

  getVisionSupportLevelForModel(): VisionSupportLevel {
    return 'unknown';
  }

  supportsVision(): boolean {
    return true;
  }

  supportsVisionForModel(): boolean {
    return true;
  }
}

describe('ChatServiceFactory', () => {
  beforeEach(() => {
    // The factory is already initialized with default providers
    // We don't need to clear and re-register them
  });

  describe('registerProvider', () => {
    it('should register a new provider', () => {
      const mockProvider = new MockChatServiceProvider();
      ChatServiceFactory.registerProvider(mockProvider);

      const providers = ChatServiceFactory.getProviders();
      expect(providers.has('mock')).toBe(true);
      expect(providers.get('mock')).toBe(mockProvider);
    });

    it('should overwrite existing provider with same name', () => {
      const provider1 = new MockChatServiceProvider();
      const provider2 = new MockChatServiceProvider();

      ChatServiceFactory.registerProvider(provider1);
      ChatServiceFactory.registerProvider(provider2);

      const providers = ChatServiceFactory.getProviders();
      expect(providers.get('mock')).toBe(provider2);
    });
  });

  describe('createChatService', () => {
    it('should create chat service with registered provider', () => {
      const mockProvider = new MockChatServiceProvider();
      const createSpy = vi.spyOn(mockProvider, 'createChatService');

      ChatServiceFactory.registerProvider(mockProvider);

      const options: ChatServiceOptions = {
        apiKey: 'test-key',
        model: 'mock-model-1',
      };

      const service = ChatServiceFactory.createChatService('mock', options);

      expect(createSpy).toHaveBeenCalledWith(options);
      expect(service).toBeDefined();
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        ChatServiceFactory.createChatService('unknown', { apiKey: 'test' });
      }).toThrow('Unknown chat provider: unknown');
    });

    it('should create services for default providers', () => {
      // Test OpenAI
      const openaiService = ChatServiceFactory.createChatService('openai', {
        apiKey: 'test-openai-key',
      });
      expect(openaiService).toBeDefined();

      // Test OpenAI-compatible
      const openaiCompatibleService = ChatServiceFactory.createChatService(
        'openai-compatible',
        {
          apiKey: 'test-openai-compatible-key',
          endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
          model: 'local-model',
        },
      );
      expect(openaiCompatibleService).toBeDefined();

      const openaiCompatibleServiceWithoutKey =
        ChatServiceFactory.createChatService('openai-compatible', {
          endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
          model: 'local-model',
        });
      expect(openaiCompatibleServiceWithoutKey).toBeDefined();

      // Test Gemini
      const geminiService = ChatServiceFactory.createChatService('gemini', {
        apiKey: 'test-gemini-key',
      });
      expect(geminiService).toBeDefined();

      // Test Gemini Nano
      const geminiNanoService = ChatServiceFactory.createChatService(
        'gemini-nano',
        {},
      );
      expect(geminiNanoService).toBeDefined();

      // Test Claude
      const claudeService = ChatServiceFactory.createChatService('claude', {
        apiKey: 'test-claude-key',
      });
      expect(claudeService).toBeDefined();

      // Test OpenRouter
      const openRouterService = ChatServiceFactory.createChatService(
        'openrouter',
        {
          apiKey: 'test-openrouter-key',
        },
      );
      expect(openRouterService).toBeDefined();

      // Test Z.ai
      const zaiService = ChatServiceFactory.createChatService('zai', {
        apiKey: 'test-zai-key',
      });
      expect(zaiService).toBeDefined();

      // Test Kimi
      const kimiService = ChatServiceFactory.createChatService('kimi', {
        apiKey: 'test-kimi-key',
      });
      expect(kimiService).toBeDefined();

      // Test DeepSeek
      const deepSeekService = ChatServiceFactory.createChatService('deepseek', {
        apiKey: 'test-deepseek-key',
      });
      expect(deepSeekService).toBeDefined();

      // Test Mistral
      const mistralService = ChatServiceFactory.createChatService('mistral', {
        apiKey: 'test-mistral-key',
      });
      expect(mistralService).toBeDefined();

      // Test Sakana
      const sakanaService = ChatServiceFactory.createChatService('sakana', {
        apiKey: 'test-sakana-key',
      });
      expect(sakanaService).toBeDefined();

      // Test PLaMo
      const plamoService = ChatServiceFactory.createChatService('plamo', {
        apiKey: 'test-plamo-key',
      });
      expect(plamoService).toBeDefined();
    });

    it('should accept provider-specific options', () => {
      const openRouterService = ChatServiceFactory.createChatService(
        'openrouter',
        {
          apiKey: 'test-openrouter-key',
          appName: 'Test App',
          appUrl: 'https://test.app',
        },
      );

      expect(openRouterService).toBeDefined();
    });
  });

  describe('getProviders', () => {
    it('should return map of registered providers', () => {
      const providers = ChatServiceFactory.getProviders();

      expect(providers).toBeInstanceOf(Map);
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('openai-compatible')).toBe(true);
      expect(providers.has('gemini')).toBe(true);
      expect(providers.has('gemini-nano')).toBe(true);
      expect(providers.has('claude')).toBe(true);
      expect(providers.has('openrouter')).toBe(true);
      expect(providers.has('zai')).toBe(true);
      expect(providers.has('kimi')).toBe(true);
      expect(providers.has('deepseek')).toBe(true);
      expect(providers.has('mistral')).toBe(true);
      expect(providers.has('sakana')).toBe(true);
      expect(providers.has('plamo')).toBe(true);
    });

    it('should return mutable map that allows modifications', () => {
      const providers = ChatServiceFactory.getProviders();
      const initialSize = providers.size;

      const mockProvider = new MockChatServiceProvider();
      providers.set('test', mockProvider);

      expect(providers.size).toBe(initialSize + 1);
      expect(ChatServiceFactory.getProviders().has('test')).toBe(true);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return array of provider names', () => {
      const availableProviders = ChatServiceFactory.getAvailableProviders();

      expect(Array.isArray(availableProviders)).toBe(true);
      expect(availableProviders).toContain('openai');
      expect(availableProviders).toContain('openai-compatible');
      expect(availableProviders).toContain('gemini');
      expect(availableProviders).toContain('gemini-nano');
      expect(availableProviders).toContain('claude');
      expect(availableProviders).toContain('openrouter');
      expect(availableProviders).toContain('zai');
      expect(availableProviders).toContain('kimi');
      expect(availableProviders).toContain('deepseek');
      expect(availableProviders).toContain('mistral');
      expect(availableProviders).toContain('sakana');
      expect(availableProviders).toContain('plamo');
    });

    it('should include newly registered providers', () => {
      const mockProvider = new MockChatServiceProvider();
      ChatServiceFactory.registerProvider(mockProvider);

      const availableProviders = ChatServiceFactory.getAvailableProviders();
      expect(availableProviders).toContain('mock');
    });

    it('should return provider names', () => {
      const availableProviders = ChatServiceFactory.getAvailableProviders();

      expect(availableProviders).toContain('openai');
      expect(availableProviders).toContain('openai-compatible');
      expect(availableProviders).toContain('gemini');
      expect(availableProviders).toContain('gemini-nano');
      expect(availableProviders).toContain('claude');
      expect(availableProviders).toContain('openrouter');
      expect(availableProviders).toContain('zai');
      expect(availableProviders).toContain('kimi');
      expect(availableProviders).toContain('deepseek');
      expect(availableProviders).toContain('mistral');
      expect(availableProviders).toContain('sakana');
      expect(availableProviders).toContain('plamo');
    });
  });

  describe('getSupportedModels', () => {
    it('should return models for existing provider', () => {
      const mockProvider = new MockChatServiceProvider();
      ChatServiceFactory.registerProvider(mockProvider);

      const models = ChatServiceFactory.getSupportedModels('mock');
      expect(models).toEqual(['mock-model-1', 'mock-model-2']);
    });

    it('should return empty array for non-existing provider', () => {
      const models = ChatServiceFactory.getSupportedModels('unknown');
      expect(models).toEqual([]);
    });

    it('should return models for default providers', () => {
      const openaiModels = ChatServiceFactory.getSupportedModels('openai');
      expect(Array.isArray(openaiModels)).toBe(true);
      expect(openaiModels.length).toBeGreaterThan(0);

      const geminiModels = ChatServiceFactory.getSupportedModels('gemini');
      expect(Array.isArray(geminiModels)).toBe(true);
      expect(geminiModels.length).toBeGreaterThan(0);

      const claudeModels = ChatServiceFactory.getSupportedModels('claude');
      expect(Array.isArray(claudeModels)).toBe(true);
      expect(claudeModels.length).toBeGreaterThan(0);

      const geminiNanoModels =
        ChatServiceFactory.getSupportedModels('gemini-nano');
      expect(geminiNanoModels).toEqual(['gemini-nano']);

      const deepSeekModels = ChatServiceFactory.getSupportedModels('deepseek');
      expect(deepSeekModels).toEqual(['deepseek-v4-flash', 'deepseek-v4-pro']);

      const mistralModels = ChatServiceFactory.getSupportedModels('mistral');
      expect(mistralModels).toEqual([
        'mistral-small-latest',
        'mistral-medium-3-5',
        'mistral-large-latest',
        'mistral-large-2512',
        'mistral-small-2603',
        'mistral-medium-2508',
      ]);

      const sakanaModels = ChatServiceFactory.getSupportedModels('sakana');
      expect(sakanaModels).toEqual([
        'fugu',
        'fugu-ultra',
        'fugu-ultra-20260615',
      ]);

      const plamoModels = ChatServiceFactory.getSupportedModels('plamo');
      expect(plamoModels).toEqual(['plamo-3.0-prime', 'plamo-2.2-prime']);
    });
  });

  describe('getProviderCapabilities', () => {
    it('returns machine-readable capabilities for a provider', () => {
      const capabilities = ChatServiceFactory.getProviderCapabilities('openai');

      expect(capabilities).toEqual(
        expect.objectContaining({
          provider: 'openai',
          text: true,
          streaming: true,
          tools: true,
          mcp: true,
          jsonMode: true,
          responseLength: true,
        }),
      );
      expect(capabilities?.models.length).toBeGreaterThan(0);
      expect(capabilities?.reasoningEffort).toContain('medium');
    });

    it('returns model-level vision support when a model is specified', () => {
      const capabilities = ChatServiceFactory.getProviderCapabilities(
        'openai-compatible',
        'local-model',
      );

      expect(capabilities?.vision).toBe('unknown');
      expect(capabilities?.tools).toBe(true);
      expect(capabilities?.mcp).toBe(false);
    });

    it('returns xAI reasoning effort capabilities', () => {
      const capabilities = ChatServiceFactory.getProviderCapabilities('xai');

      expect(capabilities?.reasoningEffort).toEqual([
        'none',
        'low',
        'medium',
        'high',
      ]);
    });

    it('returns undefined for unknown providers', () => {
      expect(
        ChatServiceFactory.getProviderCapabilities('unknown-provider'),
      ).toBeUndefined();
    });

    it('returns capabilities for all registered providers', () => {
      const capabilities = ChatServiceFactory.getAllProviderCapabilities();

      expect(capabilities.map((item) => item.provider)).toContain('openai');
      expect(capabilities.map((item) => item.provider)).toContain('plamo');
    });
  });

  describe('getVisionSupportLevel', () => {
    it('should return provider-level vision support', () => {
      const mockProvider = new MockChatServiceProvider();
      ChatServiceFactory.registerProvider(mockProvider);

      expect(ChatServiceFactory.getVisionSupportLevel('mock')).toBe('unknown');
      expect(ChatServiceFactory.getVisionSupportLevel('unknown')).toBe(
        'unsupported',
      );
    });

    it('should return model-level vision support', () => {
      const mockProvider = new MockChatServiceProvider();
      ChatServiceFactory.registerProvider(mockProvider);

      expect(
        ChatServiceFactory.getVisionSupportLevelForModel(
          'mock',
          'mock-model-1',
        ),
      ).toBe('unknown');
      expect(
        ChatServiceFactory.getVisionSupportLevelForModel('unknown', 'model'),
      ).toBe('unsupported');
      expect(
        ChatServiceFactory.getVisionSupportLevelForModel(
          'openai-compatible',
          'local-model',
        ),
      ).toBe('unknown');
    });
  });

  describe('default providers', () => {
    it('should have default providers registered by default', () => {
      const providers = ChatServiceFactory.getProviders();

      expect(providers.has('openai')).toBe(true);
      expect(providers.has('openai-compatible')).toBe(true);
      expect(providers.has('gemini')).toBe(true);
      expect(providers.has('gemini-nano')).toBe(true);
      expect(providers.has('claude')).toBe(true);
      expect(providers.has('openrouter')).toBe(true);
      expect(providers.has('zai')).toBe(true);
      expect(providers.has('kimi')).toBe(true);
      expect(providers.has('deepseek')).toBe(true);
      expect(providers.has('mistral')).toBe(true);
      expect(providers.has('sakana')).toBe(true);
      expect(providers.has('plamo')).toBe(true);
      expect(providers.size).toBeGreaterThanOrEqual(3);
    });
  });
});
