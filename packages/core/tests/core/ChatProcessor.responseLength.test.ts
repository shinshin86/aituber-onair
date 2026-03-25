import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ChatProcessor,
  ChatProcessorOptions,
} from '../../src/core/ChatProcessor';
import { ChatService } from '@aituber-onair/chat';
import { MemoryManager } from '../../src/core/MemoryManager';
import { ToolResultBlock, ToolUseBlock } from '../../src/types/toolChat';
import { CHAT_RESPONSE_LENGTH } from '@aituber-onair/chat';

// ToolCallback type
type ToolCallback = (blocks: ToolUseBlock[]) => Promise<ToolResultBlock[]>;

// ChatService mock interface
interface MockChatService {
  chatOnce: ReturnType<typeof vi.fn<any, Promise<any>>>;
  visionChatOnce: ReturnType<typeof vi.fn<any, Promise<any>>>;
}

// ChatService mock
const mockChatService: MockChatService = {
  chatOnce: vi.fn<any, Promise<any>>(),
  visionChatOnce: vi.fn<any, Promise<any>>(),
};

describe('ChatProcessor - Response Length Control', () => {
  let chatProcessor: ChatProcessor;
  let mockToolCallback: ToolCallback;

  beforeEach(() => {
    vi.clearAllMocks();

    mockToolCallback = vi.fn().mockImplementation(async () => {
      return [];
    });

    // Setup default mock response
    mockChatService.chatOnce.mockResolvedValue({
      blocks: [{ type: 'text', text: 'Test response' }],
      stop_reason: 'end',
    });

    mockChatService.visionChatOnce.mockResolvedValue({
      blocks: [{ type: 'text', text: 'Test vision response' }],
      stop_reason: 'end',
    });
  });

  describe('maxTokens direct specification', () => {
    it('should pass maxTokens to chatOnce when specified', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        maxTokens: 150,
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processTextChat('Hello');

      // Assert
      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true,
        expect.any(Function),
        150, // maxTokens should be passed
      );
    });

    it('should pass visionMaxTokens to visionChatOnce when specified', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        visionMaxTokens: 200,
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processVisionChat(
        'data:image/jpeg;base64,test',
      );

      // Assert
      expect(mockChatService.visionChatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true, // first call is always streaming
        expect.any(Function),
        200, // visionMaxTokens should be passed
      );
    });
  });

  describe('responseLength preset specification', () => {
    it('should defer responseLength SHORT handling to the provider', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        responseLength: CHAT_RESPONSE_LENGTH.SHORT,
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processTextChat('Hello');

      // Assert
      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true,
        expect.any(Function),
        undefined,
      );
    });

    it('should defer responseLength VERY_SHORT handling to the provider', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        responseLength: CHAT_RESPONSE_LENGTH.VERY_SHORT,
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processTextChat('Hello');

      // Assert
      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true,
        expect.any(Function),
        undefined,
      );
    });

    it('should still convert visionResponseLength MEDIUM in core', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        visionResponseLength: CHAT_RESPONSE_LENGTH.MEDIUM,
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processVisionChat(
        'data:image/jpeg;base64,test',
      );

      // Assert
      expect(mockChatService.visionChatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true, // first call is always streaming
        expect.any(Function),
        200,
      );
    });
  });

  describe('priority handling', () => {
    it('should prioritize maxTokens over responseLength', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        maxTokens: 250, // Direct specification
        responseLength: CHAT_RESPONSE_LENGTH.SHORT, // This should be ignored
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processTextChat('Hello');

      // Assert
      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true,
        expect.any(Function),
        250, // maxTokens should take priority
      );
    });

    it('should prioritize visionMaxTokens over visionResponseLength', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        visionMaxTokens: 300, // Direct specification
        visionResponseLength: CHAT_RESPONSE_LENGTH.LONG, // This should be ignored
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processVisionChat(
        'data:image/jpeg;base64,test',
      );

      // Assert
      expect(mockChatService.visionChatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true, // first call is always streaming
        expect.any(Function),
        300, // visionMaxTokens should take priority
      );
    });

    it('should not convert regular responseLength for vision fallback in core', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        responseLength: CHAT_RESPONSE_LENGTH.LONG, // Fallback for vision
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processVisionChat(
        'data:image/jpeg;base64,test',
      );

      // Assert
      expect(mockChatService.visionChatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true, // first call is always streaming
        expect.any(Function),
        undefined,
      );
    });
  });

  describe('backward compatibility', () => {
    it('should work without any token settings (undefined maxTokens)', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        // No maxTokens or responseLength specified
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processTextChat('Hello');

      // Assert
      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true,
        expect.any(Function),
        undefined, // Should pass undefined for provider default
      );
    });

    it('should work for vision without any token settings', async () => {
      // Arrange
      const options: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
        // No visionMaxTokens or visionResponseLength specified
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options,
        undefined,
        mockToolCallback,
      );

      // Act
      await (chatProcessor as any).processVisionChat(
        'data:image/jpeg;base64,test',
      );

      // Assert
      expect(mockChatService.visionChatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true, // first call is always streaming
        expect.any(Function),
        undefined, // Should pass undefined for provider default
      );
    });
  });

  describe('updateOptions', () => {
    it('should update maxTokens through updateOptions', async () => {
      // Arrange
      const initialOptions: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        initialOptions,
        undefined,
        mockToolCallback,
      );

      // Act - Update options
      (chatProcessor as any).updateOptions({
        maxTokens: 123,
      });

      await (chatProcessor as any).processTextChat('Hello');

      // Assert
      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true,
        expect.any(Function),
        123, // Updated maxTokens should be used
      );
    });

    it('should keep updated responseLength provider-managed', async () => {
      // Arrange
      const initialOptions: ChatProcessorOptions = {
        systemPrompt: 'Test prompt',
        useMemory: false,
      };

      chatProcessor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        initialOptions,
        undefined,
        mockToolCallback,
      );

      // Act - Update options
      (chatProcessor as any).updateOptions({
        responseLength: CHAT_RESPONSE_LENGTH.LONG,
      });

      await (chatProcessor as any).processTextChat('Hello');

      // Assert
      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        expect.any(Array),
        true,
        expect.any(Function),
        undefined,
      );
    });
  });
});
