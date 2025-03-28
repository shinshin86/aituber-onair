import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAISummarizer } from '../../../../../src/services/chat/providers/openai/OpenAISummarizer';
import { Message } from '../../../../../src/types';
import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  MODEL_GPT_4O_MINI,
} from '../../../../../src/constants';
import { DEFAULT_SUMMARY_PROMPT_TEMPLATE } from '../../../../../src/constants/prompts';

describe('OpenAISummarizer', () => {
  const TEST_API_KEY = 'test-api-key';
  let summarizer: OpenAISummarizer;

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
    summarizer = new OpenAISummarizer(TEST_API_KEY);
    vi.resetAllMocks();
  });

  it('should initialize with default model', () => {
    const defaultSummarizer = new OpenAISummarizer(TEST_API_KEY);
    
    // Hack to test private properties
    const model = (defaultSummarizer as any).model;
    expect(model).toBe(MODEL_GPT_4O_MINI);
  });

  it('should initialize with custom model and prompt template', () => {
    const customModel = 'custom-openai-model';
    const customTemplate = 'Custom prompt {maxLength} characters';
    const customSummarizer = new OpenAISummarizer(
      TEST_API_KEY,
      customModel,
      customTemplate
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
      choices: [
        {
          message: {
            content: 'Summary of the conversation.',
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
    
    // Check if URL is correct
    expect(url).toBe(ENDPOINT_OPENAI_CHAT_COMPLETIONS_API);

    // Check headers
    expect(requestOptions?.headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_API_KEY}`
    });

    // Check JSON content of the body
    const bodyObj = JSON.parse(requestOptions?.body as string);
    
    // Check if model and messages are set correctly
    expect(bodyObj.model).toBe(MODEL_GPT_4O_MINI);
    expect(bodyObj.messages).toHaveLength(2);
    expect(bodyObj.messages[0].role).toBe('system');
    expect(bodyObj.messages[0].content).toContain(DEFAULT_SUMMARY_PROMPT_TEMPLATE.replace('{maxLength}', '256'));
    expect(bodyObj.messages[1].role).toBe('user');
    expect(bodyObj.messages[1].content).toContain('user: Hello');
    
    expect(bodyObj.max_tokens).toBe(256);

    // Check summary result
    expect(summary).toBe('Summary of the conversation.');
  });

  it('should apply maxLength parameter correctly', async () => {
    // Mock response
    const mockApiResponse = {
      choices: [
        {
          message: {
            content: 'Short summary',
          },
        },
      ],
    };

    // Mock fetch
    mockFetch(mockApiResponse);

    const messages: Message[] = [
      { role: 'user', content: 'Test' },
    ];

    const maxLength = 100;
    await summarizer.summarize(messages, maxLength);

    // Check parameters of fetch call
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const requestOptions = callArgs[1];
    const bodyObj = JSON.parse(requestOptions?.body as string);
    
    // Check system prompt and max_tokens
    expect(bodyObj.messages[0].content).toContain('100');
    expect(bodyObj.max_tokens).toBe(100);
  });

  it('should return fallback summary on API error', async () => {
    // Error response
    mockFetch(
      {
        error: { message: 'Authentication error' },
      },
      false, // ok = false
      'Authentication error'
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

  it('should handle empty response correctly', async () => {
    // Empty response
    const mockApiResponse = {
      choices: []
    };

    // Mock fetch
    mockFetch(mockApiResponse);

    const messages: Message[] = [
      { role: 'user', content: 'Test' },
    ];

    const summary = await summarizer.summarize(messages);
    expect(summary).toBe('');
  });
}); 