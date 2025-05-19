import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeSummarizer } from '../../../../../src/services/chat/providers/claude/ClaudeSummarizer.ts';
import { Message } from '../../../../../src/types';
import { ENDPOINT_CLAUDE_API, MODEL_CLAUDE_3_HAIKU } from '../../../../../src/constants';
import { DEFAULT_SUMMARY_PROMPT_TEMPLATE } from '../../../../../src/constants';
import { AITuberOnAirCore } from '../../../../../src/core/AITuberOnAirCore';
import { ChatServiceFactory } from '../../../../../src/services/chat/ChatServiceFactory';

describe('ClaudeSummarizer', () => {
  const TEST_API_KEY = 'test-api-key';
  let summarizer: ClaudeSummarizer;

  function mockFetch(responseData: any, ok = true, statusText = 'OK') {
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 400,
      statusText,
      json: async () => responseData,
    });
  }

  beforeEach(() => {
    summarizer = new ClaudeSummarizer(TEST_API_KEY);
    vi.resetAllMocks();
  });

  it('should initialize with default model', () => {
    const defaultSummarizer = new ClaudeSummarizer(TEST_API_KEY);
    const model = (defaultSummarizer as any).model;
    expect(model).toBe(MODEL_CLAUDE_3_HAIKU);
  });

  it('should initialize with custom model and prompt template', () => {
    const customModel = 'custom-claude-model';
    const customTemplate = 'Custom prompt {maxLength} characters';
    const customSummarizer = new ClaudeSummarizer(
      TEST_API_KEY,
      customModel,
      customTemplate,
    );

    const model = (customSummarizer as any).model;
    const template = (customSummarizer as any).defaultPromptTemplate;

    expect(model).toBe(customModel);
    expect(template).toBe(customTemplate);
  });

  it('should generate summary successfully', async () => {
    const mockApiResponse = {
      content: [{ text: 'Summary of the conversation.' }],
    };
    mockFetch(mockApiResponse);

    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'How are you?' },
      { role: 'user', content: 'I am fine!' },
    ];

    const summary = await summarizer.summarize(messages);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const url = callArgs[0];
    const requestOptions = callArgs[1];

    expect(url).toBe(ENDPOINT_CLAUDE_API);

    expect(requestOptions?.headers).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': TEST_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });

    const bodyObj = JSON.parse(requestOptions?.body as string);
    expect(bodyObj.model).toBe(MODEL_CLAUDE_3_HAIKU);
    expect(bodyObj.messages).toHaveLength(1);
    expect(bodyObj.messages[0].content).toContain(
      DEFAULT_SUMMARY_PROMPT_TEMPLATE.replace('{maxLength}', '256'),
    );
    expect(bodyObj.max_tokens).toBe(256);

    expect(summary).toBe('Summary of the conversation.');
  });

  it('should apply maxLength parameter correctly', async () => {
    const mockApiResponse = { content: [{ text: 'Short summary' }] };
    mockFetch(mockApiResponse);

    const messages: Message[] = [{ role: 'user', content: 'Test' }];

    const maxLength = 100;
    await summarizer.summarize(messages, maxLength);

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const bodyObj = JSON.parse(callArgs[1]?.body as string);

    expect(bodyObj.messages[0].content).toContain('100');
    expect(bodyObj.max_tokens).toBe(100);
  });

  it('should return fallback summary on API error', async () => {
    mockFetch(
      { error: { message: 'Authentication error' } },
      false,
      'Authentication error',
    );

    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ];

    const summary = await summarizer.summarize(messages);

    expect(summary).toContain('2 messages');
    expect(summary).toContain('Latest topic:');
  });

  it('should handle empty response correctly', async () => {
    const mockApiResponse = { content: [] };
    mockFetch(mockApiResponse);

    const messages: Message[] = [{ role: 'user', content: 'Test' }];

    const summary = await summarizer.summarize(messages);
    expect(summary).toBe('');
  });

  it('should be selected automatically when using Claude chat provider', () => {
    const mockChatService = {
      provider: 'claude',
      getModel: () => MODEL_CLAUDE_3_HAIKU,
      processChat: vi.fn(),
      processVisionChat: vi.fn(),
    };

    const originalCreateChatService = ChatServiceFactory.createChatService;
    ChatServiceFactory.createChatService = vi.fn().mockReturnValue(mockChatService);

    try {
      const core = new AITuberOnAirCore({
        chatProvider: 'claude',
        apiKey: TEST_API_KEY,
        chatOptions: { systemPrompt: 'Test prompt' },
        memoryOptions: {
          enableSummarization: true,
          maxMessagesBeforeSummarization: 10,
          shortTermDuration: 60 * 1000,
          midTermDuration: 5 * 60 * 1000,
          longTermDuration: 10 * 60 * 1000,
        },
      });

      expect(core.isMemoryEnabled()).toBe(true);
      expect(ChatServiceFactory.createChatService).toHaveBeenCalledWith(
        'claude',
        expect.objectContaining({ apiKey: TEST_API_KEY }),
      );

      const providerInfo = core.getProviderInfo();
      expect(providerInfo.name).toBe('claude');
    } finally {
      ChatServiceFactory.createChatService = originalCreateChatService;
    }
  });
});
