import { describe, it, expect, vi, beforeEach, MockedClass } from 'vitest';
import { OpenAIChatServiceProvider } from '../../src/services/providers/openai/OpenAIChatServiceProvider';
import type { ChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import type { ToolDefinition } from '../../src/types/toolChat';
import {
  MODEL_GPT_4_1,
  MODEL_GPT_4_1_MINI,
  MODEL_GPT_4_1_NANO,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_O3_MINI,
  MODEL_O1_MINI,
  MODEL_O1,
  MODEL_GPT_4_5_PREVIEW,
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
} from '../../src/constants';

// Mock OpenAIChatService
vi.mock('../../src/services/providers/openai/OpenAIChatService');
import { OpenAIChatService } from '../../src/services/providers/openai/OpenAIChatService';

describe('OpenAIChatServiceProvider', () => {
  let provider: OpenAIChatServiceProvider;

  beforeEach(() => {
    provider = new OpenAIChatServiceProvider();
    vi.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return "openai"', () => {
      expect(provider.getProviderName()).toBe('openai');
    });
  });

  describe('getSupportedModels', () => {
    it('should return array of supported models', () => {
      const models = provider.getSupportedModels();
      expect(models).toEqual([
        MODEL_GPT_4_1,
        MODEL_GPT_4_1_MINI,
        MODEL_GPT_4_1_NANO,
        MODEL_GPT_4O_MINI,
        MODEL_GPT_4O,
        MODEL_O3_MINI,
        MODEL_O1_MINI,
        MODEL_O1,
        MODEL_GPT_4_5_PREVIEW,
      ]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return GPT-4O-MINI as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_GPT_4O_MINI);
    });
  });

  describe('supportsVision', () => {
    it('should return true', () => {
      expect(provider.supportsVision()).toBe(true);
    });
  });

  describe('supportsVisionForModel', () => {
    it('should return true for vision-supported models', () => {
      expect(provider.supportsVisionForModel(MODEL_GPT_4O)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_GPT_4O_MINI)).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(provider.supportsVisionForModel('gpt-3.5-turbo')).toBe(false);
      expect(provider.supportsVisionForModel('text-davinci-003')).toBe(false);
    });
  });

  describe('createChatService', () => {
    it('should create OpenAIChatService with default values', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(OpenAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GPT_4O_MINI,
        undefined,
        undefined,
        ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
        [],
      );
    });

    it('should create OpenAIChatService with custom model', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GPT_4O,
      };

      provider.createChatService(options);

      expect(OpenAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GPT_4O,
        MODEL_GPT_4O,
        undefined,
        ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
        [],
      );
    });

    it('should use custom vision model when provided', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo',
        visionModel: MODEL_GPT_4O,
      };

      provider.createChatService(options);

      expect(OpenAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        'gpt-3.5-turbo',
        MODEL_GPT_4O,
        undefined,
        ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
        [],
      );
    });

    it('should use default model for vision when model does not support vision', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo',
      };

      provider.createChatService(options);

      expect(OpenAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        'gpt-3.5-turbo',
        MODEL_GPT_4O_MINI,
        undefined,
        ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
        [],
      );
    });

    it('should pass tools when provided', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'test-tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              param: { type: 'string' },
            },
          },
        },
      ];

      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        tools,
      };

      provider.createChatService(options);

      expect(OpenAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GPT_4O_MINI,
        undefined,
        tools,
        ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
        [],
      );
    });

    it('should use custom endpoint when provided', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        endpoint: 'https://custom.api.endpoint',
      };

      provider.createChatService(options);

      expect(OpenAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GPT_4O_MINI,
        undefined,
        undefined,
        'https://custom.api.endpoint',
        [],
      );
    });

    it('should use Responses API when MCP servers are configured', () => {
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        mcpServers: [
          {
            name: 'test-server',
            command: 'test-command',
            args: ['arg1'],
          },
        ],
      } as any;

      provider.createChatService(options);

      expect(OpenAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GPT_4O_MINI,
        undefined,
        undefined,
        ENDPOINT_OPENAI_RESPONSES_API,
        options.mcpServers,
      );
    });

    it('should prioritize custom endpoint over MCP-based endpoint selection', () => {
      const customEndpoint = 'https://custom.endpoint';
      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        endpoint: customEndpoint,
        mcpServers: [
          {
            name: 'test-server',
            command: 'test-command',
            args: ['arg1'],
          },
        ],
      } as any;

      provider.createChatService(options);

      expect(OpenAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GPT_4O_MINI,
        undefined,
        undefined,
        customEndpoint,
        options.mcpServers,
      );
    });

    it('should handle all options together', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'calculator',
          description: 'Perform calculations',
          parameters: {
            type: 'object',
            properties: {
              expression: { type: 'string' },
            },
          },
        },
      ];

      const options: ChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_GPT_4O,
        visionModel: MODEL_GPT_4O_MINI,
        tools,
        endpoint: 'https://custom.endpoint',
        mcpServers: [
          {
            name: 'mcp-server',
            command: 'mcp',
            args: [],
          },
        ],
      } as any;

      provider.createChatService(options);

      expect(OpenAIChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_GPT_4O,
        MODEL_GPT_4O_MINI,
        tools,
        'https://custom.endpoint',
        options.mcpServers,
      );
    });
  });
});
