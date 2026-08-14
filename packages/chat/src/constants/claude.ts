export const ENDPOINT_CLAUDE_API = 'https://api.anthropic.com/v1/messages';

// claude model
export const MODEL_CLAUDE_3_HAIKU = 'claude-3-haiku-20240307';
export const MODEL_CLAUDE_3_5_HAIKU = 'claude-3-5-haiku-20241022';
export const MODEL_CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20241022';
export const MODEL_CLAUDE_3_7_SONNET = 'claude-3-7-sonnet-20250219';
export const MODEL_CLAUDE_4_SONNET = 'claude-sonnet-4-20250514';
export const MODEL_CLAUDE_4_OPUS = 'claude-opus-4-20250514';
export const MODEL_CLAUDE_4_5_SONNET = 'claude-sonnet-4-5-20250929';
export const MODEL_CLAUDE_4_5_HAIKU = 'claude-haiku-4-5-20251001';
export const MODEL_CLAUDE_4_5_OPUS = 'claude-opus-4-5-20251101';
export const MODEL_CLAUDE_4_6_SONNET = 'claude-sonnet-4-6';
export const MODEL_CLAUDE_4_6_OPUS = 'claude-opus-4-6';
export const MODEL_CLAUDE_4_7_OPUS = 'claude-opus-4-7';
export const MODEL_CLAUDE_4_8_OPUS = 'claude-opus-4-8';
export const MODEL_CLAUDE_5_FABLE = 'claude-fable-5';
export const MODEL_CLAUDE_5_SONNET = 'claude-sonnet-5';
export const MODEL_CLAUDE_5_OPUS = 'claude-opus-5';

// Retired model ids remain exported so existing imports continue to compile.
export const CLAUDE_DEPRECATED_MODELS = [
  MODEL_CLAUDE_3_HAIKU,
  MODEL_CLAUDE_3_5_HAIKU,
  MODEL_CLAUDE_3_5_SONNET,
  MODEL_CLAUDE_3_7_SONNET,
  MODEL_CLAUDE_4_SONNET,
  MODEL_CLAUDE_4_OPUS,
];

export type ClaudeReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const CLAUDE_STANDARD_REASONING_EFFORTS: readonly ClaudeReasoningEffort[] = [
  'low',
  'medium',
  'high',
];

const CLAUDE_MAX_REASONING_EFFORTS: readonly ClaudeReasoningEffort[] = [
  ...CLAUDE_STANDARD_REASONING_EFFORTS,
  'max',
];

const CLAUDE_XHIGH_REASONING_EFFORTS: readonly ClaudeReasoningEffort[] = [
  ...CLAUDE_STANDARD_REASONING_EFFORTS,
  'xhigh',
  'max',
];

const CLAUDE_REASONING_EFFORTS_BY_MODEL: Record<
  string,
  readonly ClaudeReasoningEffort[]
> = {
  [MODEL_CLAUDE_4_5_OPUS]: CLAUDE_STANDARD_REASONING_EFFORTS,
  [MODEL_CLAUDE_4_6_SONNET]: CLAUDE_MAX_REASONING_EFFORTS,
  [MODEL_CLAUDE_4_6_OPUS]: CLAUDE_MAX_REASONING_EFFORTS,
  [MODEL_CLAUDE_4_7_OPUS]: CLAUDE_XHIGH_REASONING_EFFORTS,
  [MODEL_CLAUDE_4_8_OPUS]: CLAUDE_XHIGH_REASONING_EFFORTS,
  [MODEL_CLAUDE_5_FABLE]: CLAUDE_XHIGH_REASONING_EFFORTS,
  [MODEL_CLAUDE_5_SONNET]: CLAUDE_XHIGH_REASONING_EFFORTS,
  [MODEL_CLAUDE_5_OPUS]: CLAUDE_XHIGH_REASONING_EFFORTS,
};

export const CLAUDE_VISION_SUPPORTED_MODELS = [
  MODEL_CLAUDE_4_5_SONNET,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_5_OPUS,
  MODEL_CLAUDE_4_6_SONNET,
  MODEL_CLAUDE_4_6_OPUS,
  MODEL_CLAUDE_4_7_OPUS,
  MODEL_CLAUDE_4_8_OPUS,
  MODEL_CLAUDE_5_FABLE,
  MODEL_CLAUDE_5_SONNET,
  MODEL_CLAUDE_5_OPUS,
];

/**
 * Return the effort values supported by a Claude model.
 */
export function getClaudeSupportedReasoningEfforts(
  model: string,
): readonly ClaudeReasoningEffort[] {
  return CLAUDE_REASONING_EFFORTS_BY_MODEL[model] ?? [];
}

export function isClaudeReasoningEffortModel(model: string): boolean {
  return getClaudeSupportedReasoningEfforts(model).length > 0;
}

/**
 * Claude API defaults to high effort when output_config.effort is omitted.
 */
export function getDefaultClaudeReasoningEffort(
  model: string,
): ClaudeReasoningEffort | undefined {
  return isClaudeReasoningEffortModel(model) ? 'high' : undefined;
}

/**
 * Normalize UI state when switching between Claude models.
 */
export function normalizeClaudeReasoningEffort(
  model: string,
  effort?: ClaudeReasoningEffort,
): ClaudeReasoningEffort | undefined {
  const supported = getClaudeSupportedReasoningEfforts(model);
  if (supported.length === 0) {
    return undefined;
  }

  if (!effort) {
    return getDefaultClaudeReasoningEffort(model);
  }

  if (supported.includes(effort)) {
    return effort;
  }

  return 'high';
}
