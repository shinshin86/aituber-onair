import { describe, expect, it } from 'vitest';
import {
  MODEL_GLM_5_1,
  MODEL_GLM_5_2,
  getDefaultZaiReasoningEffort,
  getZaiSupportedReasoningEfforts,
  isZaiReasoningEffortModel,
  normalizeZaiReasoningEffort,
} from '../../src/constants/zai';

describe('Z.ai reasoning effort helpers', () => {
  it('exposes the documented GLM-5.2 protocol values', () => {
    expect(getZaiSupportedReasoningEfforts(MODEL_GLM_5_2)).toEqual([
      'none',
      'minimal',
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
    expect(isZaiReasoningEffortModel(MODEL_GLM_5_2)).toBe(true);
    expect(getDefaultZaiReasoningEffort(MODEL_GLM_5_2)).toBe('none');
  });

  it('does not expose effort for other Z.ai models', () => {
    expect(getZaiSupportedReasoningEfforts(MODEL_GLM_5_1)).toEqual([]);
    expect(isZaiReasoningEffortModel(MODEL_GLM_5_1)).toBe(false);
    expect(getDefaultZaiReasoningEffort(MODEL_GLM_5_1)).toBeUndefined();
  });

  it('normalizes protocol values to the effective GLM-5.2 tiers', () => {
    expect(normalizeZaiReasoningEffort(MODEL_GLM_5_2, 'minimal')).toBe('none');
    expect(normalizeZaiReasoningEffort(MODEL_GLM_5_2, 'low')).toBe('high');
    expect(normalizeZaiReasoningEffort(MODEL_GLM_5_2, 'medium')).toBe('high');
    expect(normalizeZaiReasoningEffort(MODEL_GLM_5_2, 'xhigh')).toBe('max');
  });
});
