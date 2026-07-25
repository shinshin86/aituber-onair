import { describe, expect, it } from 'vitest';
import {
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_5_OPUS,
  MODEL_CLAUDE_4_6_OPUS,
  MODEL_CLAUDE_4_7_OPUS,
  MODEL_CLAUDE_5_OPUS,
  MODEL_CLAUDE_5_SONNET,
  getClaudeSupportedReasoningEfforts,
  getDefaultClaudeReasoningEffort,
  isClaudeReasoningEffortModel,
  normalizeClaudeReasoningEffort,
} from '../../src/constants';

describe('Claude reasoning effort helpers', () => {
  it.each([MODEL_CLAUDE_4_7_OPUS, MODEL_CLAUDE_5_SONNET, MODEL_CLAUDE_5_OPUS])(
    'supports all five effort levels for %s',
    (model) => {
      expect(getClaudeSupportedReasoningEfforts(model)).toEqual([
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
      ]);
      expect(getDefaultClaudeReasoningEffort(model)).toBe('high');
    },
  );

  it('excludes xhigh from Claude Opus 4.6', () => {
    expect(getClaudeSupportedReasoningEfforts(MODEL_CLAUDE_4_6_OPUS)).toEqual([
      'low',
      'medium',
      'high',
      'max',
    ]);
    expect(normalizeClaudeReasoningEffort(MODEL_CLAUDE_4_6_OPUS, 'xhigh')).toBe(
      'high',
    );
  });

  it('limits Claude Opus 4.5 to low, medium, and high', () => {
    expect(getClaudeSupportedReasoningEfforts(MODEL_CLAUDE_4_5_OPUS)).toEqual([
      'low',
      'medium',
      'high',
    ]);
  });

  it('does not expose effort controls for unsupported Claude models', () => {
    expect(isClaudeReasoningEffortModel(MODEL_CLAUDE_4_5_HAIKU)).toBe(false);
    expect(getClaudeSupportedReasoningEfforts(MODEL_CLAUDE_4_5_HAIKU)).toEqual(
      [],
    );
    expect(
      normalizeClaudeReasoningEffort(MODEL_CLAUDE_4_5_HAIKU, 'low'),
    ).toBeUndefined();
  });
});
