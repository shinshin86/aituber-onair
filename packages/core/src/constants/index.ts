/**
 * Constants for AITuber OnAir Core
 */
export const ENDPOINT_OPENAI_CHAT_COMPLETIONS_API =
  'https://api.openai.com/v1/chat/completions';
export const ENDPOINT_YOUTUBE_API = 'https://youtube.googleapis.com/youtube/v3';
export const VOICE_VOX_API_URL = 'http://localhost:50021';
export const VOICEPEAK_API_URL = 'http://localhost:20202';
export const AIVIS_SPEECH_API_URL = 'http://localhost:10101';
export const NIJI_VOICE_API_URL = 'https://api.nijivoice.com/api/platform/v1';

// gpt model
export const MODEL_GPT_4O_MINI = 'gpt-4o-mini';

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
