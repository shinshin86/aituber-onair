import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatServiceFactory } from '../src/services/ChatServiceFactory';
import type { ChatService } from '../src/services/ChatService';
import type {
  ChatServiceProvider,
  ChatServiceOptions,
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

      // Test Gemini
      const geminiService = ChatServiceFactory.createChatService('gemini', {
        apiKey: 'test-gemini-key',
      });
      expect(geminiService).toBeDefined();

      // Test Claude
      const claudeService = ChatServiceFactory.createChatService('claude', {
        apiKey: 'test-claude-key',
      });
      expect(claudeService).toBeDefined();
    });
  });

  describe('getProviders', () => {
    it('should return map of registered providers', () => {
      const providers = ChatServiceFactory.getProviders();

      expect(providers).toBeInstanceOf(Map);
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('gemini')).toBe(true);
      expect(providers.has('claude')).toBe(true);
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
      expect(availableProviders).toContain('gemini');
      expect(availableProviders).toContain('claude');
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
      expect(availableProviders).toContain('gemini');
      expect(availableProviders).toContain('claude');
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
    });
  });

  describe('default providers', () => {
    it('should have OpenAI, Gemini, and Claude providers registered by default', () => {
      const providers = ChatServiceFactory.getProviders();

      expect(providers.has('openai')).toBe(true);
      expect(providers.has('gemini')).toBe(true);
      expect(providers.has('claude')).toBe(true);
      expect(providers.size).toBeGreaterThanOrEqual(3);
    });
  });
});
