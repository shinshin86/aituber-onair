import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiSummarizer } from '../../../../../src/services/chat/providers/gemini/GeminiSummarizer';
import { Message } from '../../../../../src/types';
import {
  ENDPOINT_GEMINI_API,
  MODEL_GEMINI_2_0_FLASH_LITE,
} from '../../../../../src/constants';
import { DEFAULT_SUMMARY_PROMPT_TEMPLATE } from '../../../../../src/constants';
import { AITuberOnAirCore } from '../../../../../src/core/AITuberOnAirCore';
import { ChatServiceFactory } from '../../../../../src/services/chat/ChatServiceFactory';

describe('GeminiSummarizer', () => {
  const TEST_API_KEY = 'test-api-key';
  let summarizer: GeminiSummarizer;

  // Utility function: mock fetch
  function mockFetch(responseData: any, ok = true, statusText = 'OK') {
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 400,
      statusText,
      json: async () => responseData,
    });
  }

  beforeEach(() => {
    // Generate new instance for each test
    summarizer = new GeminiSummarizer(TEST_API_KEY);
    vi.resetAllMocks();
  });

  it('should initialize with default model', () => {
    const defaultSummarizer = new GeminiSummarizer(TEST_API_KEY);

    // Hack to test private properties
    const model = (defaultSummarizer as any).model;
    expect(model).toBe(MODEL_GEMINI_2_0_FLASH_LITE);
  });

  it('should initialize with custom model and prompt template', () => {
    const customModel = 'custom-gemini-model';
    const customTemplate = 'Custom prompt {maxLength} characters';
    const customSummarizer = new GeminiSummarizer(
      TEST_API_KEY,
      customModel,
      customTemplate,
    );

    // Hack to test private properties
    const model = (customSummarizer as any).model;
    const template = (customSummarizer as any).defaultPromptTemplate;

    expect(model).toBe(customModel);
    expect(template).toBe(customTemplate);
  });

  it('should generate summary successfully', async () => {
    // Mock response
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Summary of the conversation.' }],
          },
        },
      ],
    };

    // Mock fetch
    mockFetch(mockApiResponse);

    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'How are you?' },
      { role: 'user', content: 'I am fine!' },
    ];

    const summary = await summarizer.summarize(messages);

    // Check fetch call parameters
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const url = callArgs[0];
    const requestOptions = callArgs[1];

    // Check if URL contains model name and API key
    expect(url).toContain(
      `${ENDPOINT_GEMINI_API}/models/${MODEL_GEMINI_2_0_FLASH_LITE}:generateContent?key=${TEST_API_KEY}`,
    );

    // Check JSON content of the body
    const bodyObj = JSON.parse(requestOptions?.body as string);

    // Check if system prompt and messages are set correctly
    expect(bodyObj.contents[0].parts[0].text).toContain(
      DEFAULT_SUMMARY_PROMPT_TEMPLATE.replace('{maxLength}', '256'),
    );
    expect(bodyObj.contents[0].parts[1].text).toContain('user: Hello');

    expect(bodyObj.generationConfig).toBeDefined();
    expect(bodyObj.generationConfig.maxOutputTokens).toBe(256);

    // Check summary result
    expect(summary).toBe('Summary of the conversation.');
  });

  it('should apply maxLength parameter correctly', async () => {
    // Mock response
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Short summary' }],
          },
        },
      ],
    };

    // Mock fetch
    mockFetch(mockApiResponse);

    const messages: Message[] = [{ role: 'user', content: 'Test' }];

    const maxLength = 100;
    await summarizer.summarize(messages, maxLength);

    // Check parameters of fetch call
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const requestOptions = callArgs[1];
    const bodyObj = JSON.parse(requestOptions?.body as string);

    // Check system prompt and maxOutputTokens
    expect(bodyObj.contents[0].parts[0].text).toContain('100');
    expect(bodyObj.generationConfig.maxOutputTokens).toBe(100);
  });

  it('should return fallback summary on API error', async () => {
    // Error response
    mockFetch(
      {
        error: { message: 'Authentication error' },
      },
      false, // ok = false
      'Authentication error',
    );

    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hello, how can I help you?' },
    ];

    const summary = await summarizer.summarize(messages);

    // Check if fallback summary was generated
    expect(summary).toContain('2 messages');
    expect(summary).toContain('Latest topic:');
  });

  it('should return empty string for empty response', async () => {
    // Empty response
    const mockApiResponse = {
      candidates: [],
    };

    // Mock fetch
    mockFetch(mockApiResponse);

    const messages: Message[] = [{ role: 'user', content: 'Test' }];

    const summary = await summarizer.summarize(messages);
    expect(summary).toBe('');
  });

  // Test integration with AITuberOnAirCore
  it('should be selected automatically when using Gemini chat provider', () => {
    // Create a mock chat service with provider property
    const mockChatService = {
      provider: 'gemini',
      getModel: () => MODEL_GEMINI_2_0_FLASH_LITE,
      processChat: vi.fn(),
      processVisionChat: vi.fn(),
    };

    // Mock the ChatServiceFactory.createChatService method
    const originalCreateChatService = ChatServiceFactory.createChatService;
    ChatServiceFactory.createChatService = vi
      .fn()
      .mockReturnValue(mockChatService);

    try {
      // Create AITuberOnAirCore with Gemini provider
      const core = new AITuberOnAirCore({
        chatProvider: 'gemini',
        apiKey: TEST_API_KEY,
        chatOptions: {
          systemPrompt: 'Test prompt',
        },
        memoryOptions: {
          enableSummarization: true,
          maxMessagesBeforeSummarization: 10,
          shortTermDuration: 60 * 1000,
          midTermDuration: 5 * 60 * 1000,
          longTermDuration: 10 * 60 * 1000,
        },
      });

      // Check if memory is enabled (indicating Summarizer was created)
      expect(core.isMemoryEnabled()).toBe(true);

      // Verify the mock was called with the right arguments
      expect(ChatServiceFactory.createChatService).toHaveBeenCalledWith(
        'gemini',
        expect.objectContaining({
          apiKey: TEST_API_KEY,
        }),
      );

      // Get the provider info (this relies on the mocked chatService)
      const providerInfo = core.getProviderInfo();
      expect(providerInfo.name).toBe('gemini');
    } finally {
      // Restore the original method
      ChatServiceFactory.createChatService = originalCreateChatService;
    }
  });
});
