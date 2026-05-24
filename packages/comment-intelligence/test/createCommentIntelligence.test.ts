import { describe, expect, it, vi } from 'vitest';
import { createCommentIntelligence } from '../src/createCommentIntelligence';
import type { LiveComment } from '../src/types/comment';
import type { CommentAnalysisLLMProvider } from '../src/types/llm';

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
