export const ENDPOINT_KIMI_CHAT_COMPLETIONS_API =
  'https://api.moonshot.ai/v1/chat/completions';

// Kimi models
export const MODEL_KIMI_K2_7_CODE = 'kimi-k2.7-code';
export const MODEL_KIMI_K2_7_CODE_HIGHSPEED = 'kimi-k2.7-code-highspeed';
export const MODEL_KIMI_K2_6 = 'kimi-k2.6';
export const MODEL_KIMI_K2_5 = 'kimi-k2.5';

// Vision support for models
export const KIMI_VISION_SUPPORTED_MODELS = [
  MODEL_KIMI_K2_7_CODE,
  MODEL_KIMI_K2_7_CODE_HIGHSPEED,
  MODEL_KIMI_K2_6,
  MODEL_KIMI_K2_5,
];

// Kimi K2.7 Code supports thinking mode only.
export const KIMI_THINKING_REQUIRED_MODELS = [
  MODEL_KIMI_K2_7_CODE,
  MODEL_KIMI_K2_7_CODE_HIGHSPEED,
];

/**
 * Check if a model supports vision capabilities
 */
export function isKimiVisionModel(model: string): boolean {
  return KIMI_VISION_SUPPORTED_MODELS.includes(model);
}

/**
 * Check if a model must keep thinking enabled
 */
export function isKimiThinkingRequiredModel(model: string): boolean {
  return KIMI_THINKING_REQUIRED_MODELS.includes(model);
}
