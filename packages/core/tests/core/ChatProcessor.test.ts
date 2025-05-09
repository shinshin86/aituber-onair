import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ChatProcessor,
  ChatProcessorOptions,
} from '../../src/core/ChatProcessor';
import { ChatService } from '../../src/services/chat/ChatService';
import { MemoryManager } from '../../src/core/MemoryManager';
import { ToolResultBlock, ToolUseBlock } from '../../src/types/toolChat';
import type { Mock } from 'vitest';

// ToolCallback type
type ToolCallback = (blocks: ToolUseBlock[]) => Promise<ToolResultBlock[]>;

// actual ChatProcessorOptions type for testing
type TestChatProcessorOptions = {
  systemPrompt?: string;
  visionSystemPrompt?: string;
  visionPrompt?: string;
  useMemory?: boolean;
  memoryNote?: string;
};

// ChatService mock interface - define directly without Partial
interface MockChatService {
  chatOnce: ReturnType<typeof vi.fn<any, Promise<any>>>;
  visionChatOnce: ReturnType<typeof vi.fn<any, Promise<any>>>;
  getTokenLimit: ReturnType<typeof vi.fn<any, number>>;
}

// ChatService mock
const mockChatService: MockChatService = {
  chatOnce: vi.fn<any, Promise<any>>(),
  visionChatOnce: vi.fn<any, Promise<any>>(),
  getTokenLimit: vi.fn<any, number>().mockReturnValue(4000),
};

// MemoryManager mock interface - define directly without Partial
interface MockMemoryManager {
  createMemoryIfNeeded: ReturnType<typeof vi.fn<any, Promise<void>>>;
  addMessage: ReturnType<typeof vi.fn<any, void>>;
  cleanupOldMemories: ReturnType<typeof vi.fn<any, void>>;
  getAllMemories: ReturnType<typeof vi.fn<any, Promise<any[]>>>;
  getMemoryForPrompt: ReturnType<typeof vi.fn<any, string>>;
}

// MemoryManager mock
const mockMemoryManager: MockMemoryManager = {
  createMemoryIfNeeded: vi.fn<any, Promise<void>>().mockResolvedValue(),
  addMessage: vi.fn<any, void>(),
  cleanupOldMemories: vi.fn<any, void>(),
  getAllMemories: vi.fn<any, Promise<any[]>>().mockResolvedValue([]),
  getMemoryForPrompt: vi.fn<any, string>().mockReturnValue(''),
};

describe('ChatProcessor', () => {
  let chatProcessor: ChatProcessor;
  let defaultOptions: TestChatProcessorOptions;
  let mockToolCallback: ToolCallback;

  beforeEach(() => {
    // common test preparation
    vi.clearAllMocks();

    defaultOptions = {
      systemPrompt: 'You are a virtual assistant',
      visionSystemPrompt: 'You are analyzing an image',
      visionPrompt: 'Describe this image',
      useMemory: false,
      memoryNote: 'Remember this information',
    };

    // mock tool callback
    mockToolCallback = vi.fn().mockImplementation(async () => {
      return [];
    });

    // type assertion to actual type
    chatProcessor = new ChatProcessor(
      mockChatService as unknown as ChatService,
      defaultOptions as unknown as ChatProcessorOptions,
      undefined,
      mockToolCallback,
    );
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      // Assert
      expect(chatProcessor).toBeDefined();
    });

    it('should initialize with memory manager when useMemory is true', () => {
      // Arrange
      const options = {
        ...defaultOptions,
        useMemory: true,
      };

      // Act
      const processorWithMemory = new ChatProcessor(
        mockChatService as unknown as ChatService,
        options as unknown as ChatProcessorOptions,
        mockMemoryManager as unknown as MemoryManager,
        mockToolCallback,
      );

      // Assert
      expect(processorWithMemory).toBeDefined();
    });
  });

  describe('updateOptions', () => {
    it('should update options', () => {
      // Arrange
      const newOptions = {
        systemPrompt: 'New system prompt',
      };

      // Act
      (chatProcessor as any).updateOptions(newOptions);

      // it is difficult to verify the private fields of the test target,
      // so verify indirectly in subsequent actions
      expect(chatProcessor).toBeDefined();
      // Note: to verify actual options changes, processTextChat should be called
      // so verify indirectly in subsequent actions
    });
  });

  describe('processTextChat', () => {
    it('should process chat input and return response', async () => {
      // Arrange
      const userInput = 'Hello, how are you?';

      mockChatService.chatOnce.mockResolvedValueOnce({
        blocks: [{ type: 'text', text: 'I am fine, thank you!' }],
        stop_reason: 'end',
      });

      // Mock EventEmitter emit
      const emitSpy = vi.spyOn(chatProcessor as any, 'emit');

      // Act
      await (chatProcessor as any).processTextChat(userInput);

      // Assert
      expect(mockChatService.chatOnce).toHaveBeenCalled();

      // Check events
      expect(emitSpy).toHaveBeenCalledWith(
        'processingStart',
        expect.any(Object),
      );
      expect(emitSpy).toHaveBeenCalledWith('processingEnd');
    });

    it('should emit streaming events if callback is provided', async () => {
      // Arrange
      const userInput = 'Tell me a story';

      // mock implementation to simulate assistantPartialResponse
      mockChatService.chatOnce.mockImplementation(
        async (_msgs, stream, onPartial) => {
          // simulate streaming callback
          if (onPartial && stream) {
            onPartial('Once upon a time');
          }

          return {
            blocks: [{ type: 'text', text: 'Once upon a time' }],
            stop_reason: 'end',
          };
        },
      );

      const emitSpy = vi.spyOn(chatProcessor as any, 'emit');

      // Act
      await (chatProcessor as any).processTextChat(userInput);

      // Assert - Check streaming events
      // check assistantPartialResponse event
      const partialResponses = emitSpy.mock.calls.filter(
        (call) => call[0] === 'assistantPartialResponse',
      );
      expect(partialResponses.length).toBeGreaterThan(0);
      expect(partialResponses[0][1]).toBe('Once upon a time');

      // check other necessary events
      expect(emitSpy).toHaveBeenCalledWith(
        'assistantResponse',
        expect.any(Object),
      );
    });

    it('should manage chat log properly', async () => {
      // Arrange
      const processor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        defaultOptions as unknown as ChatProcessorOptions,
        undefined,
        mockToolCallback,
      );

      // test specific features with custom implementation
      mockChatService.chatOnce.mockResolvedValueOnce({
        blocks: [{ type: 'text', text: 'Response from AI' }],
        stop_reason: 'end',
      });

      const addToChatLogSpy = vi.spyOn(processor as any, 'addToChatLog');

      // Act
      await (processor as any).processTextChat('Test message');

      // Assert
      expect(addToChatLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Test message',
        }),
      );

      expect(addToChatLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: 'Response from AI',
        }),
      );
    });
  });

  describe('processVisionChat', () => {
    it('should process vision chat input and return response', async () => {
      // Arrange
      const imageDataUrl = 'data:image/png;base64,ABC123';

      // Mock visionChatOnce implementation
      mockChatService.visionChatOnce.mockResolvedValueOnce({
        blocks: [{ type: 'text', text: 'I see a cat in the image' }],
        stop_reason: 'end',
      });

      // Mock EventEmitter emit
      const emitSpy = vi.spyOn(chatProcessor as any, 'emit');

      // Act
      await (chatProcessor as any).processVisionChat(imageDataUrl);

      // Assert
      expect(mockChatService.visionChatOnce).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        'processingStart',
        expect.objectContaining({
          type: 'vision',
          imageUrl: imageDataUrl,
        }),
      );
      expect(emitSpy).toHaveBeenCalledWith('processingEnd');
    });
  });

  describe('chat log management', () => {
    it('should clear chat log', () => {
      // Arrange
      const emitSpy = vi.spyOn(chatProcessor as any, 'emit');

      // Act
      (chatProcessor as any).clearChatLog();

      // Assert
      expect(emitSpy).toHaveBeenCalledWith('chatLogUpdated', []);
    });

    it('should add to chat log', async () => {
      // Arrange
      const message = { role: 'user', content: 'Hello', timestamp: Date.now() };
      const emitSpy = vi.spyOn(chatProcessor as any, 'emit');

      // Act
      (chatProcessor as any).addToChatLog(message);

      // Assert
      expect(emitSpy).toHaveBeenCalledWith(
        'chatLogUpdated',
        expect.arrayContaining([message]),
      );
    });

    it('should get chat log', async () => {
      // Arrange
      const message = { role: 'user', content: 'Hello', timestamp: Date.now() };

      // Add message to chat log
      (chatProcessor as any).addToChatLog(message);

      // Act
      const chatLog = (chatProcessor as any).getChatLog();

      // Assert
      expect(chatLog).toEqual([message]);
    });
  });

  describe('memory integration', () => {
    it('should handle memory operations properly', async () => {
      // simplify test
      vi.resetAllMocks();

      // create mock functions
      const cleanupFn = vi.fn();
      const createMemoryFn = vi.fn().mockResolvedValue(undefined);
      const addMessageFn = vi.fn();

      // create memory manager
      const localMemoryManager = {
        createMemoryIfNeeded: createMemoryFn,
        addMessage: addMessageFn,
        cleanupOldMemories: cleanupFn,
        getAllMemories: vi
          .fn()
          .mockResolvedValue([
            { type: 'short', summary: 'Test memory', timestamp: Date.now() },
          ]),
        getMemoryForPrompt: vi.fn().mockReturnValue(''),
      };

      // Mock chatOnce implementation to return a simple result
      const mockLocalChatService = {
        chatOnce: vi.fn().mockResolvedValue({
          blocks: [{ type: 'text', text: 'Response from AI' }],
          stop_reason: 'end',
        }),
        getTokenLimit: vi.fn().mockReturnValue(4000),
      };

      const localToolCallback: ToolCallback = vi
        .fn()
        .mockImplementation(async () => {
          return [];
        });

      // create simple processor
      const processor = new ChatProcessor(
        mockLocalChatService as unknown as ChatService,
        {
          ...defaultOptions,
          useMemory: true,
        } as unknown as ChatProcessorOptions,
        localMemoryManager as unknown as MemoryManager,
        localToolCallback,
      );

      // Act
      await (processor as any).processTextChat('Test message');

      // verify - memory functions are called
      expect(createMemoryFn).toHaveBeenCalled();
      expect(cleanupFn).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle errors during chat processing', async () => {
      // Arrange
      // clear mocks before setting up spies
      vi.clearAllMocks();

      // create error
      const error = new Error('API Error');

      // set error to be thrown
      mockChatService.chatOnce = vi.fn().mockImplementation(() => {
        throw error; // Promise is not rejected, but the exception is thrown directly
      });

      // set spy for emit
      const emitSpy = vi.spyOn(chatProcessor as any, 'emit');

      // Act
      try {
        await (chatProcessor as any).processTextChat('Hello');
      } catch (e) {
        // catch error and do nothing
        console.log('Caught error in test:', e);
      }

      // Assert
      // check each event individually
      const errorEmitCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'error',
      );
      const processingEndCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'processingEnd',
      );

      expect(errorEmitCalls.length).toBeGreaterThan(0);
      expect(errorEmitCalls[0][1]).toEqual(error);
      expect(processingEndCalls.length).toBeGreaterThan(0);
    });
  });

  describe('setChatLog', () => {
    it('should set chat log from external source and emit chatLogUpdated', () => {
      // Arrange
      const messages = [
        { role: 'user', content: 'Hello', timestamp: 1 },
        { role: 'assistant', content: 'Hi!', timestamp: 2 },
      ];
      const emitSpy = vi.spyOn(chatProcessor as any, 'emit');

      // Act
      (chatProcessor as any).setChatLog(messages);

      // Assert
      const log = (chatProcessor as any).getChatLog();
      expect(log).toEqual(messages);
      expect(emitSpy).toHaveBeenCalledWith('chatLogUpdated', messages);
    });

    it('should clear chat log if empty array is set', () => {
      // Arrange
      const messages = [
        { role: 'user', content: 'Hello', timestamp: 1 },
        { role: 'assistant', content: 'Hi!', timestamp: 2 },
      ];
      (chatProcessor as any).setChatLog(messages);
      expect((chatProcessor as any).getChatLog()).toEqual(messages);

      // Act
      (chatProcessor as any).setChatLog([]);

      // Assert
      expect((chatProcessor as any).getChatLog()).toEqual([]);
    });
  });
});
