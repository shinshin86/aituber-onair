import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XAIChatServiceProvider } from '../../src/services/providers/xai/XAIChatServiceProvider';
import type { XAIChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import {
  ENDPOINT_XAI_CHAT_COMPLETIONS_API,
  MODEL_GROK_4_5,
  MODEL_GROK_4_3,
  MODEL_GROK_4_20_REASONING,
  MODEL_GROK_4_20_NON_REASONING,
  MODEL_GROK_4_1_FAST_REASONING,
  MODEL_GROK_4_1_FAST_NON_REASONING,
} from '../../src/constants';

vi.mock('../../src/services/providers/xai/XAIChatService');
import { XAIChatService } from '../../src/services/providers/xai/XAIChatService';

describe('XAIChatServiceProvider', () => {
  let provider: XAIChatServiceProvider;

  beforeEach(() => {
    provider = new XAIChatServiceProvider();
    vi.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return "xai"', () => {
      expect(provider.getProviderName()).toBe('xai');
    });
  });

  describe('getSupportedModels', () => {
    it('should return array of supported models', () => {
      const models = provider.getSupportedModels();
      expect(models).toEqual([
        MODEL_GROK_4_5,
        MODEL_GROK_4_3,
        MODEL_GROK_4_20_REASONING,
        MODEL_GROK_4_20_NON_REASONING,
        MODEL_GROK_4_1_FAST_REASONING,
        MODEL_GROK_4_1_FAST_NON_REASONING,
      ]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return grok-4-1-fast-non-reasoning as default model', () => {
      expect(provider.getDefaultModel()).toBe(
        MODEL_GROK_4_1_FAST_NON_REASONING,
      );
    });
  });

  describe('supportsVision', () => {
    it('should return true', () => {
      expect(provider.supportsVision()).toBe(true);
      expect(provider.getVisionSupportLevel()).toBe('supported');
    });
  });

  describe('supportsVisionForModel', () => {
    it('should return true for supported vision models', () => {
      expect(provider.supportsVisionForModel(MODEL_GROK_4_3)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_GROK_4_20_REASONING)).toBe(
        true,
      );
      expect(
        provider.supportsVisionForModel(MODEL_GROK_4_20_NON_REASONING),
      ).toBe(true);
      expect(
        provider.supportsVisionForModel(MODEL_GROK_4_1_FAST_REASONING),
      ).toBe(true);
      expect(
        provider.supportsVisionForModel(MODEL_GROK_4_1_FAST_NON_REASONING),
      ).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_GROK_4_5)).toBe(true);
    });

    it('should return false for unknown models', () => {
      expect(provider.supportsVisionForModel('unknown-model')).toBe(false);
      expect(provider.getVisionSupportLevelForModel('unknown-model')).toBe(
        'unsupported',
      );
    });
  });

  describe('createChatService', () => {
    it('should create XAIChatService with default values', () => {
      const options: XAIChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(XAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GROK_4_1_FAST_NON_REASONING,
        MODEL_GROK_4_1_FAST_NON_REASONING,
        undefined,
        ENDPOINT_XAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
      );
    });

    it('should use the main model as vision model when it supports vision', () => {
      const options: XAIChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GROK_4_3,
      };

      provider.createChatService(options);

      expect(XAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GROK_4_3,
        MODEL_GROK_4_3,
        undefined,
        ENDPOINT_XAI_CHAT_COMPLETIONS_API,
        undefined,
        'none',
      );
    });

    it('should default Grok 4.5 reasoning effort to low for chat use', () => {
      const options: XAIChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GROK_4_5,
      };

      provider.createChatService(options);

      expect(XAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GROK_4_5,
        MODEL_GROK_4_5,
        undefined,
        ENDPOINT_XAI_CHAT_COMPLETIONS_API,
        undefined,
        'low',
      );
    });

    it('should allow overriding vision model when supported', () => {
      const options: XAIChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GROK_4_1_FAST_NON_REASONING,
        visionModel: MODEL_GROK_4_20_NON_REASONING,
      };

      provider.createChatService(options);

      expect(XAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GROK_4_1_FAST_NON_REASONING,
        MODEL_GROK_4_20_NON_REASONING,
        undefined,
        ENDPOINT_XAI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
      );
    });

    it('should forward xAI reasoning effort to the chat service', () => {
      const options: XAIChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GROK_4_3,
        reasoning_effort: 'none',
      };

      provider.createChatService(options);

      expect(XAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GROK_4_3,
        MODEL_GROK_4_3,
        undefined,
        ENDPOINT_XAI_CHAT_COMPLETIONS_API,
        undefined,
        'none',
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
