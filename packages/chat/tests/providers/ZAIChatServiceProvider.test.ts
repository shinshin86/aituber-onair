import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZAIChatServiceProvider } from '../../src/services/providers/zai/ZAIChatServiceProvider';
import type { ChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import {
  ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
  MODEL_GLM_4_7,
  MODEL_GLM_4_7_FLASHX,
  MODEL_GLM_4_7_FLASH,
  MODEL_GLM_4_6V_FLASH,
} from '../../src/constants';

vi.mock('../../src/services/providers/zai/ZAIChatService');
import { ZAIChatService } from '../../src/services/providers/zai/ZAIChatService';

describe('ZAIChatServiceProvider', () => {
  let provider: ZAIChatServiceProvider;

  beforeEach(() => {
    provider = new ZAIChatServiceProvider();
    vi.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return "zai"', () => {
      expect(provider.getProviderName()).toBe('zai');
    });
  });

  describe('getSupportedModels', () => {
    it('should return array of supported models', () => {
      const models = provider.getSupportedModels();
      expect(models).toEqual([
        MODEL_GLM_4_7,
        MODEL_GLM_4_7_FLASHX,
        MODEL_GLM_4_7_FLASH,
        MODEL_GLM_4_6V_FLASH,
      ]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return glm-4.7 as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_GLM_4_7);
    });
  });

  describe('supportsVision', () => {
    it('should return true', () => {
      expect(provider.supportsVision()).toBe(true);
    });
  });

  describe('supportsVisionForModel', () => {
    it('should return true for vision-supported models', () => {
      expect(provider.supportsVisionForModel(MODEL_GLM_4_6V_FLASH)).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(provider.supportsVisionForModel(MODEL_GLM_4_7)).toBe(false);
    });
  });

  describe('createChatService', () => {
    it('should create ZAIChatService with default values', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_4_7,
        MODEL_GLM_4_6V_FLASH,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'disabled' }),
      );
    });

    it('should use vision model when main model supports vision', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GLM_4_6V_FLASH,
      };

      provider.createChatService(options);

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_4_6V_FLASH,
        MODEL_GLM_4_6V_FLASH,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'disabled' }),
      );
    });

    it('should allow overriding vision model when supported', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GLM_4_7,
        visionModel: MODEL_GLM_4_6V_FLASH,
      };

      provider.createChatService(options);

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_4_7,
        MODEL_GLM_4_6V_FLASH,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'disabled' }),
      );
    });

    it('should throw error when explicitly providing non-vision model', () => {
      expect(() => {
        provider.createChatService({
          apiKey: 'test-api-key',
          visionModel: MODEL_GLM_4_7,
        });
      }).toThrow('does not support vision capabilities');
    });
  });
});
