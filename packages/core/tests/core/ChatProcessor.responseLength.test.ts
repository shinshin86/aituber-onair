import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ChatProcessor,
  ChatProcessorOptions,
} from '../../src/core/ChatProcessor';
import { ChatService } from '../../src/services/chat/ChatService';
import { MemoryManager } from '../../src/core/MemoryManager';
import { ToolResultBlock, ToolUseBlock } from '../../src/types/toolChat';
import {
  MAX_TOKENS_BY_LENGTH,
  CHAT_RESPONSE_LENGTH,
} from '../../src/constants/chat';

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
    it('should convert responseLength SHORT to correct token count', async () => {
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
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.SHORT], // Should be 100
      );
    });

    it('should convert responseLength VERY_SHORT to correct token count', async () => {
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
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.VERY_SHORT], // Should be 40
      );
    });

    it('should convert visionResponseLength MEDIUM to correct token count', async () => {
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
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.MEDIUM], // Should be 200
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

    it('should fallback from visionResponseLength to regular responseLength', async () => {
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
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.LONG], // Should fallback to regular responseLength
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

    it('should update responseLength through updateOptions', async () => {
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
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.LONG], // Updated responseLength should be used
      );
    });
  });
});
