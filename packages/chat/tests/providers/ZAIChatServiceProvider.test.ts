import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZAIChatServiceProvider } from '../../src/services/providers/zai/ZAIChatServiceProvider';
import type { ZAIChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import {
  ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
  MODEL_GLM_5_3,
  MODEL_GLM_5_3_FLASH,
  MODEL_GLM_5_2,
  MODEL_GLM_5_1,
  MODEL_GLM_5,
  MODEL_GLM_5_TURBO,
  MODEL_GLM_5V_TURBO,
  MODEL_GLM_4_7,
  MODEL_GLM_4_7_FLASHX,
  MODEL_GLM_4_7_FLASH,
  MODEL_GLM_4_6,
  MODEL_GLM_4_6V,
  MODEL_GLM_4_6V_FLASHX,
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
        MODEL_GLM_5_3,
        MODEL_GLM_5_3_FLASH,
        MODEL_GLM_5_2,
        MODEL_GLM_5_1,
        MODEL_GLM_5,
        MODEL_GLM_5_TURBO,
        MODEL_GLM_5V_TURBO,
        MODEL_GLM_4_7,
        MODEL_GLM_4_7_FLASHX,
        MODEL_GLM_4_7_FLASH,
        MODEL_GLM_4_6,
        MODEL_GLM_4_6V,
        MODEL_GLM_4_6V_FLASHX,
        MODEL_GLM_4_6V_FLASH,
      ]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return glm-5.2 as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_GLM_5_2);
    });
  });

  describe('supportsVision', () => {
    it('should return true', () => {
      expect(provider.supportsVision()).toBe(true);
      expect(provider.getVisionSupportLevel()).toBe('supported');
    });
  });

  describe('supportsVisionForModel', () => {
    it('should return true for vision-supported models', () => {
      expect(provider.supportsVisionForModel(MODEL_GLM_5V_TURBO)).toBe(true);
      expect(provider.getVisionSupportLevelForModel(MODEL_GLM_5V_TURBO)).toBe(
        'supported',
      );
      expect(provider.supportsVisionForModel(MODEL_GLM_4_6V_FLASH)).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(provider.supportsVisionForModel(MODEL_GLM_4_7)).toBe(false);
    });

    it('should return false for glm-5', () => {
      expect(provider.supportsVisionForModel(MODEL_GLM_5)).toBe(false);
    });

    it('should return false for glm-5.1', () => {
      expect(provider.supportsVisionForModel(MODEL_GLM_5_1)).toBe(false);
    });

    it('should return false for glm-5.2', () => {
      expect(provider.supportsVisionForModel(MODEL_GLM_5_2)).toBe(false);
      expect(provider.getVisionSupportLevelForModel(MODEL_GLM_5_2)).toBe(
        'unsupported',
      );
    });

    it('should expose GLM-5.3 Flash as vision-capable', () => {
      expect(provider.supportsVisionForModel(MODEL_GLM_5_3)).toBe(false);
      expect(provider.supportsVisionForModel(MODEL_GLM_5_3_FLASH)).toBe(true);
    });

    it('should return false for glm-5-turbo', () => {
      expect(provider.supportsVisionForModel(MODEL_GLM_5_TURBO)).toBe(false);
      expect(provider.getVisionSupportLevelForModel(MODEL_GLM_5_TURBO)).toBe(
        'unsupported',
      );
    });
  });

  describe('createChatService', () => {
    it('should create ZAIChatService with default values', () => {
      const options: ZAIChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_5_2,
        MODEL_GLM_4_6V_FLASH,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'disabled' }),
        undefined,
      );
    });

    it('should use vision model when main model supports vision', () => {
      const options: ZAIChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GLM_5V_TURBO,
      };

      provider.createChatService(options);

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_5V_TURBO,
        MODEL_GLM_5V_TURBO,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'disabled' }),
        undefined,
      );
    });

    it('should allow overriding vision model when supported', () => {
      const options: ZAIChatServiceOptions = {
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
        undefined,
      );
    });

    it('normalizes minimal effort to disabled thinking for responsive chat', () => {
      provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GLM_5_2,
        reasoning_effort: 'minimal',
      });

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_5_2,
        MODEL_GLM_4_6V_FLASH,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'disabled' }),
        undefined,
      );
    });

    it('normalizes low effort to the upstream high tier', () => {
      provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GLM_5_2,
        reasoning_effort: 'low',
      });

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_5_2,
        MODEL_GLM_4_6V_FLASH,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'enabled' }),
        'high',
      );
    });

    it('normalizes xhigh effort to the upstream max tier', () => {
      provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GLM_5_2,
        reasoning_effort: 'xhigh',
      });

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_5_2,
        MODEL_GLM_4_6V_FLASH,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'enabled' }),
        'max',
      );
    });

    it.each([MODEL_GLM_5_3, MODEL_GLM_5_3_FLASH])(
      'defaults %s to always-on low thinking for responsive chat',
      (model) => {
        provider.createChatService({
          apiKey: 'test-api-key',
          model,
        });

        expect(ZAIChatService).toHaveBeenCalledWith(
          'test-api-key',
          model,
          model === MODEL_GLM_5_3_FLASH
            ? MODEL_GLM_5_3_FLASH
            : MODEL_GLM_4_6V_FLASH,
          undefined,
          ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
          undefined,
          undefined,
          { type: 'enabled', clear_thinking: true },
          'low',
        );
      },
    );

    it('keeps GLM-5.3 thinking enabled when disabled is requested', () => {
      provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GLM_5_3,
        thinking: { type: 'disabled' },
      });

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_5_3,
        MODEL_GLM_4_6V_FLASH,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        { type: 'enabled', clear_thinking: true },
        'low',
      );
    });

    it('rejects unsupported none effort for GLM-5.3', () => {
      expect(() =>
        provider.createChatService({
          apiKey: 'test-api-key',
          model: MODEL_GLM_5_3,
          reasoning_effort: 'none',
        }),
      ).toThrow('Supported values: low, high, max');
    });

    it('preserves explicit thinking when reasoning effort is omitted', () => {
      provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GLM_5_2,
        thinking: { type: 'enabled', clear_thinking: false },
      });

      expect(ZAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GLM_5_2,
        MODEL_GLM_4_6V_FLASH,
        undefined,
        ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        { type: 'enabled', clear_thinking: false },
        undefined,
      );
    });

    it('rejects reasoning effort for models without the public option', () => {
      expect(() =>
        provider.createChatService({
          apiKey: 'test-api-key',
          model: MODEL_GLM_5_1,
          reasoning_effort: 'low',
        }),
      ).toThrow('does not support Z.ai reasoning_effort');
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
