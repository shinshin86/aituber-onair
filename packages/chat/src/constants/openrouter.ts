export const ENDPOINT_OPENROUTER_API =
  'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter models
export const MODEL_GPT_OSS_20B_FREE = 'openai/gpt-oss-20b:free';
export const MODEL_MOONSHOTAI_KIMI_K2_5 = 'moonshotai/kimi-k2.5';
export const MODEL_OPENAI_GPT_5_1_CHAT = 'openai/gpt-5.1-chat';
export const MODEL_OPENAI_GPT_5_1_CODEX = 'openai/gpt-5.1-codex';
export const MODEL_OPENAI_GPT_5_MINI = 'openai/gpt-5-mini';
export const MODEL_OPENAI_GPT_5_NANO = 'openai/gpt-5-nano';
export const MODEL_OPENAI_GPT_4O = 'openai/gpt-4o';
export const MODEL_OPENAI_GPT_4_1_MINI = 'openai/gpt-4.1-mini';
export const MODEL_OPENAI_GPT_4_1_NANO = 'openai/gpt-4.1-nano';
export const MODEL_ANTHROPIC_CLAUDE_OPUS_4 = 'anthropic/claude-opus-4';
export const MODEL_ANTHROPIC_CLAUDE_SONNET_4 = 'anthropic/claude-sonnet-4';
export const MODEL_ANTHROPIC_CLAUDE_3_7_SONNET = 'anthropic/claude-3.7-sonnet';
export const MODEL_ANTHROPIC_CLAUDE_3_5_SONNET = 'anthropic/claude-3.5-sonnet';
export const MODEL_ANTHROPIC_CLAUDE_4_5_HAIKU = 'anthropic/claude-haiku-4.5';
export const MODEL_GOOGLE_GEMINI_2_5_PRO = 'google/gemini-2.5-pro';
export const MODEL_GOOGLE_GEMINI_2_5_FLASH = 'google/gemini-2.5-flash';
export const MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025 =
  'google/gemini-2.5-flash-lite-preview-09-2025';
export const MODEL_ZAI_GLM_4_7_FLASH = 'z-ai/glm-4.7-flash';
export const MODEL_ZAI_GLM_4_5_AIR = 'z-ai/glm-4.5-air';
export const MODEL_ZAI_GLM_4_5_AIR_FREE = 'z-ai/glm-4.5-air:free';

// Free tier models
export const OPENROUTER_FREE_MODELS = [
  MODEL_GPT_OSS_20B_FREE,
  MODEL_ZAI_GLM_4_5_AIR_FREE,
];

// Vision supported models on OpenRouter
export const OPENROUTER_VISION_SUPPORTED_MODELS = [
  MODEL_OPENAI_GPT_5_1_CHAT,
  MODEL_OPENAI_GPT_5_1_CODEX,
  MODEL_OPENAI_GPT_5_MINI,
  MODEL_OPENAI_GPT_5_NANO,
  MODEL_OPENAI_GPT_4O,
  MODEL_OPENAI_GPT_4_1_MINI,
  MODEL_OPENAI_GPT_4_1_NANO,
  MODEL_ANTHROPIC_CLAUDE_OPUS_4,
  MODEL_ANTHROPIC_CLAUDE_SONNET_4,
  MODEL_ANTHROPIC_CLAUDE_3_7_SONNET,
  MODEL_ANTHROPIC_CLAUDE_4_5_HAIKU,
  MODEL_GOOGLE_GEMINI_2_5_PRO,
  MODEL_GOOGLE_GEMINI_2_5_FLASH,
  MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025,
  MODEL_MOONSHOTAI_KIMI_K2_5,
];

// Rate limits for free tier
export const OPENROUTER_FREE_RATE_LIMIT_PER_MINUTE = 20;
export const OPENROUTER_FREE_DAILY_LIMIT_LOW_CREDITS = 50;
export const OPENROUTER_FREE_DAILY_LIMIT_HIGH_CREDITS = 1000;
export const OPENROUTER_CREDITS_THRESHOLD = 10;

/**
 * Check if a model is a free tier model
 * @param model Model name to check
 * @returns True if the model is free tier
 */
export function isOpenRouterFreeModel(model: string): boolean {
  return OPENROUTER_FREE_MODELS.some((freeModel) => model.includes(freeModel));
}

/**
 * Check if a model supports vision on OpenRouter
 * @param model Model name to check
 * @returns True if the model supports vision
 */
export function isOpenRouterVisionModel(model: string): boolean {
  return OPENROUTER_VISION_SUPPORTED_MODELS.some((visionModel) =>
    model.includes(visionModel),
  );
}
