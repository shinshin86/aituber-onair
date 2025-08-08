export const CHAT_RESPONSE_LENGTH = {
  VERY_SHORT: 'veryShort',
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
  VERY_LONG: 'veryLong',
  // Reasoning-aware response lengths (for GPT-5 models)
  REASONING_SHORT: 'reasoningShort',
  REASONING_MEDIUM: 'reasoningMedium',
  REASONING_LONG: 'reasoningLong',
  REASONING_DEEP: 'reasoningDeep',
} as const;

export const MAX_TOKENS_BY_LENGTH = {
  [CHAT_RESPONSE_LENGTH.VERY_SHORT]: 40,
  [CHAT_RESPONSE_LENGTH.SHORT]: 100,
  [CHAT_RESPONSE_LENGTH.MEDIUM]: 200,
  [CHAT_RESPONSE_LENGTH.LONG]: 300,
  [CHAT_RESPONSE_LENGTH.VERY_LONG]: 1000,
  // Reasoning-aware response lengths (reasoning + output tokens)
  [CHAT_RESPONSE_LENGTH.REASONING_SHORT]: 800, // ~500 reasoning + 300 output
  [CHAT_RESPONSE_LENGTH.REASONING_MEDIUM]: 1500, // ~1000 reasoning + 500 output
  [CHAT_RESPONSE_LENGTH.REASONING_LONG]: 3000, // ~2000 reasoning + 1000 output
  [CHAT_RESPONSE_LENGTH.REASONING_DEEP]: 5000, // ~3500 reasoning + 1500 output
} as const;

/**
 * Default max tokens for AI providers when not specified
 */
export const DEFAULT_MAX_TOKENS = 1000;

/**
 * GPT-5 reasoning and verbosity presets (response length is set separately)
 */
export const GPT5_PRESETS = {
  casual: {
    reasoning_effort: 'minimal' as const,
    verbosity: 'low' as const,
    description:
      'Fast responses for casual chat, quick questions (GPT-4 like experience)',
  },
  balanced: {
    reasoning_effort: 'medium' as const,
    verbosity: 'medium' as const,
    description:
      'Balanced reasoning for business tasks, learning, general problem solving',
  },
  expert: {
    reasoning_effort: 'high' as const,
    verbosity: 'high' as const,
    description:
      'Deep reasoning for research, complex analysis, expert-level tasks',
  },
} as const;

export type GPT5PresetKey = keyof typeof GPT5_PRESETS;

export type ChatResponseLength =
  (typeof CHAT_RESPONSE_LENGTH)[keyof typeof CHAT_RESPONSE_LENGTH];

/**
 * Standard to reasoning response length mapping for GPT-5 auto-optimization
 */
export const STANDARD_TO_REASONING_MAP = {
  [CHAT_RESPONSE_LENGTH.VERY_SHORT]: CHAT_RESPONSE_LENGTH.REASONING_SHORT,
  [CHAT_RESPONSE_LENGTH.SHORT]: CHAT_RESPONSE_LENGTH.REASONING_SHORT,
  [CHAT_RESPONSE_LENGTH.MEDIUM]: CHAT_RESPONSE_LENGTH.REASONING_MEDIUM,
  [CHAT_RESPONSE_LENGTH.LONG]: CHAT_RESPONSE_LENGTH.REASONING_LONG,
  [CHAT_RESPONSE_LENGTH.VERY_LONG]: CHAT_RESPONSE_LENGTH.REASONING_DEEP,
} as const;

/**
 * Check if a response length is a standard (non-reasoning) type
 * @param responseLength - The response length to check
 * @returns True if it's a standard response length
 */
export function isStandardResponseLength(
  responseLength?: ChatResponseLength,
): boolean {
  if (!responseLength) return false;
  return responseLength in STANDARD_TO_REASONING_MAP;
}

/**
 * Check if a response length is a reasoning-aware type
 * @param responseLength - The response length to check
 * @returns True if it's a reasoning response length
 */
export function isReasoningResponseLength(
  responseLength?: ChatResponseLength,
): boolean {
  if (!responseLength) return false;
  return responseLength.startsWith('reasoning');
}

/**
 * Map standard response length to reasoning equivalent for GPT-5 optimization
 * @param responseLength - The standard response length
 * @returns Corresponding reasoning response length
 */
export function mapToReasoningLength(
  responseLength: ChatResponseLength,
): ChatResponseLength {
  return (
    STANDARD_TO_REASONING_MAP[
      responseLength as keyof typeof STANDARD_TO_REASONING_MAP
    ] ?? responseLength
  );
}

/**
 * Converts a ChatResponseLength to the corresponding max_tokens value
 * @param responseLength - The response length setting
 * @returns The max_tokens value, or DEFAULT_MAX_TOKENS if responseLength is not provided
 */
export function getMaxTokensForResponseLength(
  responseLength?: ChatResponseLength,
): number {
  if (!responseLength) {
    return DEFAULT_MAX_TOKENS;
  }
  return MAX_TOKENS_BY_LENGTH[responseLength] ?? DEFAULT_MAX_TOKENS;
}
