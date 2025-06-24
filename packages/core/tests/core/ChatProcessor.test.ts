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
        // Caught error in test
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

  describe('runToolLoop', () => {
    it('should process tool calls and return responses', async () => {
      // Arrange
      const mockOnce = vi
        .fn()
        .mockImplementation(async (_msgs, _stream, onPartial) => {
          // First call returns tool use blocks
          if (mockOnce.mock.calls.length === 1) {
            onPartial?.('Thinking...');
            return {
              blocks: [
                { type: 'text', text: 'I need to use a tool' },
                {
                  type: 'tool_use',
                  id: 'tool-1',
                  name: 'calculator',
                  input: { operation: 'add', a: 2, b: 3 },
                },
              ],
              stop_reason: 'tool_use',
            };
          }

          // Second call returns final response
          return {
            blocks: [{ type: 'text', text: 'The answer is 5' }],
            stop_reason: 'end',
          };
        });

      // Tool callback returns tool result
      const toolCallback = vi.fn().mockImplementation(async (blocks) => {
        return [
          {
            type: 'tool_result',
            tool_use_id: blocks[0].id,
            content: '5',
          },
        ];
      });

      const processor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        defaultOptions as unknown as ChatProcessorOptions,
        undefined,
        toolCallback,
      );

      const emitSpy = vi.spyOn(processor, 'emit' as any);

      mockChatService.chatOnce = mockOnce;

      // Act
      await processor.processTextChat('Calculate 2 + 3');

      // Assert
      expect(mockOnce).toHaveBeenCalledTimes(2);
      expect(toolCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'tool_use',
          id: 'tool-1',
          name: 'calculator',
        }),
      ]);

      // Verify both partial and final responses were emitted
      expect(emitSpy).toHaveBeenCalledWith(
        'assistantPartialResponse',
        'Thinking...',
      );
      expect(emitSpy).toHaveBeenCalledWith(
        'assistantResponse',
        expect.objectContaining({
          message: expect.objectContaining({
            content: 'The answer is 5',
          }),
        }),
      );
    });

    it('should handle Claude provider specific format', async () => {
      // Arrange - Simulate Claude provider
      const mockClaudeService = {
        provider: 'claude',
        chatOnce: vi
          .fn()
          .mockImplementation(async (_msgs, _stream, onPartial) => {
            if (mockClaudeService.chatOnce.mock.calls.length === 1) {
              onPartial?.('Thinking...');
              return {
                blocks: [
                  { type: 'text', text: 'I need to use a tool' },
                  {
                    type: 'tool_use',
                    id: 'tool-1',
                    name: 'calculator',
                    input: { operation: 'add', a: 2, b: 3 },
                  },
                ],
                stop_reason: 'tool_use',
              };
            }

            return {
              blocks: [{ type: 'text', text: 'The answer is 5' }],
              stop_reason: 'end',
            };
          }),
        getTokenLimit: vi.fn().mockReturnValue(4000),
      };

      // Tool callback returns tool result
      const toolCallback = vi.fn().mockImplementation(async (blocks) => {
        return [
          {
            type: 'tool_result',
            tool_use_id: blocks[0].id,
            content: '5',
          },
        ];
      });

      const processor = new ChatProcessor(
        mockClaudeService as unknown as ChatService,
        defaultOptions as unknown as ChatProcessorOptions,
        undefined,
        toolCallback,
      );

      // Act
      await processor.processTextChat('Calculate 2 + 3');

      // Assert
      expect(mockClaudeService.chatOnce).toHaveBeenCalledTimes(2);
      // Check if the second call uses Claude format
      const secondCallMessages = mockClaudeService.chatOnce.mock.calls[1][0];

      // Verify messages contain tool results in Claude format
      const toolResultMessage = secondCallMessages.find(
        (msg: any) =>
          msg.role === 'user' &&
          Array.isArray(msg.content) &&
          msg.content[0]?.type === 'tool_result',
      );

      expect(toolResultMessage).toBeDefined();
      expect(toolResultMessage.content[0].tool_use_id).toBe('tool-1');
      expect(toolResultMessage.content[0].content).toBe('5');
    });

    it('should handle non-Claude provider format', async () => {
      // Arrange - Simulate non-Claude provider
      const mockNonClaudeService = {
        provider: 'openai',
        chatOnce: vi
          .fn()
          .mockImplementation(async (_msgs, _stream, onPartial) => {
            if (mockNonClaudeService.chatOnce.mock.calls.length === 1) {
              onPartial?.('Thinking...');
              return {
                blocks: [
                  { type: 'text', text: 'I need to use a tool' },
                  {
                    type: 'tool_use',
                    id: 'tool-1',
                    name: 'calculator',
                    input: { operation: 'add', a: 2, b: 3 },
                  },
                ],
                stop_reason: 'tool_use',
              };
            }

            return {
              blocks: [{ type: 'text', text: 'The answer is 5' }],
              stop_reason: 'end',
            };
          }),
        getTokenLimit: vi.fn().mockReturnValue(4000),
      };

      // Tool callback returns tool result
      const toolCallback = vi.fn().mockImplementation(async (blocks) => {
        return [
          {
            type: 'tool_result',
            tool_use_id: blocks[0].id,
            content: '5',
          },
        ];
      });

      const processor = new ChatProcessor(
        mockNonClaudeService as unknown as ChatService,
        defaultOptions as unknown as ChatProcessorOptions,
        undefined,
        toolCallback,
      );

      // Act
      await processor.processTextChat('Calculate 2 + 3');

      // Assert
      expect(mockNonClaudeService.chatOnce).toHaveBeenCalledTimes(2);
      // Check if the second call uses OpenAI format
      const secondCallMessages = mockNonClaudeService.chatOnce.mock.calls[1][0];

      // Verify messages contain tool results in OpenAI format
      const toolResultMessage = secondCallMessages.find(
        (msg: any) => msg.role === 'tool' && msg.tool_call_id === 'tool-1',
      );

      expect(toolResultMessage).toBeDefined();
      expect(toolResultMessage.tool_call_id).toBe('tool-1');
      expect(toolResultMessage.content).toBe('5');
    });

    it('should respect MAX_HOPS limit', async () => {
      // Arrange - Simulate a service that always responds with tool use
      const mockInfiniteToolService = {
        chatOnce: vi.fn().mockImplementation(async () => {
          return {
            blocks: [
              {
                type: 'tool_use',
                id: `tool-${mockInfiniteToolService.chatOnce.mock.calls.length}`,
                name: 'calculator',
                input: { operation: 'add', a: 1, b: 1 },
              },
            ],
            stop_reason: 'tool_use',
          };
        }),
        getTokenLimit: vi.fn().mockReturnValue(4000),
      };

      // Tool callback returns tool result
      const toolCallback = vi.fn().mockImplementation(async (blocks) => {
        return [
          {
            type: 'tool_result',
            tool_use_id: blocks[0].id,
            content: '2',
          },
        ];
      });

      // Create processor with MAX_HOPS set to 3
      const options = {
        ...defaultOptions,
        maxHops: 3,
      };

      const processor = new ChatProcessor(
        mockInfiniteToolService as unknown as ChatService,
        options as unknown as ChatProcessorOptions,
        undefined,
        toolCallback,
      );

      const consoleSpy = vi.spyOn(console, 'warn');

      // Act
      await processor.processTextChat('Calculate something');

      // Assert
      // Verify it's called MAX_HOPS (3) times
      expect(mockInfiniteToolService.chatOnce).toHaveBeenCalledTimes(3);
      expect(toolCallback).toHaveBeenCalledTimes(3);

      // Verify warning is logged
      expect(consoleSpy).toHaveBeenCalledWith('Tool loop exceeded MAX_HOPS');
    });

    it('should handle missing tool callback by emitting an error', async () => {
      // Arrange
      const mockToolUseService = {
        chatOnce: vi.fn().mockResolvedValue({
          blocks: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'calculator',
              input: { operation: 'add', a: 2, b: 3 },
            },
          ],
          stop_reason: 'tool_use',
        }),
        getTokenLimit: vi.fn().mockReturnValue(4000),
      };

      // Create processor without tool callback
      const processor = new ChatProcessor(
        mockToolUseService as unknown as ChatService,
        defaultOptions as unknown as ChatProcessorOptions,
        undefined,
        undefined, // No tool callback
      );

      // Setup spy for error event
      const emitSpy = vi.spyOn(processor, 'emit' as any);

      // Act
      await processor.processTextChat('Calculate 2 + 3');

      // Assert - Check if error is emitted instead of thrown
      const errorEmit = emitSpy.mock.calls.find(
        (call) =>
          call[0] === 'error' &&
          (call[1] as Error).message === 'Tool callback missing',
      );
      expect(errorEmit).toBeDefined();
    });
  });

  describe('tool processing features', () => {
    it('should emit tool result content as partial response', async () => {
      // Arrange
      const mockOnce = vi
        .fn()
        .mockImplementation(async (_msgs, _stream, onPartial) => {
          // First call returns tool use blocks
          if (mockOnce.mock.calls.length === 1) {
            return {
              blocks: [
                {
                  type: 'tool_use',
                  id: 'tool-1',
                  name: 'calculator',
                  input: { operation: 'add', a: 2, b: 3 },
                },
              ],
              stop_reason: 'tool_use',
            };
          }

          // Second call returns final response with tool result
          return {
            blocks: [
              { type: 'tool_result', content: 'Result: 5' },
              { type: 'text', text: 'The answer is 5' },
            ],
            stop_reason: 'end',
          };
        });

      // Tool callback returns tool result
      const toolCallback = vi.fn().mockImplementation(async (blocks) => {
        return [
          {
            type: 'tool_result',
            tool_use_id: blocks[0].id,
            content: 'Result: 5',
          },
        ];
      });

      const processor = new ChatProcessor(
        mockChatService as unknown as ChatService,
        defaultOptions as unknown as ChatProcessorOptions,
        undefined,
        toolCallback,
      );

      const emitSpy = vi.spyOn(processor, 'emit' as any);

      mockChatService.chatOnce = mockOnce;

      // Act
      await processor.processTextChat('Calculate 2 + 3');

      // Assert
      // Verify tool result content is emitted as partial response
      const partialEmitCalls = emitSpy.mock.calls.filter(
        (call) =>
          call[0] === 'assistantPartialResponse' && call[1] === 'Result: 5',
      );
      expect(partialEmitCalls.length).toBeGreaterThan(0);
    });
  });
});
