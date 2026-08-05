import { describe, expect, it } from 'vitest';
import {
  canCreatePostStreamReport,
  getRepeatedSoftwareQuestionCount,
  getUnansweredQuestionTopics,
} from './demoInsights';
import { COMMENTS } from './fixtures';

describe('demo insights', () => {
  it('groups repeated software questions into one unanswered topic', () => {
    expect(getUnansweredQuestionTopics(COMMENTS.slice(0, 1))).toEqual([]);
    expect(getUnansweredQuestionTopics(COMMENTS.slice(0, 2))).toMatchObject([
      { id: 'software' },
    ]);
    expect(getUnansweredQuestionTopics(COMMENTS.slice(0, 10))).toMatchObject([
      { id: 'software' },
    ]);
    expect(getRepeatedSoftwareQuestionCount(COMMENTS.slice(0, 10))).toBe(3);
  });

  it('surfaces only evidence-backed unanswered topics', () => {
    expect(getUnansweredQuestionTopics(COMMENTS.slice(0, 12))).toMatchObject([
      { id: 'software', important: false },
      { id: 'license', important: true },
    ]);
    expect(getUnansweredQuestionTopics(COMMENTS.slice(0, 13))).toMatchObject([
      { id: 'software' },
      { id: 'license' },
      { id: 'brush' },
    ]);
  });

  it('allows the fixed report only after the fixture is complete', () => {
    expect(canCreatePostStreamReport('monitoring', 15, 16)).toBe(false);
    expect(canCreatePostStreamReport('error', 16, 16)).toBe(false);
    expect(canCreatePostStreamReport('monitoring', 16, 16)).toBe(true);
    expect(canCreatePostStreamReport('paused', 16, 16)).toBe(true);
    expect(canCreatePostStreamReport('complete', 16, 16)).toBe(false);
  });
});
