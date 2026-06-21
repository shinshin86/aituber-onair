import { describe, expect, it, vi } from 'vitest';
import { parseComments } from '../examples/live-comment-filter-sample/src/parseComments.js';
import { createCommentIntelligence } from '../src/createCommentIntelligence.js';
import type { CommentAnalysisLLMProvider } from '../src/types/llm.js';

function provider(
  result: Awaited<ReturnType<CommentAnalysisLLMProvider['analyze']>>
): CommentAnalysisLLMProvider {
  return {
    analyze: vi.fn().mockResolvedValue(result),
  };
}

describe('live comment filter sample parseComments', () => {
  it('assigns short stable example IDs', () => {
    const comments = parseComments(
      '視聴者A: こんにちは\n視聴者B: やあ',
      'ja',
      1000
    );

    expect(comments.map((comment) => comment.id)).toEqual([
      'example:0',
      'example:1',
    ]);
    for (const comment of comments) {
      expect(comment.id).toMatch(/^example:\d+$/);
    }
  });

  it('keeps parsed IDs unique and free of verbose author or text segments', () => {
    const comments = parseComments(
      'Viewer A: hello\nViewer B: hi\nViewer C: food after stream?',
      'en',
      1000
    );
    const ids = comments.map((comment) => comment.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.split(':')).toHaveLength(2);
      expect(id).toMatch(/^example:\d+$/);
    }
  });

  it('round-trips sample IDs returned exactly by an LLM provider', async () => {
    const comments = parseComments(
      'Viewer A: hello\nViewer B: food after stream?',
      'en',
      1000
    );
    const llmProvider = provider({ selectedCommentIds: [comments[1].id] });
    const intelligence = createCommentIntelligence({
      analysis: { mode: 'llm-assisted', llmProvider },
      ranking: { maxSelectedComments: 1, minScore: 0 },
    });

    const result = await intelligence.analyze({ comments });

    expect(result.selectedComments.map((comment) => comment.id)).toContain(
      comments[1].id
    );
    expect(result.debug?.llmUnmatchedIds).toEqual([]);
  });
});
