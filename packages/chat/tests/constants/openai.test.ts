import { describe, expect, it } from 'vitest';
import {
  MODEL_GPT_5,
  MODEL_GPT_5_1,
  MODEL_GPT_5_4,
  MODEL_GPT_5_4_MINI,
  MODEL_GPT_5_4_NANO,
  MODEL_GPT_5_4_PRO,
  MODEL_GPT_5_5,
  MODEL_GPT_5_6,
  MODEL_GPT_5_6_LUNA,
  MODEL_GPT_5_6_SOL,
  MODEL_GPT_5_6_TERRA,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5_NANO,
  MODEL_GPT_6_LUNA,
  allowsReasoningNone,
  allowsReasoningXHigh,
  allowsReasoningMax,
  getDefaultReasoningEffortForOpenAIModel,
  getDefaultReasoningEffortForGPT5Model,
} from '../../src/constants/openai';

describe('getDefaultReasoningEffortForGPT5Model', () => {
  it('returns none for all models that support reasoning_effort none', () => {
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_1)).toBe('none');
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_4)).toBe('none');
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_5)).toBe('none');
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_6)).toBe('none');
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_6_SOL)).toBe(
      'none',
    );
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_6_TERRA)).toBe(
      'none',
    );
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_6_LUNA)).toBe(
      'none',
    );
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_4_MINI)).toBe(
      'none',
    );
    expect(getDefaultReasoningEffortForGPT5Model(MODEL_GPT_5_4_NANO)).toBe(
      'none',
    );
  });

  it('allows max reasoning only for GPT-5.6 family models', () => {
    expect(allowsReasoningMax(MODEL_GPT_5_6)).toBe(true);
    expect(allowsReasoningMax(MODEL_GPT_5_6_SOL)).toBe(true);
    expect(allowsReasoningMax(MODEL_GPT_5_6_TERRA)).toBe(true);
    expect(allowsReasoningMax(MODEL_GPT_5_6_LUNA)).toBe(true);
    expect(allowsReasoningMax(MODEL_GPT_5_5)).toBe(false);
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

describe('getDefaultReasoningEffortForOpenAIModel', () => {
  it('supports documented GPT-6 Luna effort levels and defaults to low', () => {
    expect(allowsReasoningNone(MODEL_GPT_6_LUNA)).toBe(true);
    expect(allowsReasoningXHigh(MODEL_GPT_6_LUNA)).toBe(true);
    expect(allowsReasoningMax(MODEL_GPT_6_LUNA)).toBe(true);
    expect(getDefaultReasoningEffortForOpenAIModel(MODEL_GPT_6_LUNA)).toBe(
      'low',
    );
  });
});
