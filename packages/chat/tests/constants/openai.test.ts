import { describe, expect, it } from 'vitest';
import {
  MODEL_GPT_5,
  MODEL_GPT_5_1,
  MODEL_GPT_5_4,
  MODEL_GPT_5_4_MINI,
  MODEL_GPT_5_4_NANO,
  MODEL_GPT_5_4_PRO,
  MODEL_GPT_5_5,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5_NANO,
  getDefaultReasoningEffortForGPT5Model,
} from '../../src/constants/openai';

describe('getDefaultReasoningEffortForGPT5Model', () => {
  it('returns none for all models that support reasoning_effort none', () => {
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_1)).toBe('none');
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_4)).toBe('none');
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_5)).toBe('none');
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_4_MINI)).toBe(
      'none',
    );
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_4_NANO)).toBe(
      'none',
    );
  });

  it('returns minimal for models that support reasoning_effort minimal', () => {
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5)).toBe('minimal');
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_MINI)).toBe(
      'minimal',
    );
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_NANO)).toBe(
      'minimal',
    );
  });

  it('returns medium for models whose lowest supported reasoning effort is medium', () => {
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_4_PRO)).toBe(
      'medium',
    );
  });
});
