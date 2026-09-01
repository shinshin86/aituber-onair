export const SAKANA_API_BASE_URL = 'https://api.sakana.ai/v1';
export const ENDPOINT_SAKANA_CHAT_COMPLETIONS_API = `${SAKANA_API_BASE_URL}/chat/completions`;

export const MODEL_FUGU = 'fugu';
export const MODEL_FUGU_ULTRA = 'fugu-ultra';
export const MODEL_FUGU_ULTRA_V1_1 = 'fugu-ultra-v1.1';
export const MODEL_SAKANA_NAMAZU = 'sakana-namazu';
/** @deprecated Use MODEL_FUGU_ULTRA_V1_1 instead. */
export const MODEL_FUGU_ULTRA_20260615 = 'fugu-ultra-20260615';

export const SAKANA_SUPPORTED_MODELS = [
  MODEL_FUGU,
  MODEL_FUGU_ULTRA_V1_1,
  MODEL_SAKANA_NAMAZU,
];

export const SAKANA_VISION_SUPPORTED_MODELS = [MODEL_SAKANA_NAMAZU];

export function isSakanaVisionModel(model: string): boolean {
  return SAKANA_VISION_SUPPORTED_MODELS.includes(model);
}

// The unversioned alias is still accepted upstream. The former dated id is
// retained only for callers migrating from the original release.
export const SAKANA_COMPATIBILITY_MODELS = [
  MODEL_FUGU_ULTRA,
  MODEL_FUGU_ULTRA_20260615,
];
