// chat response length
export const CHAT_RESPONSE_LENGTH = {
    VERY_SHORT: 'veryShort',
    SHORT: 'short',
    MEDIUM: 'medium',
    LONG: 'long',
  } as const;
  
  export const MAX_TOKENS_BY_LENGTH = {
    [CHAT_RESPONSE_LENGTH.VERY_SHORT]: 40,
    [CHAT_RESPONSE_LENGTH.SHORT]: 100,
    [CHAT_RESPONSE_LENGTH.MEDIUM]: 200,
    [CHAT_RESPONSE_LENGTH.LONG]: 300,
  } as const;
  
  export type ChatResponseLength =
    (typeof CHAT_RESPONSE_LENGTH)[keyof typeof CHAT_RESPONSE_LENGTH];