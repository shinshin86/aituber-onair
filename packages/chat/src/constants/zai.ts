export const ENDPOINT_ZAI_CHAT_COMPLETIONS_API =
  'https://api.z.ai/api/paas/v4/chat/completions';

// Z.ai GLM models
export const MODEL_GLM_5_2 = 'glm-5.2';
export const MODEL_GLM_5_1 = 'glm-5.1';
export const MODEL_GLM_5 = 'glm-5';
export const MODEL_GLM_5_TURBO = 'glm-5-turbo';
export const MODEL_GLM_5V_TURBO = 'glm-5v-turbo';
export const MODEL_GLM_4_7 = 'glm-4.7';
export const MODEL_GLM_4_7_FLASHX = 'glm-4.7-FlashX';
export const MODEL_GLM_4_7_FLASH = 'glm-4.7-Flash';
export const MODEL_GLM_4_6 = 'glm-4.6';
export const MODEL_GLM_4_6V = 'glm-4.6V';
export const MODEL_GLM_4_6V_FLASHX = 'glm-4.6V-FlashX';
export const MODEL_GLM_4_6V_FLASH = 'glm-4.6V-Flash';

export type ZaiReasoningEffort =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max';

const ZAI_GLM_5_2_REASONING_EFFORTS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const satisfies readonly ZaiReasoningEffort[];

/** Return the protocol-compatible effort values accepted by a Z.ai model. */
export function getZaiSupportedReasoningEfforts(
  model: string,
): readonly ZaiReasoningEffort[] {
  return model === MODEL_GLM_5_2 ? ZAI_GLM_5_2_REASONING_EFFORTS : [];
}

export function isZaiReasoningEffortModel(model: string): boolean {
  return getZaiSupportedReasoningEfforts(model).length > 0;
}

/** Chat-oriented package default: skip thinking for the lowest latency. */
export function getDefaultZaiReasoningEffort(
  model: string,
): ZaiReasoningEffort | undefined {
  return isZaiReasoningEffortModel(model) ? 'none' : undefined;
}

/** Normalize compatibility aliases to the effective GLM-5.2 effort. */
export function normalizeZaiReasoningEffort(
  model: string,
  effort?: ZaiReasoningEffort,
): ZaiReasoningEffort | undefined {
  if (!isZaiReasoningEffortModel(model)) {
    return undefined;
  }

  const requested = effort ?? getDefaultZaiReasoningEffort(model);
  if (requested === 'none' || requested === 'minimal') {
    return 'none';
  }
  if (requested === 'low' || requested === 'medium' || requested === 'high') {
    return 'high';
  }
  return 'max';
}

// Vision support for models
export const ZAI_VISION_SUPPORTED_MODELS = [
  MODEL_GLM_5V_TURBO,
  MODEL_GLM_4_6V,
  MODEL_GLM_4_6V_FLASHX,
  MODEL_GLM_4_6V_FLASH,
];

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
