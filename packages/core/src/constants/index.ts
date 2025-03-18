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

// API Endpoints
export const ENDPOINT_GEMINI_API = 'https://generativelanguage.googleapis.com/v1';

// gpt model
export const MODEL_GPT_4O_MINI = 'gpt-4o-mini';
export const MODEL_GPT_4O = 'gpt-4o';
export const MODEL_O3_MINI = 'o3-mini';

// gemini model
export const MODEL_GEMINI_2_0_FLASH = 'gemini-2.0-flash';
export const MODEL_GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite';
export const MODEL_GEMINI_1_5_FLASH = 'gemini-1.5-flash';

// Vision support for models
export const VISION_SUPPORTED_MODELS = [
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  // MODEL_O3_MINI is not included as it doesn't support vision
];

// Vision support for Gemini models
export const GEMINI_VISION_SUPPORTED_MODELS = [
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_2_0_FLASH_LITE,
  MODEL_GEMINI_1_5_FLASH,
];

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
