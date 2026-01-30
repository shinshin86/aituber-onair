export const ENDPOINT_KIMI_CHAT_COMPLETIONS_API =
  'https://api.moonshot.ai/v1/chat/completions';

// Kimi models
export const MODEL_KIMI_K2_5 = 'kimi-k2.5';

// Vision support for models
export const KIMI_VISION_SUPPORTED_MODELS = [MODEL_KIMI_K2_5];

/**
 * Check if a model supports vision capabilities
 */
export function isKimiVisionModel(model: string): boolean {
  return KIMI_VISION_SUPPORTED_MODELS.includes(model);
}
