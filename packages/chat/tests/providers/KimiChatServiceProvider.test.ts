import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KimiChatServiceProvider } from '../../src/services/providers/kimi/KimiChatServiceProvider';
import type { KimiChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import {
  ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
  MODEL_KIMI_K2_5,
} from '../../src/constants';

vi.mock('../../src/services/providers/kimi/KimiChatService');
import { KimiChatService } from '../../src/services/providers/kimi/KimiChatService';

describe('KimiChatServiceProvider', () => {
  let provider: KimiChatServiceProvider;

  beforeEach(() => {
    provider = new KimiChatServiceProvider();
    vi.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return "kimi"', () => {
      expect(provider.getProviderName()).toBe('kimi');
    });
  });

  describe('getSupportedModels', () => {
    it('should return array of supported models', () => {
      const models = provider.getSupportedModels();
      expect(models).toEqual([MODEL_KIMI_K2_5]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return kimi-k2.5 as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_KIMI_K2_5);
    });
  });

  describe('supportsVision', () => {
    it('should return true', () => {
      expect(provider.supportsVision()).toBe(true);
    });
  });

  describe('supportsVisionForModel', () => {
    it('should return true for vision-supported models', () => {
      expect(provider.supportsVisionForModel(MODEL_KIMI_K2_5)).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(provider.supportsVisionForModel('unknown-model')).toBe(false);
    });
  });

  describe('createChatService', () => {
    it('should create KimiChatService with default values', () => {
      const options: KimiChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(KimiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_KIMI_K2_5,
        MODEL_KIMI_K2_5,
        undefined,
        ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'enabled' }),
      );
    });

    it('should disable thinking when tools are provided', () => {
      const options: KimiChatServiceOptions = {
        apiKey: 'test-api-key',
        tools: [
          {
            name: 'lookup',
            parameters: { type: 'object' },
          },
        ],
      };

      provider.createChatService(options);

      expect(KimiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_KIMI_K2_5,
        MODEL_KIMI_K2_5,
        options.tools,
        ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'disabled' }),
      );
    });

    it('should resolve baseUrl to chat completions endpoint', () => {
      const options: KimiChatServiceOptions = {
        apiKey: 'test-api-key',
        baseUrl: 'http://localhost:8000/v1',
      };

      provider.createChatService(options);

      expect(KimiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_KIMI_K2_5,
        MODEL_KIMI_K2_5,
        undefined,
        'http://localhost:8000/v1/chat/completions',
        undefined,
        undefined,
        expect.objectContaining({ type: 'enabled' }),
      );
    });

    it('should throw error when explicitly providing non-vision model', () => {
      expect(() => {
        provider.createChatService({
          apiKey: 'test-api-key',
          visionModel: 'unknown-model',
        });
      }).toThrow('does not support vision capabilities');
    });
  });
});
