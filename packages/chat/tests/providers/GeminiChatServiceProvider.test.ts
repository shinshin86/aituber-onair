import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiChatServiceProvider } from '../../src/services/providers/gemini/GeminiChatServiceProvider';
import type { ChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import type { ToolDefinition } from '../../src/types/toolChat';
import {
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_2_0_FLASH_LITE,
  MODEL_GEMINI_1_5_FLASH,
} from '../../src/constants';

// Mock GeminiChatService
vi.mock('../../src/services/providers/gemini/GeminiChatService');
import { GeminiChatService } from '../../src/services/providers/gemini/GeminiChatService';

describe('GeminiChatServiceProvider', () => {
  let provider: GeminiChatServiceProvider;

  beforeEach(() => {
    provider = new GeminiChatServiceProvider();
    vi.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return "gemini"', () => {
      expect(provider.getProviderName()).toBe('gemini');
    });
  });

  describe('getSupportedModels', () => {
    it('should return array of supported models', () => {
      const models = provider.getSupportedModels();
      expect(models).toEqual([
        MODEL_GEMINI_2_0_FLASH,
        MODEL_GEMINI_2_0_FLASH_LITE,
        MODEL_GEMINI_1_5_FLASH,
      ]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return Gemini 2.0 Flash Lite as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_GEMINI_2_0_FLASH_LITE);
    });
  });

  describe('supportsVision', () => {
    it('should return true', () => {
      expect(provider.supportsVision()).toBe(true);
    });
  });

  describe('supportsVisionForModel', () => {
    it('should return true for vision-supported models', () => {
      expect(provider.supportsVisionForModel(MODEL_GEMINI_2_0_FLASH)).toBe(
        true,
      );
      expect(provider.supportsVisionForModel(MODEL_GEMINI_2_0_FLASH_LITE)).toBe(
        true,
      );
      expect(provider.supportsVisionForModel(MODEL_GEMINI_1_5_FLASH)).toBe(
        true,
      );
    });

    it('should return false for non-vision models', () => {
      expect(provider.supportsVisionForModel('gemini-pro')).toBe(false);
      expect(provider.supportsVisionForModel('gemini-1.0')).toBe(false);
    });
  });

  describe('createChatService', () => {
    it('should create GeminiChatService with default values', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH_LITE,
        undefined,
        [],
      );
    });

    it('should create GeminiChatService with custom model', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_2_0_FLASH,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH,
        MODEL_GEMINI_2_0_FLASH,
        [],
      );
    });

    it('should use custom vision model when provided', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: 'gemini-pro',
        visionModel: MODEL_GEMINI_2_0_FLASH,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        'gemini-pro',
        MODEL_GEMINI_2_0_FLASH,
        [],
      );
    });

    it('should use default model for vision when model does not support vision', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: 'gemini-pro',
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        'gemini-pro',
        MODEL_GEMINI_2_0_FLASH_LITE,
        [],
      );
    });

    it('should pass tools when provided', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'weather',
          description: 'Get weather information',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string' },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
              },
            },
            required: ['location'],
          },
        },
      ];

      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        tools,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH_LITE,
        undefined,
        tools,
      );
    });

    it('should handle undefined tools gracefully', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        tools: undefined,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH_LITE,
        undefined,
        [],
      );
    });

    it('should handle all options together', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'translator',
          description: 'Translate text between languages',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              from: { type: 'string' },
              to: { type: 'string' },
            },
            required: ['text', 'to'],
          },
        },
      ];

      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_1_5_FLASH,
        visionModel: MODEL_GEMINI_2_0_FLASH,
        tools,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_1_5_FLASH,
        MODEL_GEMINI_2_0_FLASH,
        tools,
      );
    });

    it('should handle model as vision model when it supports vision', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_2_0_FLASH,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH,
        MODEL_GEMINI_2_0_FLASH,
        [],
      );
    });
  });
});
