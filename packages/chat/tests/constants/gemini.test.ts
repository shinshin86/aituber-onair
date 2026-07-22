import { describe, expect, it } from 'vitest';
import {
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_3_1_PRO_PREVIEW,
  MODEL_GEMINI_3_5_FLASH_LITE,
  MODEL_GEMINI_3_6_FLASH,
  getDefaultGeminiReasoningEffort,
  getGeminiSupportedReasoningEfforts,
  isGeminiReasoningEffortModel,
  normalizeGeminiReasoningEffort,
} from '../../src/constants';

describe('Gemini reasoning effort helpers', () => {
  it.each([MODEL_GEMINI_3_6_FLASH, MODEL_GEMINI_3_5_FLASH_LITE])(
    'supports all Gemini Flash thinking levels for %s',
    (model) => {
      expect(getGeminiSupportedReasoningEfforts(model)).toEqual([
        'minimal',
        'low',
        'medium',
        'high',
      ]);
      expect(getDefaultGeminiReasoningEffort(model)).toBe('minimal');
    },
  );

  it('uses low as the minimum supported Gemini Pro effort', () => {
    expect(
      getGeminiSupportedReasoningEfforts(MODEL_GEMINI_3_1_PRO_PREVIEW),
    ).toEqual(['low', 'medium', 'high']);
    expect(
      normalizeGeminiReasoningEffort(MODEL_GEMINI_3_1_PRO_PREVIEW, 'minimal'),
    ).toBe('low');
  });

  it('does not expose thinkingLevel controls for Gemini 2.5', () => {
    expect(isGeminiReasoningEffortModel(MODEL_GEMINI_2_5_FLASH)).toBe(false);
    expect(getGeminiSupportedReasoningEfforts(MODEL_GEMINI_2_5_FLASH)).toEqual(
      [],
    );
    expect(
      normalizeGeminiReasoningEffort(MODEL_GEMINI_2_5_FLASH, 'high'),
    ).toBeUndefined();
  });
});
