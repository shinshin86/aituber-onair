export const ENDPOINT_ZAI_CHAT_COMPLETIONS_API =
  'https://api.z.ai/api/paas/v4/chat/completions';

// Z.ai GLM models
export const MODEL_GLM_4_7 = 'glm-4.7';
export const MODEL_GLM_4_7_FLASHX = 'glm-4.7-FlashX';
export const MODEL_GLM_4_7_FLASH = 'glm-4.7-Flash';
export const MODEL_GLM_4_6V_FLASH = 'glm-4.6V-Flash';

// Vision support for models
export const ZAI_VISION_SUPPORTED_MODELS = [MODEL_GLM_4_6V_FLASH];

/**
 * Check if a model supports vision capabilities
 */
export function isZaiVisionModel(model: string): boolean {
  return ZAI_VISION_SUPPORTED_MODELS.includes(model);
}

/**
 * Tool streaming support (GLM-4.6 family)
 */
export function isZaiToolStreamModel(model: string): boolean {
  return model.toLowerCase().startsWith('glm-4.6');
}
