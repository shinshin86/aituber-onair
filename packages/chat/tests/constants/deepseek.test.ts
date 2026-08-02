import { describe, expect, it } from 'vitest';
import {
  MODEL_DEEPSEEK_V4_FLASH,
  MODEL_DEEPSEEK_V4_PRO,
  getDefaultDeepSeekReasoningEffort,
  getDeepSeekSupportedReasoningEfforts,
  normalizeDeepSeekReasoningEffort,
} from '../../src/constants/deepseek';

describe('DeepSeek reasoning effort helpers', () => {
  it('supports none, low, high, and max for V4 Flash', () => {
    expect(
      getDeepSeekSupportedReasoningEfforts(MODEL_DEEPSEEK_V4_FLASH),
    ).toEqual(['none', 'low', 'high', 'max']);
    expect(getDefaultDeepSeekReasoningEffort(MODEL_DEEPSEEK_V4_FLASH)).toBe(
      'none',
    );
  });

  it('does not expose low for V4 Pro because it maps to high', () => {
    expect(getDeepSeekSupportedReasoningEfforts(MODEL_DEEPSEEK_V4_PRO)).toEqual(
      ['none', 'high', 'max'],
    );
    expect(normalizeDeepSeekReasoningEffort(MODEL_DEEPSEEK_V4_PRO, 'low')).toBe(
      'high',
    );
  });

  it('does not add reasoning controls to unknown models', () => {
    expect(getDeepSeekSupportedReasoningEfforts('unknown-model')).toEqual([]);
    expect(
      normalizeDeepSeekReasoningEffort('unknown-model', 'high'),
    ).toBeUndefined();
  });
});
