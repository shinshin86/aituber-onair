import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeChatServiceProvider } from '../../src/services/providers/claude/ClaudeChatServiceProvider';
import type { ClaudeChatServiceOptions } from '../../src/services/providers/ChatServiceProvider';
import type { ToolDefinition } from '../../src/types/toolChat';
import {
  MODEL_CLAUDE_3_HAIKU,
  MODEL_CLAUDE_4_SONNET,
  MODEL_CLAUDE_4_OPUS,
  MODEL_CLAUDE_4_5_SONNET,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_5_OPUS,
  MODEL_CLAUDE_4_6_SONNET,
  MODEL_CLAUDE_4_6_OPUS,
  MODEL_CLAUDE_4_7_OPUS,
  MODEL_CLAUDE_4_8_OPUS,
} from '../../src/constants';

// Mock ClaudeChatService
vi.mock('../../src/services/providers/claude/ClaudeChatService');
import { ClaudeChatService } from '../../src/services/providers/claude/ClaudeChatService';

describe('ClaudeChatServiceProvider', () => {
  let provider: ClaudeChatServiceProvider;

  beforeEach(() => {
    provider = new ClaudeChatServiceProvider();
    vi.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return "claude"', () => {
      expect(provider.getProviderName()).toBe('claude');
    });
  });

  describe('getSupportedModels', () => {
    it('should return array of supported models', () => {
      const models = provider.getSupportedModels();
      expect(models).toEqual([
        MODEL_CLAUDE_4_SONNET,
        MODEL_CLAUDE_4_OPUS,
        MODEL_CLAUDE_4_5_SONNET,
        MODEL_CLAUDE_4_5_HAIKU,
        MODEL_CLAUDE_4_5_OPUS,
        MODEL_CLAUDE_4_6_SONNET,
        MODEL_CLAUDE_4_6_OPUS,
        MODEL_CLAUDE_4_7_OPUS,
        MODEL_CLAUDE_4_8_OPUS,
        MODEL_CLAUDE_3_HAIKU,
      ]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return Claude Haiku 4.5 as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_CLAUDE_4_5_HAIKU);
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
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_3_HAIKU)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_4_SONNET)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_4_OPUS)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_4_5_SONNET)).toBe(
        true,
      );
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_4_5_HAIKU)).toBe(
        true,
      );
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_4_5_OPUS)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_4_6_SONNET)).toBe(
        true,
      );
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_4_6_OPUS)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_4_7_OPUS)).toBe(true);
      expect(provider.supportsVisionForModel(MODEL_CLAUDE_4_8_OPUS)).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(provider.supportsVisionForModel('claude-2')).toBe(false);
      expect(provider.supportsVisionForModel('claude-instant')).toBe(false);
      expect(provider.getVisionSupportLevelForModel('claude-2')).toBe(
        'unsupported',
      );
    });
  });

  describe('createChatService', () => {
    it('should create ClaudeChatService with default values', () => {
      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
      };

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_CLAUDE_4_5_HAIKU,
        MODEL_CLAUDE_4_5_HAIKU,
        [],
        [],
        undefined,
      );
    });

    it('should create ClaudeChatService with custom model', () => {
      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_CLAUDE_4_6_SONNET,
      };

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_CLAUDE_4_6_SONNET,
        MODEL_CLAUDE_4_6_SONNET,
        [],
        [],
        undefined,
      );
    });

    it('should use custom vision model when provided', () => {
      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
        model: 'claude-2',
        visionModel: MODEL_CLAUDE_4_6_SONNET,
      };

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        'claude-2',
        MODEL_CLAUDE_4_6_SONNET,
        [],
        [],
        undefined,
      );
    });

    it('should use default model for vision when model does not support vision', () => {
      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
        model: 'claude-2',
      };

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        'claude-2',
        MODEL_CLAUDE_4_5_HAIKU,
        [],
        [],
        undefined,
      );
    });

    it('should pass tools when provided', () => {
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

      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
        tools,
      };

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_CLAUDE_4_5_HAIKU,
        MODEL_CLAUDE_4_5_HAIKU,
        tools,
        [],
        undefined,
      );
    });

    it('should pass MCP servers when provided', () => {
      const mcpServers = [
        {
          name: 'test-server',
          command: 'test-command',
          args: ['arg1', 'arg2'],
        },
      ];

      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
        mcpServers,
      } as any;

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_CLAUDE_4_5_HAIKU,
        MODEL_CLAUDE_4_5_HAIKU,
        [],
        mcpServers,
        undefined,
      );
    });

    it('should handle all options together', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'search',
          description: 'Search the web',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
            required: ['query'],
          },
        },
      ];

      const mcpServers = [
        {
          name: 'mcp-server',
          command: 'mcp',
          args: [],
        },
      ];

      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
        model: MODEL_CLAUDE_4_7_OPUS,
        visionModel: MODEL_CLAUDE_4_5_HAIKU,
        tools,
        mcpServers,
      } as any;

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_CLAUDE_4_7_OPUS,
        MODEL_CLAUDE_4_5_HAIKU,
        tools,
        mcpServers,
        undefined,
      );
    });

    it('should handle undefined tools gracefully', () => {
      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
        tools: undefined,
      };

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_CLAUDE_4_5_HAIKU,
        MODEL_CLAUDE_4_5_HAIKU,
        [],
        [],
        undefined,
      );
    });

    it('should handle undefined mcpServers gracefully', () => {
      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
        mcpServers: undefined,
      } as any;

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_CLAUDE_4_5_HAIKU,
        MODEL_CLAUDE_4_5_HAIKU,
        [],
        [],
        undefined,
      );
    });

    it('should pass responseLength when provided', () => {
      const options: ClaudeChatServiceOptions = {
        apiKey: 'test-api-key',
        responseLength: 'short',
      } as any;

      provider.createChatService(options);

      expect(ClaudeChatService).toHaveBeenCalledWith(
        'test-api-key',
        MODEL_CLAUDE_4_5_HAIKU,
        MODEL_CLAUDE_4_5_HAIKU,
        [],
        [],
        'short',
      );
    });
  });
});
