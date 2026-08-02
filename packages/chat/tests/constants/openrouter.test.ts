import { describe, expect, it } from 'vitest';
import {
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
  getDefaultOpenRouterReasoningEffort,
  getOpenRouterSupportedReasoningEfforts,
  isOpenRouterFreeModel,
  normalizeOpenRouterReasoningEffort,
} from '../../src/constants/openrouter';

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

describe('OpenRouter reasoning effort helpers', () => {
  it('uses the documented efforts for unversioned DeepSeek V4 Flash', () => {
    expect(
      getOpenRouterSupportedReasoningEfforts(
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
      ),
    ).toEqual(['none', 'high', 'xhigh']);
    expect(
      getDefaultOpenRouterReasoningEffort(MODEL_OPENROUTER_DEEPSEEK_V4_FLASH),
    ).toBe('none');
  });

  it('uses the documented efforts for DeepSeek V4 Flash 0731', () => {
    expect(
      getOpenRouterSupportedReasoningEfforts(
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
      ),
    ).toEqual(['none', 'low', 'high', 'max']);
    expect(
      getDefaultOpenRouterReasoningEffort(
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
      ),
    ).toBe('none');
  });

  it('normalizes unsupported DeepSeek efforts toward responsive chat', () => {
    expect(
      normalizeOpenRouterReasoningEffort(
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
        'low',
      ),
    ).toBe('none');
    expect(
      normalizeOpenRouterReasoningEffort(
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
        'medium',
      ),
    ).toBe('low');
  });
});
