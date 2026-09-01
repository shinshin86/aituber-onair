import { describe, expect, it } from 'vitest';
import {
  MODEL_ANTHROPIC_CLAUDE_SONNET_5,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
  MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813,
  MODEL_QWEN_QWEN_3_8_FLASH,
  MODEL_ZAI_GLM_5_3,
  MODEL_ZAI_GLM_5_3_FLASH,
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

  it('uses and normalizes the documented DeepSeek V4 Pro efforts', () => {
    expect(
      getOpenRouterSupportedReasoningEfforts(
        MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813,
      ),
    ).toEqual(['none', 'high', 'xhigh']);
    expect(
      getDefaultOpenRouterReasoningEffort(
        MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813,
      ),
    ).toBe('none');
    expect(
      normalizeOpenRouterReasoningEffort(
        MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813,
        'medium',
      ),
    ).toBe('high');
    expect(
      normalizeOpenRouterReasoningEffort(
        MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813,
        'max',
      ),
    ).toBe('xhigh');
  });

  it('defaults optional recent reasoning models to none', () => {
    expect(
      getDefaultOpenRouterReasoningEffort(
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP,
      ),
    ).toBe('none');
    expect(getDefaultOpenRouterReasoningEffort(MODEL_QWEN_QWEN_3_8_FLASH)).toBe(
      'none',
    );
    expect(
      getDefaultOpenRouterReasoningEffort(MODEL_ANTHROPIC_CLAUDE_SONNET_5),
    ).toBe('none');
  });

  it('uses low as the minimum effort for mandatory GLM-5.3 reasoning', () => {
    for (const model of [MODEL_ZAI_GLM_5_3, MODEL_ZAI_GLM_5_3_FLASH]) {
      expect(getOpenRouterSupportedReasoningEfforts(model)).toEqual([
        'low',
        'high',
        'max',
      ]);
      expect(getDefaultOpenRouterReasoningEffort(model)).toBe('low');
      expect(normalizeOpenRouterReasoningEffort(model, 'none')).toBe('low');
      expect(normalizeOpenRouterReasoningEffort(model, 'xhigh')).toBe('max');
    }
  });
});
