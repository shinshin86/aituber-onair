export const CHAT_RESPONSE_LENGTH = {
  VERY_SHORT: 'veryShort',
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
  VERY_LONG: 'veryLong',
} as const;

export const MAX_TOKENS_BY_LENGTH = {
  [CHAT_RESPONSE_LENGTH.VERY_SHORT]: 40,
  [CHAT_RESPONSE_LENGTH.SHORT]: 100,
  [CHAT_RESPONSE_LENGTH.MEDIUM]: 200,
  [CHAT_RESPONSE_LENGTH.LONG]: 300,
  [CHAT_RESPONSE_LENGTH.VERY_LONG]: 1000,
} as const;

/**
 * Default max tokens for AI providers when not specified
 */
export const DEFAULT_MAX_TOKENS = 1000;

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
