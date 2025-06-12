import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiChatService } from '../../../../../src/services/chat/providers/gemini/GeminiChatService';
import { Message, MessageWithVision } from '../../../../../src/types';
import { DEFAULT_MAX_TOKENS } from '../../../../../src/constants/chat';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GeminiChatService - Response Length Control', () => {
  let geminiService: GeminiChatService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();

    geminiService = new GeminiChatService(mockApiKey);

    // Setup default mock response for all fetch calls
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Test response from Gemini',
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      }),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                '{"candidates":[{"content":{"parts":[{"text":"Test"}]}}]}\n',
              ),
            })
            .mockResolvedValueOnce({
              done: true,
              value: undefined,
            }),
        }),
      },
    });

    // Reset fetch global
    global.fetch = mockFetch;
  });

  describe('callGemini with maxTokens', () => {
    it('should include maxOutputTokens when maxTokens is specified', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello Gemini' }];

      // Act
      await geminiService.chatOnce(messages, false, () => {}, 140);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining('"maxOutputTokens":140'),
        }),
      );
    });

    it('should use DEFAULT_MAX_TOKENS when maxTokens is not specified', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello Gemini' }];

      // Act
      await geminiService.chatOnce(messages, false, () => {});

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining(
            `"maxOutputTokens":${DEFAULT_MAX_TOKENS}`,
          ),
        }),
      );
    });

    it('should use custom maxTokens over DEFAULT_MAX_TOKENS', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello Gemini' }];
      const customMaxTokens = 60;

      // Act
      await geminiService.chatOnce(messages, false, () => {}, customMaxTokens);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.generationConfig.maxOutputTokens).toBe(
        customMaxTokens,
      );
      expect(requestBody.generationConfig.maxOutputTokens).not.toBe(
        DEFAULT_MAX_TOKENS,
      );
    });
  });

  describe('visionChatOnce with maxTokens', () => {
    it('should include maxOutputTokens in vision requests when specified', async () => {
      // Setup simpler vision messages without complex image processing
      const messages: MessageWithVision[] = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'What do you see?' }],
        },
      ];

      // Act
      await geminiService.visionChatOnce(messages, false, () => {}, 220);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining('"maxOutputTokens":220'),
        }),
      );
    });

    it('should use DEFAULT_MAX_TOKENS for vision when maxTokens not specified', async () => {
      // Mock simple vision message processing
      const messages: MessageWithVision[] = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Analyze this image' }],
        },
      ];

      // Act
      await geminiService.visionChatOnce(messages, false, () => {});

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining(
            `"maxOutputTokens":${DEFAULT_MAX_TOKENS}`,
          ),
        }),
      );
    });
  });

  describe('streaming requests with maxTokens', () => {
    it('should include maxOutputTokens in streaming requests', async () => {
      // Arrange
      const messages: Message[] = [
        { role: 'user', content: 'Stream a response' },
      ];

      // Override mock for streaming response test only
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  '{"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n',
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
      await geminiService.chatOnce(messages, true, () => {}, 300);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('streamGenerateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining('"maxOutputTokens":300'),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle maxTokens = 1 (minimum)', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      // Act
      await geminiService.chatOnce(messages, false, () => {}, 1);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.generationConfig.maxOutputTokens).toBe(1);
    });

    it('should handle large maxTokens values', async () => {
      // Arrange
      const messages: Message[] = [
        { role: 'user', content: 'Generate a comprehensive response' },
      ];
      const largeMaxTokens = 8192;

      // Act
      await geminiService.chatOnce(messages, false, () => {}, largeMaxTokens);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.generationConfig.maxOutputTokens).toBe(largeMaxTokens);
    });
  });

  describe('backward compatibility', () => {
    it('should work with existing API calls without maxTokens parameter', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Hello Gemini' }];

      // Act - Call without maxTokens parameter (old way)
      await geminiService.chatOnce(messages, false, () => {});

      // Assert - Should still work and use DEFAULT_MAX_TOKENS
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.stringContaining(
            `"maxOutputTokens":${DEFAULT_MAX_TOKENS}`,
          ),
        }),
      );
    });

    it('should maintain existing Gemini request structure', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Test message' }];

      // Act
      await geminiService.chatOnce(messages, false, () => {}, 180);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Check that all expected Gemini API properties are present
      expect(requestBody).toHaveProperty('contents');
      expect(requestBody).toHaveProperty('generationConfig');
      expect(requestBody.generationConfig).toHaveProperty('maxOutputTokens');
      expect(requestBody.generationConfig.maxOutputTokens).toBe(180);

      // Check contents format
      expect(requestBody.contents).toHaveLength(1);
      expect(requestBody.contents[0]).toEqual({
        role: 'user',
        parts: [{ text: 'Test message' }],
      });
    });
  });

  describe('with tools and maxTokens', () => {
    it('should include both tools and maxOutputTokens in request', async () => {
      // Arrange
      const serviceWithTools = new GeminiChatService(
        mockApiKey,
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash-lite',
        [
          {
            name: 'test_function',
            description: 'Test function',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        ],
      );

      const messages: Message[] = [
        { role: 'user', content: 'Use the test function' },
      ];

      // Act
      await serviceWithTools.chatOnce(messages, false, () => {}, 110);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toHaveProperty('tools');
      expect(requestBody).toHaveProperty('generationConfig');
      expect(requestBody.generationConfig.maxOutputTokens).toBe(110);

      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0]).toEqual({
        function_declarations: [
          {
            name: 'test_function',
            description: 'Test function',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        ],
      });
    });
  });

  describe('API version handling with maxTokens', () => {
    it('should handle v1 API with maxOutputTokens', async () => {
      // Arrange
      const messages: Message[] = [{ role: 'user', content: 'Test v1 API' }];

      // Act
      await geminiService.chatOnce(messages, false, () => {}, 170);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];

      // Check URL contains v1 or v1beta
      expect(fetchCall[0]).toMatch(/\/v1(beta)?\//);

      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.generationConfig.maxOutputTokens).toBe(170);
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
