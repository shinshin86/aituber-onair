import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiChatServiceProvider } from '../../src/services/providers/gemini/GeminiChatServiceProvider';
import type { GeminiChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import type { ToolDefinition } from '../../src/types/toolChat';
import type { MCPServerConfig } from '../../src/types/mcp';
import {
  MODEL_GEMMA_4_31B_IT,
  MODEL_GEMMA_4_26B_A4B_IT,
  MODEL_GEMINI_3_6_FLASH,
  MODEL_GEMINI_3_5_FLASH,
  MODEL_GEMINI_3_5_FLASH_LITE,
  MODEL_GEMINI_3_1_PRO_PREVIEW,
  MODEL_GEMINI_3_1_FLASH_LITE,
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  MODEL_GEMINI_3_PRO_PREVIEW,
  MODEL_GEMINI_3_FLASH_PREVIEW,
  MODEL_GEMINI_2_5_PRO,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_2_5_FLASH_LITE,
  MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
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
        MODEL_GEMINI_3_6_FLASH,
        MODEL_GEMINI_3_5_FLASH,
        MODEL_GEMINI_3_5_FLASH_LITE,
        MODEL_GEMINI_3_1_FLASH_LITE,
        MODEL_GEMINI_3_1_PRO_PREVIEW,
        MODEL_GEMINI_3_FLASH_PREVIEW,
        MODEL_GEMINI_2_5_PRO,
        MODEL_GEMINI_2_5_FLASH,
        MODEL_GEMINI_2_5_FLASH_LITE,
        MODEL_GEMMA_4_31B_IT,
        MODEL_GEMMA_4_26B_A4B_IT,
      ]);
    });

    it('should not advertise deprecated models in the recommended list', () => {
      const models = provider.getSupportedModels();
      expect(models).not.toContain(MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW);
      expect(models).not.toContain(MODEL_GEMINI_3_PRO_PREVIEW);
      expect(models).not.toContain(MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17);
    });
  });

  describe('getDefaultModel', () => {
    it('should return Gemini 3.1 Flash-Lite as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_GEMINI_3_1_FLASH_LITE);
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
      expect(provider.supportsVisionForModel(MODEL_GEMMA_4_31B_IT)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_GEMMA_4_26B_A4B_IT)).toBe(
        true,
      );
      expect(
        provider.supportsVisionForModel(MODEL_GEMINI_3_1_PRO_PREVIEW),
      ).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_GEMINI_3_5_FLASH)).toBe(
        true,
      );
      expect(provider.supportsVisionForModel(MODEL_GEMINI_3_6_FLASH)).toBe(
        true,
      );
      expect(provider.supportsVisionForModel(MODEL_GEMINI_3_5_FLASH_LITE)).toBe(
        true,
      );
      expect(provider.supportsVisionForModel(MODEL_GEMINI_3_1_FLASH_LITE)).toBe(
        true,
      );
      expect(
        provider.supportsVisionForModel(MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW),
      ).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_GEMINI_3_PRO_PREVIEW)).toBe(
        true,
      );
      expect(
        provider.supportsVisionForModel(MODEL_GEMINI_3_FLASH_PREVIEW),
      ).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(provider.supportsVisionForModel('gemini-pro')).toBe(false);
      expect(provider.supportsVisionForModel('gemini-1.0')).toBe(false);
      expect(provider.getVisionSupportLevelForModel('gemini-pro')).toBe(
        'unsupported',
      );
    });
  });

  describe('createChatService', () => {
    it('should create GeminiChatService with default values', () => {
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_3_1_FLASH_LITE,
        MODEL_GEMINI_3_1_FLASH_LITE,
        [],
        [],
        undefined,
        'minimal',
      );
    });

    it('should create GeminiChatService with custom model', () => {
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_2_5_FLASH,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_5_FLASH,
        MODEL_GEMINI_2_5_FLASH,
        [],
        [],
        undefined,
        undefined,
      );
    });

    it('should use custom vision model when provided', () => {
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: 'gemini-pro',
        visionModel: MODEL_GEMINI_2_5_FLASH,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        'gemini-pro',
        MODEL_GEMINI_2_5_FLASH,
        [],
        [],
        undefined,
        undefined,
      );
    });

    it('should use default model for vision when model does not support vision', () => {
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: 'gemini-pro',
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        'gemini-pro',
        MODEL_GEMINI_3_1_FLASH_LITE,
        [],
        [],
        undefined,
        undefined,
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

      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        tools,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_3_1_FLASH_LITE,
        MODEL_GEMINI_3_1_FLASH_LITE,
        tools,
        [],
        undefined,
        'minimal',
      );
    });

    it('should handle undefined tools gracefully', () => {
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        tools: undefined,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_3_1_FLASH_LITE,
        MODEL_GEMINI_3_1_FLASH_LITE,
        [],
        [],
        undefined,
        'minimal',
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

      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_2_5_FLASH,
        visionModel: MODEL_GEMINI_2_5_FLASH,
        tools,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_5_FLASH,
        MODEL_GEMINI_2_5_FLASH,
        tools,
        [],
        undefined,
        undefined,
      );
    });

    it('should handle model as vision model when it supports vision', () => {
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_2_5_FLASH,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_5_FLASH,
        MODEL_GEMINI_2_5_FLASH,
        [],
        [],
        undefined,
        undefined,
      );
    });

    it('should pass responseLength when provided', () => {
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        responseLength: 'long',
      } as any;

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_3_1_FLASH_LITE,
        MODEL_GEMINI_3_1_FLASH_LITE,
        [],
        [],
        'long',
        'minimal',
      );
    });

    it('should pass MCP servers when provided', () => {
      const mcpServers: MCPServerConfig[] = [
        {
          type: 'url',
          url: 'http://localhost:3000',
          name: 'test-server',
          tool_configuration: {
            enabled: true,
            allowed_tools: ['weather', 'translate'],
          },
          authorization_token: 'test-token',
        },
      ];

      const options = {
        apiKey: 'test-api-key',
        mcpServers,
      } as any;

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_3_1_FLASH_LITE,
        MODEL_GEMINI_3_1_FLASH_LITE,
        [],
        mcpServers,
        undefined,
        'minimal',
      );
    });

    it('should handle MCP servers with tools together', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'calculator',
          description: 'Perform calculations',
          parameters: {
            type: 'object',
            properties: {
              expression: { type: 'string' },
            },
            required: ['expression'],
          },
        },
      ];

      const mcpServers: MCPServerConfig[] = [
        {
          type: 'url',
          url: 'http://localhost:3000',
          name: 'search-server',
        },
        {
          type: 'url',
          url: 'http://localhost:3001',
          name: 'db-server',
        },
      ];

      const options = {
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_2_5_FLASH,
        tools,
        mcpServers,
        responseLength: 'medium',
      } as any;

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_5_FLASH,
        MODEL_GEMINI_2_5_FLASH,
        tools,
        mcpServers,
        'medium',
        undefined,
      );
    });

    it('should pass a configured Gemini reasoning effort', () => {
      provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_3_6_FLASH,
        reasoning_effort: 'high',
      });

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_3_6_FLASH,
        MODEL_GEMINI_3_6_FLASH,
        [],
        [],
        undefined,
        'high',
      );
    });

    it('should normalize minimal reasoning to low for Gemini Pro', () => {
      provider.createChatService({
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_3_1_PRO_PREVIEW,
        reasoning_effort: 'minimal',
      });

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_3_1_PRO_PREVIEW,
        MODEL_GEMINI_3_1_PRO_PREVIEW,
        [],
        [],
        undefined,
        'low',
      );
    });

    it('should reject reasoning_effort for Gemini 2.5 models', () => {
      expect(() =>
        provider.createChatService({
          apiKey: 'test-api-key',
          model: MODEL_GEMINI_2_5_FLASH,
          reasoning_effort: 'medium',
        }),
      ).toThrow('Gemini 2.5 models use thinkingBudget instead');
    });
  });
});
