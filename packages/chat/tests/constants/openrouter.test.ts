import { describe, expect, it } from 'vitest';
import { isOpenRouterFreeModel } from '../../src/constants/openrouter';

describe('isOpenRouterFreeModel', () => {
  it('returns true for model IDs ending with :free', () => {
    expect(isOpenRouterFreeModel('openai/gpt-oss-20b:free')).toBe(true);
    expect(isOpenRouterFreeModel('z-ai/glm-4.5-air:free')).toBe(true);
  });

  it('returns true for model IDs with leading/trailing spaces', () => {
    expect(isOpenRouterFreeModel('  openai/gpt-oss-20b:free  ')).toBe(true);
  });

  it('returns false for non-free model IDs', () => {
    expect(isOpenRouterFreeModel('openai/gpt-4o')).toBe(false);
    expect(isOpenRouterFreeModel('openai/gpt-oss-20b:free-preview')).toBe(
      false,
    );
  });
});
