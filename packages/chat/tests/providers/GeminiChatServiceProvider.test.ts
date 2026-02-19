import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiChatServiceProvider } from '../../src/services/providers/gemini/GeminiChatServiceProvider';
import type { GeminiChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import type { ToolDefinition } from '../../src/types/toolChat';
import type { MCPServerConfig } from '../../src/types/mcp';
import {
  MODEL_GEMINI_3_1_PRO_PREVIEW,
  MODEL_GEMINI_3_PRO_PREVIEW,
  MODEL_GEMINI_3_FLASH_PREVIEW,
  MODEL_GEMINI_2_5_PRO,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_2_5_FLASH_LITE,
  MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_2_0_FLASH_LITE,
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
        MODEL_GEMINI_3_1_PRO_PREVIEW,
        MODEL_GEMINI_3_PRO_PREVIEW,
        MODEL_GEMINI_3_FLASH_PREVIEW,
        MODEL_GEMINI_2_5_PRO,
        MODEL_GEMINI_2_5_FLASH,
        MODEL_GEMINI_2_5_FLASH_LITE,
        MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
        MODEL_GEMINI_2_0_FLASH,
        MODEL_GEMINI_2_0_FLASH_LITE,
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
      expect(
        provider.supportsVisionForModel(MODEL_GEMINI_3_1_PRO_PREVIEW),
      ).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_GEMINI_3_PRO_PREVIEW)).toBe(
        true,
      );
      expect(
        provider.supportsVisionForModel(MODEL_GEMINI_3_FLASH_PREVIEW),
      ).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_GEMINI_2_0_FLASH)).toBe(
        true,
      );
      expect(provider.supportsVisionForModel(MODEL_GEMINI_2_0_FLASH_LITE)).toBe(
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
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH_LITE,
        MODEL_GEMINI_2_0_FLASH_LITE,
        [],
        [],
        undefined,
      );
    });

    it('should create GeminiChatService with custom model', () => {
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_2_0_FLASH,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH,
        MODEL_GEMINI_2_0_FLASH,
        [],
        [],
        undefined,
      );
    });

    it('should use custom vision model when provided', () => {
      const options: GeminiChatServiceOptions = {
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
        [],
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
        MODEL_GEMINI_2_0_FLASH_LITE,
        [],
        [],
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
        MODEL_GEMINI_2_0_FLASH_LITE,
        MODEL_GEMINI_2_0_FLASH_LITE,
        tools,
        [],
        undefined,
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
        MODEL_GEMINI_2_0_FLASH_LITE,
        MODEL_GEMINI_2_0_FLASH_LITE,
        [],
        [],
        undefined,
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
        model: MODEL_GEMINI_2_0_FLASH,
        visionModel: MODEL_GEMINI_2_0_FLASH,
        tools,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH,
        MODEL_GEMINI_2_0_FLASH,
        tools,
        [],
        undefined,
      );
    });

    it('should handle model as vision model when it supports vision', () => {
      const options: GeminiChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GEMINI_2_0_FLASH,
      };

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH,
        MODEL_GEMINI_2_0_FLASH,
        [],
        [],
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
        MODEL_GEMINI_2_0_FLASH_LITE,
        MODEL_GEMINI_2_0_FLASH_LITE,
        [],
        [],
        'long',
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
        MODEL_GEMINI_2_0_FLASH_LITE,
        MODEL_GEMINI_2_0_FLASH_LITE,
        [],
        mcpServers,
        undefined,
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
        model: MODEL_GEMINI_2_0_FLASH,
        tools,
        mcpServers,
        responseLength: 'medium',
      } as any;

      provider.createChatService(options);

      expect(GeminiChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GEMINI_2_0_FLASH,
        MODEL_GEMINI_2_0_FLASH,
        tools,
        mcpServers,
        'medium',
      );
    });
  });
});
