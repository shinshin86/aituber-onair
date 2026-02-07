import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createSummaryContext,
  summarizeWithFallback,
} from '../../../../src/services/chat/providers/summarizerUtils';

describe('summarizerUtils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSummaryContext', () => {
    it('uses default template when custom prompt is not provided', () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = createSummaryContext(
        messages,
        120,
        'Summarize within {maxLength} chars.',
      );

      expect(result.systemPrompt).toBe('Summarize within 120 chars.');
      expect(result.conversationText).toBe('user: Hello');
    });

    it('uses custom prompt when provided', () => {
      const messages = [{ role: 'assistant' as const, content: 'Hi' }];
      const result = createSummaryContext(
        messages,
        42,
        'Default {maxLength}',
        'Custom {maxLength} chars',
      );

      expect(result.systemPrompt).toBe('Custom 42 chars');
      expect(result.conversationText).toBe('assistant: Hi');
    });
  });

  describe('summarizeWithFallback', () => {
    it('returns summary result when summarize succeeds', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const summarize = vi.fn().mockResolvedValue('OK');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await summarizeWithFallback(messages, summarize);

      expect(result).toBe('OK');
      expect(summarize).toHaveBeenCalledTimes(1);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('returns fallback summary when summarize throws', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'a'.repeat(60),
        },
      ];
      const summarize = vi.fn().mockRejectedValue(new Error('boom'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await summarizeWithFallback(messages, summarize);

      expect(result).toBe(`1 messages. Latest topic: ${'a'.repeat(50)}...`);
      expect(summarize).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('returns fallback summary for empty messages', async () => {
      const summarize = vi.fn().mockRejectedValue(new Error('boom'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await summarizeWithFallback([], summarize);

      expect(result).toBe('0 messages. Latest topic: none...');
      expect(summarize).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
