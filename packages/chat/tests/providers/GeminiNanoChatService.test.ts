import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiNanoChatService } from '../../src/services/providers/geminiNano/GeminiNanoChatService';
import { MAX_TOKENS_BY_LENGTH } from '../../src/constants/chat';
import type { Message } from '../../src/types';

// Mock LanguageModel API
const mockPrompt = vi.fn();
const mockDestroy = vi.fn();
const mockCreate = vi.fn().mockResolvedValue({
  prompt: mockPrompt,
  destroy: mockDestroy,
});
const mockAvailability = vi.fn().mockResolvedValue('available');

const mockLanguageModel = {
  availability: mockAvailability,
  create: mockCreate,
};

describe('GeminiNanoChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).LanguageModel = mockLanguageModel;
  });

  afterEach(() => {
    (globalThis as any).LanguageModel = undefined;
  });

  it('should return gemini-nano as model name', () => {
    const service = new GeminiNanoChatService();
    expect(service.getModel()).toBe('gemini-nano');
    expect(service.getVisionModel()).toBe('gemini-nano');
  });

  describe('processChat', () => {
    it('should create a session and return a response', async () => {
      mockPrompt.mockResolvedValue('Hello from Nano!');

      const service = new GeminiNanoChatService();
      const messages: Message[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hi' },
      ];

      const onPartial = vi.fn();
      const onComplete = vi.fn().mockResolvedValue(undefined);

      await service.processChat(messages, onPartial, onComplete);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          initialPrompts: [{ role: 'system', content: 'You are helpful.' }],
          expectedInputs: [{ type: 'text', languages: ['ja', 'en'] }],
          expectedOutputs: [{ type: 'text', languages: ['ja'] }],
        }),
      );
      expect(mockAvailability).toHaveBeenCalledWith({
        expectedInputs: [{ type: 'text', languages: ['ja', 'en'] }],
        expectedOutputs: [{ type: 'text', languages: ['ja'] }],
      });
      expect(mockPrompt).toHaveBeenCalledWith('Hi');
      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(onPartial).toHaveBeenCalledWith('Hello from Nano!');
      expect(onComplete).toHaveBeenCalledWith('Hello from Nano!');
    });

    it('should recreate session for every request', async () => {
      mockPrompt.mockResolvedValue('Response');

      const service = new GeminiNanoChatService();

      await service.processChat(
        [
          { role: 'system', content: 'Prompt A' },
          { role: 'user', content: 'Hi' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      await service.processChat(
        [
          { role: 'system', content: 'Prompt A' },
          { role: 'user', content: 'Hi again' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockDestroy).toHaveBeenCalledTimes(2);
    });

    it('should preserve conversation history roles in initial prompts', async () => {
      mockPrompt.mockResolvedValue('Response');

      const service = new GeminiNanoChatService();
      const messages: Message[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
      ];

      await service.processChat(
        messages,
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.initialPrompts).toEqual([
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
      ]);
      expect(mockPrompt).toHaveBeenCalledWith('Q2');
    });

    it('should place configured examples after the system prompt', async () => {
      mockPrompt.mockResolvedValue('Response');

      const service = new GeminiNanoChatService({
        initialPrompts: [
          { role: 'user', content: 'Example question' },
          { role: 'assistant', content: 'Short example answer.' },
          { role: 'system', content: 'Use a friendly tone.' },
        ],
      });

      await service.processChat(
        [
          { role: 'system', content: 'You are a character.' },
          { role: 'user', content: 'Current question' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.initialPrompts).toEqual([
        {
          role: 'system',
          content: 'You are a character.\n\nUse a friendly tone.',
        },
        { role: 'user', content: 'Example question' },
        { role: 'assistant', content: 'Short example answer.' },
      ]);
    });
  });

  describe('processVisionChat', () => {
    it('should throw error', async () => {
      const service = new GeminiNanoChatService();
      await expect(
        service.processVisionChat(
          [],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('Gemini Nano does not support vision');
    });
  });

  describe('chatOnce', () => {
    it('should return ToolChatCompletion with text block', async () => {
      mockPrompt.mockResolvedValue('Answer');

      const service = new GeminiNanoChatService();
      const result = await service.chatOnce(
        [{ role: 'user', content: 'Question' }],
        false,
      );

      expect(result).toEqual({
        blocks: [{ type: 'text', text: 'Answer' }],
        stop_reason: 'end',
      });
    });
  });

  describe('visionChatOnce', () => {
    it('should throw error', async () => {
      const service = new GeminiNanoChatService();
      await expect(service.visionChatOnce([])).rejects.toThrow(
        'Gemini Nano does not support vision',
      );
    });
  });

  describe('environment check', () => {
    it('should throw when LanguageModel is not available', async () => {
      (globalThis as any).LanguageModel = undefined;

      const service = new GeminiNanoChatService();
      await expect(
        service.processChat(
          [{ role: 'user', content: 'Hi' }],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('Gemini Nano is not available');
    });

    it('should throw when LanguageModel availability is unsupported', async () => {
      mockAvailability.mockResolvedValueOnce('unavailable');

      const service = new GeminiNanoChatService();
      await expect(
        service.processChat(
          [{ role: 'user', content: 'Hi' }],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('LanguageModel.availability() returned "unavailable"');

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw before session creation when no user message exists', async () => {
      const service = new GeminiNanoChatService();

      await expect(
        service.processChat(
          [{ role: 'assistant', content: 'Hi' }],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('No user message found in the provided messages.');

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('custom languages', () => {
    it('should use provided languages in session creation', async () => {
      mockPrompt.mockResolvedValue('Hello');

      const service = new GeminiNanoChatService({
        expectedInputLanguages: ['en'],
        expectedOutputLanguages: ['en'],
      });

      await service.processChat(
        [{ role: 'user', content: 'Hi' }],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedInputs: [{ type: 'text', languages: ['en'] }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
        }),
      );
    });
  });

  describe('responseLength', () => {
    it('should inject concrete short-response rules into the system prompt', async () => {
      mockPrompt.mockResolvedValue('短い回答');

      const service = new GeminiNanoChatService({
        responseLength: 'short',
      });

      await service.processChat(
        [
          { role: 'system', content: 'あなたは親切です。' },
          { role: 'user', content: '要約して' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      expect(systemPrompt).toContain('あなたは親切です。');
      expect(systemPrompt).toContain(
        'Reply in no more than two concise sentences',
      );
      expect(systemPrompt).toContain('Do not use a preamble');
      expect(systemPrompt).toMatch(/within approximately 100 tokens/);
    });

    it('should inject only the length instruction when system prompt is empty', async () => {
      mockPrompt.mockResolvedValue('短い回答');

      const service = new GeminiNanoChatService({
        responseLength: 'short',
      });

      await service.processChat(
        [{ role: 'user', content: '要約して' }],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      expect(systemPrompt).toContain(
        `within approximately ${MAX_TOKENS_BY_LENGTH.short} tokens`,
      );
      expect(systemPrompt).toContain(
        'Reply in no more than two concise sentences',
      );
      expect(systemPrompt.startsWith('\n\n')).toBe(false);
    });

    it.each([
      ['veryShort', 'no more than one concise sentence', 40],
      ['short', 'no more than two concise sentences', 100],
      ['medium', 'no more than three concise sentences', 200],
      ['long', 'no more than five sentences', 300],
      ['veryLong', 'no more than ten sentences', 1000],
    ] as const)(
      'should apply the %s sentence profile',
      async (responseLength, sentenceRule, maxTokens) => {
        mockPrompt.mockResolvedValue('回答');

        const service = new GeminiNanoChatService({ responseLength });

        await service.processChat(
          [{ role: 'user', content: '説明して' }],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        );

        const createCall = mockCreate.mock.calls[0][0];
        const systemPrompt = createCall.initialPrompts[0].content as string;
        expect(systemPrompt).toContain(sentenceRule);
        expect(systemPrompt).toContain(
          `within approximately ${maxTokens} tokens`,
        );
      },
    );

    it('should leave sentence count unrestricted for deep responses', async () => {
      mockPrompt.mockResolvedValue('詳細な回答');

      const service = new GeminiNanoChatService({
        responseLength: 'deep',
      });

      await service.processChat(
        [{ role: 'user', content: '詳しく説明して' }],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      expect(systemPrompt).toContain(
        'No sentence-count limit applies at this level',
      );
      expect(systemPrompt).toContain(
        `within approximately ${MAX_TOKENS_BY_LENGTH.deep} tokens`,
      );
    });

    it('should keep the length instruction in the leading system prompt', async () => {
      mockPrompt.mockResolvedValue('短い回答');

      const service = new GeminiNanoChatService({
        responseLength: 'short',
      });
      const messages: Message[] = [
        { role: 'system', content: 'あなたは親切です。' },
        { role: 'user', content: '最初の質問' },
        { role: 'assistant', content: '最初の回答' },
        { role: 'user', content: '次の質問' },
      ];

      await service.processChat(
        messages,
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      const baseIndex = systemPrompt.indexOf('あなたは親切です。');
      const lengthIndex = systemPrompt.indexOf(
        `within approximately ${MAX_TOKENS_BY_LENGTH.short} tokens`,
      );

      expect(baseIndex).toBeGreaterThanOrEqual(0);
      expect(lengthIndex).toBeGreaterThan(baseIndex);
      expect(createCall.initialPrompts.slice(1)).toEqual([
        { role: 'user', content: '最初の質問' },
        { role: 'assistant', content: '最初の回答' },
      ]);
    });

    it('should not inject a token budget when responseLength is unset', async () => {
      mockPrompt.mockResolvedValue('通常回答');

      const service = new GeminiNanoChatService();

      await service.processChat(
        [
          { role: 'system', content: 'あなたは親切です。' },
          { role: 'user', content: '要約して' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      expect(systemPrompt).toBe('あなたは親切です。');
      expect(systemPrompt).not.toMatch(/within approximately \d+ tokens/);
    });
  });
});
