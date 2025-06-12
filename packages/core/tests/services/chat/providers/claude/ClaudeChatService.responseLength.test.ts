import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeChatService } from '../../../../../src/services/chat/providers/claude/ClaudeChatService';
import { Message, MessageWithVision } from '../../../../../src/types';
import { DEFAULT_MAX_TOKENS } from '../../../../../src/constants/chat';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClaudeChatService - Response Length Control', () => {
  let claudeService: ClaudeChatService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();

    claudeService = new ClaudeChatService(mockApiKey);

    // Setup default mock response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: 'Test response from Claude',
          },
        ],
        stop_reason: 'end_turn',
      }),
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    });
  });

  describe('callClaude with maxTokens', () => {
    it('should include max_tokens when maxTokens is specified', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello Claude' }];

      // Act
      await claudeService.chatOnce(messages, false, () => {}, 120);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining('"max_tokens":120'),
        }),
      );
    });

    it('should use DEFAULT_MAX_TOKENS when maxTokens is not specified', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello Claude' }];

      // Act
      await claudeService.chatOnce(messages, false, () => {});

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
      const messages: Message[] = [{ role: 'user', content: 'Hello Claude' }];
      const customMaxTokens = 80;

      // Act
      await claudeService.chatOnce(messages, false, () => {}, customMaxTokens);

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
            { type: 'text', text: 'What do you see in this image?' },
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
      await claudeService.visionChatOnce(messages, false, () => {}, 180);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining('"max_tokens":180'),
        }),
      );
    });

    it('should use DEFAULT_MAX_TOKENS for vision when maxTokens not specified', async () => {
      // Arrange
      const messages: MessageWithVision[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this image' },
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
      await claudeService.visionChatOnce(messages, false, () => {});

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

  describe('streaming requests with maxTokens', () => {
    it('should include max_tokens in streaming requests', async () => {
      // Arrange
      const messages: Message[] = [
        { role: 'user', content: 'Tell me a story' },
      ];

      // Mock streaming response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n',
                ),
              })
              .mockResolvedValueOnce({
                done: true,
                value: undefined,
              }),
          }),
        },
      });

      // Act
      await claudeService.chatOnce(messages, true, () => {}, 250);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.stream).toBe(true);
      expect(requestBody.max_tokens).toBe(250);
    });
  });

  describe('edge cases', () => {
    it('should handle maxTokens = 1 (minimum)', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      // Act
      await claudeService.chatOnce(messages, false, () => {}, 1);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.max_tokens).toBe(1);
    });

    it('should handle large maxTokens values', async () => {
      // Arrange
      const messages: Message[] = [
        { role: 'user', content: 'Write a long response' },
      ];
      const largeMaxTokens = 4000;

      // Act
      await claudeService.chatOnce(messages, false, () => {}, largeMaxTokens);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.max_tokens).toBe(largeMaxTokens);
    });
  });

  describe('backward compatibility', () => {
    it('should work with existing API calls without maxTokens parameter', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello Claude' }];

      // Act - Call without maxTokens parameter (old way)
      await claudeService.chatOnce(messages, false, () => {});

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

    it('should maintain existing Claude request structure', async () => {
      // Arrange
      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Test message' },
      ];

      // Act
      await claudeService.chatOnce(messages, false, () => {}, 150);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Check that all expected Claude API properties are present
      expect(requestBody).toHaveProperty('model');
      expect(requestBody).toHaveProperty('system');
      expect(requestBody).toHaveProperty('messages');
      expect(requestBody).toHaveProperty('stream');
      expect(requestBody).toHaveProperty('max_tokens');
      expect(requestBody.max_tokens).toBe(150);

      // Check system prompt extraction
      expect(requestBody.system).toBe('You are a helpful assistant');
      expect(requestBody.messages).toHaveLength(1);
      expect(requestBody.messages[0]).toEqual({
        role: 'user',
        content: 'Test message',
      });
    });
  });

  describe('with tools and maxTokens', () => {
    it('should include both tools and max_tokens in request', async () => {
      // Arrange
      const serviceWithTools = new ClaudeChatService(
        mockApiKey,
        'claude-3-haiku-20240307',
        'claude-3-haiku-20240307',
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

      const messages: Message[] = [
        { role: 'user', content: 'Use the test tool' },
      ];

      // Act
      await serviceWithTools.chatOnce(messages, false, () => {}, 90);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toHaveProperty('tools');
      expect(requestBody).toHaveProperty('tool_choice');
      expect(requestBody).toHaveProperty('max_tokens');
      expect(requestBody.max_tokens).toBe(90);
      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0]).toEqual({
        name: 'test_tool',
        description: 'Test tool',
        input_schema: {
          type: 'object',
          properties: {},
        },
      });
    });
  });

  describe('DEFAULT_MAX_TOKENS constant verification', () => {
    it('should verify DEFAULT_MAX_TOKENS is imported correctly', () => {
      // Assert
      expect(DEFAULT_MAX_TOKENS).toBeDefined();
      expect(typeof DEFAULT_MAX_TOKENS).toBe('number');
      expect(DEFAULT_MAX_TOKENS).toBe(1000);
    });
  });
});
