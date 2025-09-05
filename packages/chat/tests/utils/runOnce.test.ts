import { describe, it, expect, vi } from 'vitest';
import { runOnceText } from '../../src/utils/runOnce';
import type { ChatService } from '../../src/services/ChatService';
import type { Message, TextBlock } from '../../src/types';

// Create mock ChatService
const createMockChatService = (): ChatService => ({
  getModel: vi.fn().mockReturnValue('test-model'),
  getVisionModel: vi.fn().mockReturnValue('test-vision-model'),
  chatOnce: vi.fn(),
  processChat: vi.fn(),
  processVisionChat: vi.fn(),
});

describe('runOnce utility', () => {
  describe('runOnceText', () => {
    it('should return concatenated text from single text block', async () => {
      const mockChatService = createMockChatService();
      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you?' },
      ];

      const mockBlocks: TextBlock[] = [
        { type: 'text', text: 'Hello! I am doing well, thank you for asking.' },
      ];

      vi.mocked(mockChatService.chatOnce).mockResolvedValue({
        blocks: mockBlocks,
        usage: { inputTokens: 10, outputTokens: 15 },
      });

      const result = await runOnceText(mockChatService, messages);

      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        messages,
        false,
        expect.any(Function),
      );
      expect(result).toBe('Hello! I am doing well, thank you for asking.');
    });

    it('should return concatenated text from multiple text blocks', async () => {
      const mockChatService = createMockChatService();
      const messages: Message[] = [
        { role: 'user', content: 'Tell me about TypeScript' },
      ];

      const mockBlocks: TextBlock[] = [
        { type: 'text', text: 'TypeScript is a programming language ' },
        { type: 'text', text: 'that builds on JavaScript ' },
        { type: 'text', text: 'by adding static type definitions.' },
      ];

      vi.mocked(mockChatService.chatOnce).mockResolvedValue({
        blocks: mockBlocks,
        usage: { inputTokens: 8, outputTokens: 20 },
      });

      const result = await runOnceText(mockChatService, messages);

      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        messages,
        false,
        expect.any(Function),
      );
      expect(result).toBe(
        'TypeScript is a programming language that builds on JavaScript by adding static type definitions.',
      );
    });

    it('should return empty string when no blocks returned', async () => {
      const mockChatService = createMockChatService();
      const messages: Message[] = [
        { role: 'user', content: 'Empty response test' },
      ];

      vi.mocked(mockChatService.chatOnce).mockResolvedValue({
        blocks: [],
        usage: { inputTokens: 5, outputTokens: 0 },
      });

      const result = await runOnceText(mockChatService, messages);

      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        messages,
        false,
        expect.any(Function),
      );
      expect(result).toBe('');
    });

    it('should handle conversation with multiple messages', async () => {
      const mockChatService = createMockChatService();
      const messages: Message[] = [
        { role: 'user', content: 'What is AI?' },
        {
          role: 'assistant',
          content: 'AI stands for Artificial Intelligence.',
        },
        { role: 'user', content: 'Can you elaborate?' },
      ];

      const mockBlocks: TextBlock[] = [
        { type: 'text', text: 'Certainly! AI refers to computer systems ' },
        {
          type: 'text',
          text: 'that can perform tasks that typically require ',
        },
        {
          type: 'text',
          text: 'human intelligence, such as learning and reasoning.',
        },
      ];

      vi.mocked(mockChatService.chatOnce).mockResolvedValue({
        blocks: mockBlocks,
        usage: { inputTokens: 25, outputTokens: 30 },
      });

      const result = await runOnceText(mockChatService, messages);

      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        messages,
        false,
        expect.any(Function),
      );
      expect(result).toBe(
        'Certainly! AI refers to computer systems that can perform tasks that typically require human intelligence, such as learning and reasoning.',
      );
    });

    it('should always call chatOnce with streaming disabled', async () => {
      const mockChatService = createMockChatService();
      const messages: Message[] = [{ role: 'user', content: 'Test message' }];

      const mockBlocks: TextBlock[] = [{ type: 'text', text: 'Test response' }];

      vi.mocked(mockChatService.chatOnce).mockResolvedValue({
        blocks: mockBlocks,
        usage: { inputTokens: 3, outputTokens: 3 },
      });

      await runOnceText(mockChatService, messages);

      // Verify that streaming is explicitly disabled (second parameter is false)
      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        messages,
        false,
        expect.any(Function),
      );
    });

    it('should propagate errors from chatOnce', async () => {
      const mockChatService = createMockChatService();
      const messages: Message[] = [{ role: 'user', content: 'This will fail' }];

      const testError = new Error('API request failed');
      vi.mocked(mockChatService.chatOnce).mockRejectedValue(testError);

      await expect(runOnceText(mockChatService, messages)).rejects.toThrow(
        'API request failed',
      );

      expect(mockChatService.chatOnce).toHaveBeenCalledWith(
        messages,
        false,
        expect.any(Function),
      );
    });

    it('should handle mixed content types by filtering text blocks', async () => {
      const mockChatService = createMockChatService();
      const messages: Message[] = [
        { role: 'user', content: 'Generate some content' },
      ];

      // Mix of text and non-text blocks (StreamTextAccumulator should handle filtering)
      const mockBlocks = [
        { type: 'text', text: 'Here is some text content ' },
        { type: 'function_call', name: 'test_function' }, // This should be ignored by StreamTextAccumulator
        { type: 'text', text: 'and here is more text.' },
      ];

      vi.mocked(mockChatService.chatOnce).mockResolvedValue({
        blocks: mockBlocks as TextBlock[],
        usage: { inputTokens: 8, outputTokens: 12 },
      });

      const result = await runOnceText(mockChatService, messages);

      expect(result).toBe('Here is some text content and here is more text.');
    });
  });
});
