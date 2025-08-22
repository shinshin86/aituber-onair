export const ENDPOINT_OPENROUTER_API =
  'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter models
export const MODEL_GPT_OSS_20B_FREE = 'openai/gpt-oss-20b:free';

// Free tier models
export const OPENROUTER_FREE_MODELS = [MODEL_GPT_OSS_20B_FREE];

// Vision supported models on OpenRouter
export const OPENROUTER_VISION_SUPPORTED_MODELS = [];

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
