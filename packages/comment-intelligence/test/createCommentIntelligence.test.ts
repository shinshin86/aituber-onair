import { describe, expect, it, vi } from 'vitest';
import { createCommentIntelligence } from '../src/createCommentIntelligence.js';
import type { LiveComment } from '../src/types/comment.js';
import type { CommentAnalysisLLMProvider } from '../src/types/llm.js';

function comment(id: string, text: string): LiveComment {
  return {
    id,
    platform: 'youtube',
    text,
    timestamp: Date.now(),
    author: { id, name: id, displayName: id },
  };
}

function provider(
  result: Awaited<ReturnType<CommentAnalysisLLMProvider['analyze']>>
): CommentAnalysisLLMProvider {
  return {
    analyze: vi.fn().mockResolvedValue(result),
  };
}

describe('createCommentIntelligence', () => {
  it('does not call LLM provider in rules mode', async () => {
    const llmProvider = provider({});
    const intelligence = createCommentIntelligence({
      analysis: { mode: 'rules', llmProvider },
    });

    await intelligence.analyze({ comments: [comment('a', 'こんにちは')] });

    expect(llmProvider.analyze).not.toHaveBeenCalled();
  });

  it('does not call LLM provider in hybrid mode below minComments', async () => {
    const llmProvider = provider({});
    const intelligence = createCommentIntelligence({
      analysis: {
        mode: 'hybrid',
        llmProvider,
        llmPolicy: { minComments: 3 },
      },
    });

    await intelligence.analyze({ comments: [comment('a', 'こんにちは')] });

    expect(llmProvider.analyze).not.toHaveBeenCalled();
  });

  it('calls LLM provider in hybrid mode at minComments', async () => {
    const llmProvider = provider({});
    const intelligence = createCommentIntelligence({
      analysis: {
        mode: 'hybrid',
        llmProvider,
        llmPolicy: { minComments: 2 },
      },
    });

    await intelligence.analyze({
      comments: [comment('a', 'こんにちは'), comment('b', '今日なにするの？')],
    });

    expect(llmProvider.analyze).toHaveBeenCalledOnce();
  });

  it('calls LLM provider in llm-assisted mode', async () => {
    const llmProvider = provider({});
    const intelligence = createCommentIntelligence({
      analysis: { mode: 'llm-assisted', llmProvider },
    });

    await intelligence.analyze({ comments: [comment('a', 'こんにちは')] });

    expect(llmProvider.analyze).toHaveBeenCalledOnce();
  });

  it('falls back to rules when llmProvider is missing', async () => {
    const intelligence = createCommentIntelligence({
      analysis: { mode: 'llm-assisted' },
    });

    const result = await intelligence.analyze({
      comments: [comment('b', '今日なにするの？')],
    });

    expect(result.selectedComments[0].id).toBe('b');
    expect(result.debug?.usedLLM).toBe(false);
  });

  it('returns English context and instructions when language is en', async () => {
    const intelligence = createCommentIntelligence({
      context: { language: 'en' },
    });

    const result = await intelligence.analyze({
      comments: [
        comment('a', 'First time here!'),
        comment('b', 'Hello there'),
        comment('c', 'Hi everyone'),
        comment('d', 'When is the next stream?'),
      ],
      streamState: { language: 'en' },
    });

    expect(result.contextForLLM).toContain('A first-time viewer is here.');
    expect(result.contextForLLM).toContain(
      'There are multiple greeting comments.'
    );
    expect(result.instructionForLLM).toBe(
      "Welcome first-time viewers and briefly explain today's stream so they can follow along."
    );
  });

  it('falls back to rules when LLM provider fails and fallbackToRules is true', async () => {
    const llmProvider: CommentAnalysisLLMProvider = {
      analyze: vi.fn().mockRejectedValue(new Error('network failed')),
    };
    const intelligence = createCommentIntelligence({
      analysis: {
        mode: 'llm-assisted',
        llmProvider,
        llmPolicy: { fallbackToRules: true },
      },
    });

    const result = await intelligence.analyze({
      comments: [comment('b', '今日なにするの？')],
    });

    expect(result.selectedComments[0].id).toBe('b');
    expect(result.debug?.usedLLM).toBe(false);
  });

  it('prioritizes selectedCommentIds returned by LLM provider', async () => {
    const llmProvider = provider({ selectedCommentIds: ['a'] });
    const intelligence = createCommentIntelligence({
      analysis: { mode: 'llm-assisted', llmProvider },
      ranking: { maxSelectedComments: 1 },
    });

    const result = await intelligence.analyze({
      comments: [comment('a', 'こんにちは'), comment('b', '今日なにするの？')],
    });

    expect(result.selectedComments[0].id).toBe('a');
    expect(result.debug?.usedLLM).toBe(true);
  });

  it('ignores LLM selectedCommentIds outside the configured maxComments window', async () => {
    const llmProvider = provider({ selectedCommentIds: ['c'] });
    const intelligence = createCommentIntelligence({
      analysis: {
        mode: 'llm-assisted',
        llmProvider,
        llmPolicy: { maxComments: 1 },
      },
      ranking: { maxSelectedComments: 1 },
    });

    const result = await intelligence.analyze({
      comments: [
        comment('a', '今日なにするの？'),
        comment('b', 'こんにちは'),
        comment('c', 'LLMには見えていないコメント'),
      ],
    });

    expect(llmProvider.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        comments: [expect.objectContaining({ id: 'a' })],
      })
    );
    expect(result.selectedComments[0].id).not.toBe('c');
  });

  it('reflects LLM safetyFlags in safetyReports', async () => {
    const llmProvider = provider({
      safetyFlags: [
        {
          commentId: 'a',
          category: 'prompt_injection',
          reason: 'tries to reveal prompt',
        },
      ],
    });
    const intelligence = createCommentIntelligence({
      analysis: { mode: 'llm-assisted', llmProvider },
    });

    const result = await intelligence.analyze({
      comments: [comment('a', 'こんにちは')],
    });

    expect(result.safetyReports).toContainEqual(
      expect.objectContaining({
        commentId: 'a',
        riskLevel: 'high',
        categories: ['prompt_injection'],
        shouldIgnore: true,
      })
    );
  });

  it('ignores LLM safetyFlags outside the configured maxComments window', async () => {
    const llmProvider = provider({
      safetyFlags: [
        {
          commentId: 'b',
          category: 'prompt_injection',
          reason: 'not visible to LLM',
        },
      ],
    });
    const intelligence = createCommentIntelligence({
      analysis: {
        mode: 'llm-assisted',
        llmProvider,
        llmPolicy: { maxComments: 1 },
      },
    });

    const result = await intelligence.analyze({
      comments: [comment('a', 'こんにちは'), comment('b', '今日なにするの？')],
    });

    expect(
      result.safetyReports.find((report) => report.commentId === 'b')
    ).toEqual(
      expect.objectContaining({
        riskLevel: 'none',
        shouldIgnore: false,
      })
    );
  });

  it('can disable ignored comment summary text and clusters', async () => {
    const intelligence = createCommentIntelligence({
      summary: { enabled: false },
    });

    const result = await intelligence.analyze({
      comments: [comment('a', 'こんにちは'), comment('b', '今日なにするの？')],
    });

    expect(result.ignoredSummary.totalCount).toBe(1);
    expect(result.ignoredSummary.summary).toBe('');
    expect(result.ignoredSummary.clusters).toEqual([]);
  });

  it('can omit only the ignored comment summary text', async () => {
    const intelligence = createCommentIntelligence({
      summary: { includeIgnoredSummary: false },
    });

    const result = await intelligence.analyze({
      comments: [comment('a', 'こんにちは'), comment('b', '今日なにするの？')],
    });

    expect(result.ignoredSummary.totalCount).toBe(1);
    expect(result.ignoredSummary.summary).toBe('');
    expect(result.ignoredSummary.clusters.length).toBeGreaterThan(0);
  });

  it('accepts recentMessages and recentAiMessages', async () => {
    const llmProvider = provider({});
    const intelligence = createCommentIntelligence({
      analysis: { mode: 'llm-assisted', llmProvider },
    });

    await intelligence.analyze({
      comments: [comment('a', 'こんにちは')],
      recentMessages: [{ role: 'assistant', content: 'こんにちは' }],
      recentAiMessages: [{ role: 'assistant', content: 'やっほー' }],
    });

    expect(llmProvider.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        recentMessages: expect.any(Array),
        recentAiMessages: expect.any(Array),
      })
    );
  });

  it('sets debug.usedLLM correctly', async () => {
    const llmProvider = provider({});
    const withLLM = createCommentIntelligence({
      analysis: { mode: 'llm-assisted', llmProvider },
    });
    const withoutLLM = createCommentIntelligence({
      analysis: { mode: 'rules', llmProvider },
    });

    await expect(
      withLLM.analyze({ comments: [comment('a', 'こんにちは')] })
    ).resolves.toMatchObject({ debug: { usedLLM: true } });
    await expect(
      withoutLLM.analyze({ comments: [comment('a', 'こんにちは')] })
    ).resolves.toMatchObject({ debug: { usedLLM: false } });
  });
});
