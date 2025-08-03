import { describe, it, expect, vi } from 'vitest';
import type { ChatService } from '../src/services/ChatService';
import type { Message, MessageWithVision } from '../src/types';
import type { ToolChatCompletion } from '../src/types/toolChat';

// Mock implementation of ChatService for testing
class MockChatService implements ChatService {
  constructor(
    private model: string = 'test-model',
    private visionModel: string = 'test-vision-model',
  ) {}

  getModel(): string {
    return this.model;
  }

  getVisionModel(): string {
    return this.visionModel;
  }

  async processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    const response = 'Test response';
    onPartialResponse(response);
    await onCompleteResponse(response);
  }

  async processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    const response = 'Vision test response';
    onPartialResponse(response);
    await onCompleteResponse(response);
  }

  async chatOnce(
    messages: Message[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    if (stream) {
      onPartialResponse('Streaming ');
      onPartialResponse('response');
    }

    return {
      content: [{ type: 'text', text: 'Chat once response' }],
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    };
  }

  async visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    if (stream) {
      onPartialResponse('Vision ');
      onPartialResponse('streaming');
    }

    return {
      content: [{ type: 'text', text: 'Vision chat once response' }],
      usage: {
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
      },
    };
  }
}

describe('ChatService', () => {
  describe('MockChatService implementation', () => {
    it('should return correct model names', () => {
      const service = new MockChatService('gpt-4', 'gpt-4-vision');

      expect(service.getModel()).toBe('gpt-4');
      expect(service.getVisionModel()).toBe('gpt-4-vision');
    });

    it('should process chat messages', async () => {
      const service = new MockChatService();
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      const partialResponses: string[] = [];
      let completeResponse = '';

      await service.processChat(
        messages,
        (text) => partialResponses.push(text),
        async (text) => {
          completeResponse = text;
        },
      );

      expect(partialResponses).toEqual(['Test response']);
      expect(completeResponse).toBe('Test response');
    });

    it('should process vision chat messages', async () => {
      const service = new MockChatService();
      const messages: MessageWithVision[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image', image: 'base64data' },
          ],
        },
      ];

      const partialResponses: string[] = [];
      let completeResponse = '';

      await service.processVisionChat(
        messages,
        (text) => partialResponses.push(text),
        async (text) => {
          completeResponse = text;
        },
      );

      expect(partialResponses).toEqual(['Vision test response']);
      expect(completeResponse).toBe('Vision test response');
    });

    it('should handle chatOnce with streaming', async () => {
      const service = new MockChatService();
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      const partialResponses: string[] = [];

      const result = await service.chatOnce(
        messages,
        true,
        (text) => partialResponses.push(text),
        100,
      );

      expect(partialResponses).toEqual(['Streaming ', 'response']);
      expect(result.content).toEqual([
        { type: 'text', text: 'Chat once response' },
      ]);
      expect(result.usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      });
    });

    it('should handle chatOnce without streaming', async () => {
      const service = new MockChatService();
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      const partialResponses: string[] = [];

      const result = await service.chatOnce(messages, false, (text) =>
        partialResponses.push(text),
      );

      expect(partialResponses).toEqual([]);
      expect(result.content).toEqual([
        { type: 'text', text: 'Chat once response' },
      ]);
    });

    it('should handle visionChatOnce with streaming', async () => {
      const service = new MockChatService();
      const messages: MessageWithVision[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is this?' },
            { type: 'image', image: 'base64data' },
          ],
        },
      ];

      const partialResponses: string[] = [];

      const result = await service.visionChatOnce(
        messages,
        true,
        (text) => partialResponses.push(text),
        200,
      );

      expect(partialResponses).toEqual(['Vision ', 'streaming']);
      expect(result.content).toEqual([
        { type: 'text', text: 'Vision chat once response' },
      ]);
      expect(result.usage).toEqual({
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
      });
    });

    it('should handle visionChatOnce without streaming', async () => {
      const service = new MockChatService();
      const messages: MessageWithVision[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is this?' },
            { type: 'image', image: 'base64data' },
          ],
        },
      ];

      const partialResponses: string[] = [];

      const result = await service.visionChatOnce(messages, false, (text) =>
        partialResponses.push(text),
      );

      expect(partialResponses).toEqual([]);
      expect(result.content).toEqual([
        { type: 'text', text: 'Vision chat once response' },
      ]);
    });
  });

  describe('ChatService interface contract', () => {
    it('should define all required methods', () => {
      const service: ChatService = new MockChatService();

      expect(typeof service.getModel).toBe('function');
      expect(typeof service.getVisionModel).toBe('function');
      expect(typeof service.processChat).toBe('function');
      expect(typeof service.processVisionChat).toBe('function');
      expect(typeof service.chatOnce).toBe('function');
      expect(typeof service.visionChatOnce).toBe('function');
    });

    it('should handle async operations correctly', async () => {
      const service = new MockChatService();
      const onPartialResponse = vi.fn();
      const onCompleteResponse = vi.fn(async () => {});

      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ];

      await service.processChat(
        messages,
        onPartialResponse,
        onCompleteResponse,
      );

      expect(onPartialResponse).toHaveBeenCalledWith('Test response');
      expect(onCompleteResponse).toHaveBeenCalledWith('Test response');
    });

    it('should handle tool chat completion structure', async () => {
      const service = new MockChatService();

      const result = await service.chatOnce(
        [{ role: 'user', content: 'Test' }],
        false,
        () => {},
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('usage');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.usage).toHaveProperty('inputTokens');
      expect(result.usage).toHaveProperty('outputTokens');
      expect(result.usage).toHaveProperty('totalTokens');
    });
  });
});
