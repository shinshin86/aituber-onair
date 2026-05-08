export const ENDPOINT_XAI_CHAT_COMPLETIONS_API =
  'https://api.x.ai/v1/chat/completions';

// xAI Grok models
export const MODEL_GROK_4_3 = 'grok-4.3';
export const MODEL_GROK_4_20_REASONING = 'grok-4.20-0309-reasoning';
export const MODEL_GROK_4_20_NON_REASONING = 'grok-4.20-0309-non-reasoning';
export const MODEL_GROK_4_1_FAST_REASONING = 'grok-4-1-fast-reasoning';
export const MODEL_GROK_4_1_FAST_NON_REASONING = 'grok-4-1-fast-non-reasoning';

// Vision support for models
export const XAI_VISION_SUPPORTED_MODELS = [
  MODEL_GROK_4_3,
  MODEL_GROK_4_20_REASONING,
  MODEL_GROK_4_20_NON_REASONING,
  MODEL_GROK_4_1_FAST_REASONING,
  MODEL_GROK_4_1_FAST_NON_REASONING,
];

/**
 * Check if a model supports vision capabilities
 */
export function isXaiVisionModel(model: string): boolean {
  return XAI_VISION_SUPPORTED_MODELS.includes(model);
}
