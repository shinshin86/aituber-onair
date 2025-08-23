import { describe, it, expect, beforeEach } from 'vitest';
import { OpenRouterChatServiceProvider } from '../../src/services/providers/openrouter/OpenRouterChatServiceProvider';
import { OpenRouterChatService } from '../../src/services/providers/openrouter/OpenRouterChatService';
import { MODEL_GPT_OSS_20B_FREE } from '../../src/constants/openrouter';

describe('OpenRouterChatServiceProvider', () => {
  let provider: OpenRouterChatServiceProvider;

  beforeEach(() => {
    provider = new OpenRouterChatServiceProvider();
  });

  describe('getProviderName', () => {
    it('should return correct provider name', () => {
      expect(provider.getProviderName()).toBe('openrouter');
    });
  });

  describe('getDefaultModel', () => {
    it('should return gpt-oss-20b:free as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_GPT_OSS_20B_FREE);
    });
  });

  describe('getSupportedModels', () => {
    it('should return array containing only gpt-oss-20b:free', () => {
      const models = provider.getSupportedModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBe(1);
      expect(models).toEqual([MODEL_GPT_OSS_20B_FREE]);
    });
  });

  describe('supportsVision', () => {
    it('should not support vision capabilities', () => {
      expect(provider.supportsVision()).toBe(false);
    });
  });

  describe('supportsVisionForModel', () => {
    it('should return false for all models since gpt-oss-20b does not support vision', () => {
      expect(provider.supportsVisionForModel(MODEL_GPT_OSS_20B_FREE)).toBe(
        false,
      );
      expect(provider.supportsVisionForModel('any-model')).toBe(false);
    });
  });

  describe('getFreeModels', () => {
    it('should return list containing only gpt-oss-20b:free', () => {
      const freeModels = provider.getFreeModels();
      expect(Array.isArray(freeModels)).toBe(true);
      expect(freeModels).toEqual([MODEL_GPT_OSS_20B_FREE]);
    });
  });

  describe('isModelFree', () => {
    it('should correctly identify gpt-oss-20b:free as free', () => {
      expect(provider.isModelFree(MODEL_GPT_OSS_20B_FREE)).toBe(true);
    });

    it('should return true for models ending with :free', () => {
      expect(provider.isModelFree('any-model:free')).toBe(true);
    });

    it('should return false for models without :free suffix', () => {
      expect(provider.isModelFree('openai/gpt-4o')).toBe(false);
      expect(provider.isModelFree('anthropic/claude-3-opus')).toBe(false);
    });
  });

  describe('createChatService', () => {
    it('should create OpenRouterChatService instance with default model', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
      expect(service.getModel()).toBe(MODEL_GPT_OSS_20B_FREE);
    });

    it('should create service with the default model', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
      expect(service.getModel()).toBe(MODEL_GPT_OSS_20B_FREE);
    });

    it('should use default model for vision since gpt-oss-20b does not support vision', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
      expect(service.getModel()).toBe(MODEL_GPT_OSS_20B_FREE);
      expect(service.getVisionModel()).toBe(MODEL_GPT_OSS_20B_FREE);
    });

    it('should pass OpenRouter-specific options', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        appName: 'Test App',
        appUrl: 'https://test.app',
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
    });

    it('should handle tools configuration', () => {
      const tools = [
        {
          name: 'test_tool',
          description: 'Test tool',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string' },
            },
            required: ['input'],
          },
        },
      ];

      const service = provider.createChatService({
        apiKey: 'test-api-key',
        tools,
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
    });

    it('should throw error when explicitly providing vision model that does not support vision', () => {
      expect(() => {
        provider.createChatService({
          apiKey: 'test-api-key',
          visionModel: MODEL_GPT_OSS_20B_FREE,
        });
      }).toThrow('does not support vision capabilities');
    });

    it('should create service successfully when no vision model is explicitly provided', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
      expect(service.getModel()).toBe(MODEL_GPT_OSS_20B_FREE);
      expect(service.getVisionModel()).toBe(MODEL_GPT_OSS_20B_FREE);
    });
  });

  describe('vision functionality', () => {
    it('should throw error when processVisionChat is called with vision-unsupported model', async () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
      });

      const visionMessages = [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'What is in this image?' },
            {
              type: 'image_url' as const,
              image_url: { url: 'data:image/png;base64,test' },
            },
          ],
        },
      ];

      await expect(
        service.processVisionChat(
          visionMessages,
          () => {},
          async () => {},
        ),
      ).rejects.toThrow('does not support vision capabilities');
    });

    it('should throw error when visionChatOnce is called with vision-unsupported model', async () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
      });

      const visionMessages = [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'What is in this image?' },
            {
              type: 'image_url' as const,
              image_url: { url: 'data:image/png;base64,test' },
            },
          ],
        },
      ];

      await expect(
        service.visionChatOnce(visionMessages, false, () => {}),
      ).rejects.toThrow('does not support vision capabilities');
    });
  });

  describe('reasoning control', () => {
    it('should create service with default reasoning exclusion', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
      expect(service.getModel()).toBe(MODEL_GPT_OSS_20B_FREE);
    });

    it('should create service with reasoning effort configuration', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
        reasoning_effort: 'low',
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
    });

    it('should create service with includeReasoning enabled', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
        includeReasoning: true,
        reasoning_effort: 'medium',
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
    });

    it('should create service with reasoningMaxTokens configuration', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
        reasoningMaxTokens: 1000,
        includeReasoning: true,
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
    });

    it('should create service with combined reasoning options', () => {
      const service = provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GPT_OSS_20B_FREE,
        reasoning_effort: 'high',
        includeReasoning: true,
        reasoningMaxTokens: 2000,
      });

      expect(service).toBeInstanceOf(OpenRouterChatService);
    });
  });
});
