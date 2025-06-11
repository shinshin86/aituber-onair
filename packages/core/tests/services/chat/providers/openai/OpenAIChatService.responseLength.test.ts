import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIChatService } from '../../../../../src/services/chat/providers/openai/OpenAIChatService';
import { Message, MessageWithVision } from '../../../../../src/types';
import { DEFAULT_MAX_TOKENS } from '../../../../../src/constants/chat';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenAIChatService - Response Length Control', () => {
  let openaiService: OpenAIChatService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();

    openaiService = new OpenAIChatService(mockApiKey);

    // Setup default mock response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
      }),
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    });
  });

  describe('buildRequestBody with maxTokens', () => {
    it('should include max_tokens when maxTokens is specified', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      // Act
      await openaiService.chatOnce(messages, false, () => {}, 150);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining('"max_tokens":150'),
        }),
      );
    });

    it('should use DEFAULT_MAX_TOKENS when maxTokens is not specified', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      // Act
      await openaiService.chatOnce(messages, false, () => {});

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining(`"max_tokens":${DEFAULT_MAX_TOKENS}`),
        }),
      );
    });

    it('should use custom maxTokens over DEFAULT_MAX_TOKENS', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const customMaxTokens = 50;

      // Act
      await openaiService.chatOnce(messages, false, () => {}, customMaxTokens);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.max_tokens).toBe(customMaxTokens);
      expect(requestBody.max_tokens).not.toBe(DEFAULT_MAX_TOKENS);
    });
  });

  describe('visionChatOnce with maxTokens', () => {
    it('should include max_tokens in vision requests when specified', async () => {
      // Arrange
      const messages: MessageWithVision[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image' },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/jpeg;base64,test',
                detail: 'low',
              },
            },
          ],
        },
      ];

      // Act
      await openaiService.visionChatOnce(messages, false, () => {}, 200);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining('"max_tokens":200'),
        }),
      );
    });

    it('should use DEFAULT_MAX_TOKENS for vision when maxTokens not specified', async () => {
      // Arrange
      const messages: MessageWithVision[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image' },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/jpeg;base64,test',
                detail: 'low',
              },
            },
          ],
        },
      ];

      // Act
      await openaiService.visionChatOnce(messages, false, () => {});

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining(`"max_tokens":${DEFAULT_MAX_TOKENS}`),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle maxTokens = 0', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      // Act
      await openaiService.chatOnce(messages, false, () => {}, 0);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.max_tokens).toBe(0);
    });

    it('should handle very large maxTokens', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const largeMaxTokens = 4096;

      // Act
      await openaiService.chatOnce(messages, false, () => {}, largeMaxTokens);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.max_tokens).toBe(largeMaxTokens);
    });
  });

  describe('backward compatibility', () => {
    it('should work with existing API calls without maxTokens parameter', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      // Act - Call without maxTokens parameter (old way)
      await openaiService.chatOnce(messages, false, () => {});

      // Assert - Should still work and use DEFAULT_MAX_TOKENS
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining(`"max_tokens":${DEFAULT_MAX_TOKENS}`),
        }),
      );
    });

    it('should maintain existing request structure with max_tokens addition', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Test message' }];

      // Act
      await openaiService.chatOnce(messages, true, () => {}, 100);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Check that all expected properties are present
      expect(requestBody).toHaveProperty('model');
      expect(requestBody).toHaveProperty('messages');
      expect(requestBody).toHaveProperty('stream');
      expect(requestBody).toHaveProperty('max_tokens');
      expect(requestBody.max_tokens).toBe(100);
    });
  });

  describe('with tools and maxTokens', () => {
    it('should include both tools and max_tokens in request', async () => {
      // Arrange
      const serviceWithTools = new OpenAIChatService(
        mockApiKey,
        'gpt-4o-mini',
        'gpt-4o-mini',
        [
          {
            name: 'test_tool',
            description: 'Test tool',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        ],
      );

      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      // Act
      await serviceWithTools.chatOnce(messages, false, () => {}, 75);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toHaveProperty('tools');
      expect(requestBody).toHaveProperty('tool_choice');
      expect(requestBody).toHaveProperty('max_tokens');
      expect(requestBody.max_tokens).toBe(75);
    });
  });
});
