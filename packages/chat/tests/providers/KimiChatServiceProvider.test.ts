import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KimiChatServiceProvider } from '../../src/services/providers/kimi/KimiChatServiceProvider';
import type { KimiChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import {
  MODEL_KIMI_K3_1_PRO,
  MODEL_KIMI_K3_1_PRO_HIGHSPEED,
  ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
  MODEL_KIMI_K3,
  MODEL_KIMI_K2_7_CODE,
  MODEL_KIMI_K2_7_CODE_HIGHSPEED,
  MODEL_KIMI_K2_6,
  MODEL_KIMI_K2_5,
  getKimiSupportedReasoningEfforts,
  KIMI_DEPRECATED_MODELS,
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
      expect(models).toEqual([
        MODEL_KIMI_K3,
        MODEL_KIMI_K3_1_PRO,
        MODEL_KIMI_K3_1_PRO_HIGHSPEED,
      ]);
      for (const model of KIMI_DEPRECATED_MODELS) {
        expect(models).not.toContain(model);
      }
    });
  });

  describe('getDefaultModel', () => {
    it('should return kimi-k3.1-pro as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_KIMI_K3_1_PRO);
    });
  });

  it.each([MODEL_KIMI_K2_5, MODEL_KIMI_K2_6])(
    'defaults optional thinking to disabled for explicitly named %s',
    (model) => {
      provider.createChatService({ apiKey: 'test-key', model });
      expect(vi.mocked(KimiChatService).mock.calls[0][7]).toEqual({
        type: 'disabled',
      });
    },
  );

  describe('reasoning effort support', () => {
    it.each([
      MODEL_KIMI_K3,
      MODEL_KIMI_K3_1_PRO,
      MODEL_KIMI_K3_1_PRO_HIGHSPEED,
    ])('should expose %s reasoning and vision', (model) => {
      expect(provider.supportsVisionForModel(model)).toBe(true);
      expect(getKimiSupportedReasoningEfforts(model)).toEqual([
        'low',
        'high',
        'max',
      ]);
      expect(getKimiSupportedReasoningEfforts(MODEL_KIMI_K2_6)).toEqual([]);
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
      expect(provider.supportsVisionForModel(MODEL_KIMI_K3)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_KIMI_K2_7_CODE)).toBe(true);
      expect(
        provider.supportsVisionForModel(MODEL_KIMI_K2_7_CODE_HIGHSPEED),
      ).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_KIMI_K2_6)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_KIMI_K2_5)).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(provider.supportsVisionForModel('unknown-model')).toBe(false);
      expect(provider.getVisionSupportLevelForModel('unknown-model')).toBe(
        'unsupported',
      );
    });
  });

  describe.each([
    MODEL_KIMI_K3,
    MODEL_KIMI_K3_1_PRO,
    MODEL_KIMI_K3_1_PRO_HIGHSPEED,
  ])('%s compatibility', (k3Model) => {
    it('should create KimiChatService with default values', () => {
      const options: KimiChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(KimiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_KIMI_K3_1_PRO,
        MODEL_KIMI_K3_1_PRO,
        undefined,
        ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        undefined,
        'low',
      );
    });

    it('should create Kimi K3 with package-default low reasoning and no K2 thinking option', () => {
      const options: KimiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: k3Model,
      };

      provider.createChatService(options);

      expect(KimiChatService).toHaveBeenCalledWith(
        'test-api-key',
        k3Model,
        k3Model,
        undefined,
        ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        undefined,
        'low',
      );
    });

    it.each(['high', 'max'] as const)(
      'should create Kimi K3 with %s reasoning when configured',
      (reasoningEffort) => {
        provider.createChatService({
          apiKey: 'test-api-key',
          model: k3Model,
          reasoning_effort: reasoningEffort,
        });

        expect(KimiChatService).toHaveBeenCalledWith(
          'test-api-key',
          k3Model,
          k3Model,
          undefined,
          ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
          undefined,
          undefined,
          undefined,
          reasoningEffort,
        );
      },
    );

    it('should reject unsupported Kimi K3 reasoning values at runtime', () => {
      expect(() => {
        provider.createChatService({
          apiKey: 'test-api-key',
          model: k3Model,
          reasoning_effort: 'medium',
        } as KimiChatServiceOptions);
      }).toThrow('supports reasoning_effort values: low, high, max');
    });

    it('should reject the K2 thinking option for Kimi K3', () => {
      expect(() => {
        provider.createChatService({
          apiKey: 'test-api-key',
          model: k3Model,
          thinking: { type: 'enabled' },
        });
      }).toThrow('does not support the K2.x thinking option');
    });

    it('should reject reasoning_effort for K2 models', () => {
      expect(() => {
        provider.createChatService({
          apiKey: 'test-api-key',
          model: MODEL_KIMI_K2_6,
          reasoning_effort: 'max',
        });
      }).toThrow('does not support the reasoning_effort option');
    });

    it('should keep thinking enabled for Kimi K2.7 Code when tools are provided', () => {
      const options: KimiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_KIMI_K2_7_CODE,
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
        MODEL_KIMI_K2_7_CODE,
        MODEL_KIMI_K2_7_CODE,
        options.tools,
        ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'enabled' }),
        undefined,
      );
    });

    it('should throw when Kimi K2.7 Code explicitly disables thinking', () => {
      expect(() => {
        provider.createChatService({
          apiKey: 'test-api-key',
          model: MODEL_KIMI_K2_7_CODE,
          thinking: { type: 'disabled' },
        });
      }).toThrow('requires thinking mode');
    });

    it('should disable thinking for older Kimi models when tools are provided', () => {
      const options: KimiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_KIMI_K2_6,
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
        MODEL_KIMI_K2_6,
        MODEL_KIMI_K2_6,
        options.tools,
        ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
        undefined,
        undefined,
        expect.objectContaining({ type: 'disabled' }),
        undefined,
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
        MODEL_KIMI_K3_1_PRO,
        MODEL_KIMI_K3_1_PRO,
        undefined,
        'http://localhost:8000/v1/chat/completions',
        undefined,
        undefined,
        undefined,
        'low',
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
