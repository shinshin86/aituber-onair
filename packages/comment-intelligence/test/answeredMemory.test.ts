import { describe, expect, it, vi } from 'vitest';
import { createCommentIntelligence } from '../src/createCommentIntelligence.js';
import type { LiveComment } from '../src/types/comment.js';

function comment(
  id: string,
  authorId: string,
  text: string,
  timestamp = Date.now()
): LiveComment {
  return {
    id,
    platform: 'youtube',
    text,
    timestamp,
    author: {
      id: authorId,
      name: authorId,
      displayName: authorId,
    },
  };
}

describe('answered memory', () => {
  it('deprioritizes a marked answered comment in later analyses', async () => {
    const intelligence = createCommentIntelligence({
      ranking: {
        answeredMemory: {
          enabled: true,
          mode: 'deprioritize',
        },
      },
    });
    intelligence.markAnswered('answered', { authorId: 'viewer-1' });

    const result = await intelligence.analyze({
      comments: [
        comment('answered', 'viewer-1', '今日なにするの？', 1),
        comment('fresh', 'viewer-2', 'どうやるの？', 1),
      ],
    });

    expect(result.selectedComments[0].id).toBe('fresh');
    expect(result.answeredCommentIds).toEqual(['answered']);
    expect(
      result.rankedComments.find((ranked) => ranked.id === 'answered')?.reasons
    ).toContain('ignored_recently');
  });

  it('accepts per-call answered comment ids without storing them', async () => {
    const intelligence = createCommentIntelligence();

    const result = await intelligence.analyze({
      comments: [
        comment('answered', 'viewer-1', '今日なにするの？', 1),
        comment('fresh', 'viewer-2', 'どうやるの？', 1),
      ],
      answeredCommentIds: ['answered'],
    });

    expect(result.selectedComments[0].id).toBe('fresh');
    expect(result.answeredCommentIds).toEqual(['answered']);
    expect(intelligence.listAnsweredStates()).toEqual([]);
  });

  it('accepts per-call answered viewer ids', async () => {
    const intelligence = createCommentIntelligence();

    const result = await intelligence.analyze({
      comments: [
        comment('same-viewer', 'viewer-1', '今日なにするの？', 1),
        comment('other-viewer', 'viewer-2', 'どうやるの？', 1),
      ],
      answeredViewerIds: ['viewer-1'],
    });

    expect(result.selectedComments[0].id).toBe('other-viewer');
    expect(result.answeredCommentIds).toEqual(['same-viewer']);
    expect(
      result.rankedComments.find((ranked) => ranked.id === 'same-viewer')
        ?.reasons
    ).toContain('ignored_recently');
  });

  it('excludes answered comments from selection when configured', async () => {
    const intelligence = createCommentIntelligence({
      ranking: {
        answeredMemory: {
          enabled: true,
          mode: 'exclude',
        },
      },
    });
    intelligence.markAnswered('answered');

    const result = await intelligence.analyze({
      comments: [
        comment('answered', 'viewer-1', '今日なにするの？', 1),
        comment('fallback', 'viewer-2', 'こんにちは', 1),
      ],
    });

    expect(result.rankedComments.map((ranked) => ranked.id)).toContain(
      'answered'
    );
    expect(
      result.selectedComments.map((selected) => selected.id)
    ).not.toContain('answered');
  });

  it('dedupes later comments by viewer when configured', async () => {
    const intelligence = createCommentIntelligence({
      ranking: {
        answeredMemory: {
          enabled: true,
          mode: 'deprioritize',
          dedupeByViewer: true,
        },
      },
    });
    intelligence.markAnswered('old-comment', { authorId: 'viewer-1' });

    const result = await intelligence.analyze({
      comments: [
        comment('same-viewer', 'viewer-1', '今日なにするの？', 1),
        comment('other-viewer', 'viewer-2', 'どうやるの？', 1),
      ],
    });

    expect(result.selectedComments[0].id).toBe('other-viewer');
    expect(result.answeredCommentIds).toEqual(['same-viewer']);
  });

  it('allows answered comments again after ttl expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T10:00:00.000Z'));

    const intelligence = createCommentIntelligence({
      ranking: {
        answeredMemory: {
          enabled: true,
          ttlMs: 1000,
          mode: 'deprioritize',
        },
      },
    });
    intelligence.markAnswered('answered', { at: Date.now() });

    vi.setSystemTime(new Date('2026-05-24T10:00:02.000Z'));
    const result = await intelligence.analyze({
      comments: [
        comment('answered', 'viewer-1', '今日なにするの？', Date.now()),
      ],
    });

    expect(result.selectedComments[0].id).toBe('answered');
    expect(result.answeredCommentIds).toEqual([]);
    expect(intelligence.getAnsweredState('answered')).toBeUndefined();
    vi.useRealTimers();
  });

  it('does not apply answered memory when disabled', async () => {
    const intelligence = createCommentIntelligence({
      ranking: {
        answeredMemory: {
          enabled: false,
          mode: 'exclude',
        },
      },
    });
    intelligence.markAnswered('answered');

    const result = await intelligence.analyze({
      comments: [comment('answered', 'viewer-1', '今日なにするの？', 1)],
      answeredCommentIds: ['answered'],
      answeredViewerIds: ['viewer-1'],
    });

    expect(result.selectedComments[0].id).toBe('answered');
    expect(result.answeredCommentIds).toEqual([]);
    expect(result.rankedComments[0].reasons).not.toContain('ignored_recently');
  });

  it('exposes and clears answered state', () => {
    const intelligence = createCommentIntelligence();

    intelligence.markAnswered(['a', 'b'], { authorId: 'viewer', at: 123 });

    expect(intelligence.getAnsweredState('a')).toEqual({
      commentId: 'a',
      authorId: 'viewer',
      answeredAt: 123,
    });
    expect(intelligence.listAnsweredStates()).toHaveLength(2);

    intelligence.clearAnswered('a');
    expect(intelligence.getAnsweredState('a')).toBeUndefined();
    expect(intelligence.listAnsweredStates()).toHaveLength(1);

    intelligence.clearAnswered();
    expect(intelligence.listAnsweredStates()).toEqual([]);
  });
});
