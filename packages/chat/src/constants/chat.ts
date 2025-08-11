export const CHAT_RESPONSE_LENGTH = {
  VERY_SHORT: 'veryShort',
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
  VERY_LONG: 'veryLong',
  // Extended response length for longer outputs
  DEEP: 'deep',
} as const;

export const MAX_TOKENS_BY_LENGTH = {
  [CHAT_RESPONSE_LENGTH.VERY_SHORT]: 40,
  [CHAT_RESPONSE_LENGTH.SHORT]: 100,
  [CHAT_RESPONSE_LENGTH.MEDIUM]: 200,
  [CHAT_RESPONSE_LENGTH.LONG]: 300,
  [CHAT_RESPONSE_LENGTH.VERY_LONG]: 1000,
  // Extended response length for longer outputs
  [CHAT_RESPONSE_LENGTH.DEEP]: 5000,
} as const;

/**
 * Default max tokens for AI providers when not specified
 */
export const DEFAULT_MAX_TOKENS = 5000;

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
