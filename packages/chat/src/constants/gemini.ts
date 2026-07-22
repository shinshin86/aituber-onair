// API Endpoints
export const ENDPOINT_GEMINI_API = 'https://generativelanguage.googleapis.com';

// Gemini / Gemma models
export const MODEL_GEMMA_4_31B_IT = 'gemma-4-31b-it';
export const MODEL_GEMMA_4_26B_A4B_IT = 'gemma-4-26b-a4b-it';
export const MODEL_GEMINI_3_6_FLASH = 'gemini-3.6-flash';
export const MODEL_GEMINI_3_5_FLASH = 'gemini-3.5-flash';
export const MODEL_GEMINI_3_5_FLASH_LITE = 'gemini-3.5-flash-lite';
export const MODEL_GEMINI_3_1_PRO_PREVIEW = 'gemini-3.1-pro-preview';
export const MODEL_GEMINI_3_1_FLASH_LITE = 'gemini-3.1-flash-lite';
/** @deprecated Use MODEL_GEMINI_3_1_FLASH_LITE instead. */
export const MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW =
  'gemini-3.1-flash-lite-preview';
/** @deprecated Use MODEL_GEMINI_3_1_PRO_PREVIEW instead. */
export const MODEL_GEMINI_3_PRO_PREVIEW = 'gemini-3-pro-preview';
export const MODEL_GEMINI_3_FLASH_PREVIEW = 'gemini-3-flash-preview';
export const MODEL_GEMINI_2_5_PRO = 'gemini-2.5-pro';
export const MODEL_GEMINI_2_5_FLASH = 'gemini-2.5-flash';
export const MODEL_GEMINI_2_5_FLASH_LITE = 'gemini-2.5-flash-lite';
/** @deprecated Use MODEL_GEMINI_3_1_FLASH_LITE instead. */
export const MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17 =
  'gemini-2.5-flash-lite-preview-06-17';

export const GEMINI_RECOMMENDED_MODELS = [
  MODEL_GEMINI_3_6_FLASH,
  MODEL_GEMINI_3_5_FLASH,
  MODEL_GEMINI_3_5_FLASH_LITE,
  MODEL_GEMINI_3_1_FLASH_LITE,
  MODEL_GEMINI_3_1_PRO_PREVIEW,
  MODEL_GEMINI_3_FLASH_PREVIEW,
  MODEL_GEMINI_2_5_PRO,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_2_5_FLASH_LITE,
  MODEL_GEMMA_4_31B_IT,
  MODEL_GEMMA_4_26B_A4B_IT,
];

export const GEMINI_DEPRECATED_MODELS = [
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  MODEL_GEMINI_3_PRO_PREVIEW,
  MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
];

// Vision support for Gemini models. Deprecated entries remain for explicit
// model-string compatibility, but are omitted from recommended model lists.
export const GEMINI_VISION_SUPPORTED_MODELS = [
  ...GEMINI_RECOMMENDED_MODELS,
  ...GEMINI_DEPRECATED_MODELS,
];

export type GeminiReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

const GEMINI_FLASH_REASONING_EFFORTS: readonly GeminiReasoningEffort[] = [
  'minimal',
  'low',
  'medium',
  'high',
];

const GEMINI_PRO_REASONING_EFFORTS: readonly GeminiReasoningEffort[] = [
  'low',
  'medium',
  'high',
];

const GEMINI_FLASH_REASONING_EFFORT_MODELS = [
  MODEL_GEMINI_3_6_FLASH,
  MODEL_GEMINI_3_5_FLASH,
  MODEL_GEMINI_3_5_FLASH_LITE,
  MODEL_GEMINI_3_1_FLASH_LITE,
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  MODEL_GEMINI_3_FLASH_PREVIEW,
];

const GEMINI_PRO_REASONING_EFFORT_MODELS = [
  MODEL_GEMINI_3_1_PRO_PREVIEW,
  MODEL_GEMINI_3_PRO_PREVIEW,
];

/**
 * Return the reasoning effort values supported by a Gemini 3 model.
 * Gemini 2.5 uses thinkingBudget instead and is intentionally excluded.
 */
export function getGeminiSupportedReasoningEfforts(
  model: string,
): readonly GeminiReasoningEffort[] {
  if (GEMINI_FLASH_REASONING_EFFORT_MODELS.includes(model)) {
    return GEMINI_FLASH_REASONING_EFFORTS;
  }

  if (GEMINI_PRO_REASONING_EFFORT_MODELS.includes(model)) {
    return GEMINI_PRO_REASONING_EFFORTS;
  }

  return [];
}

export function isGeminiReasoningEffortModel(model: string): boolean {
  return getGeminiSupportedReasoningEfforts(model).length > 0;
}

/**
 * Chat-oriented default: minimal for Flash families, low for Pro families.
 */
export function getDefaultGeminiReasoningEffort(
  model: string,
): GeminiReasoningEffort | undefined {
  return getGeminiSupportedReasoningEfforts(model)[0];
}

/**
 * Normalize an effort to the closest low-latency value supported by the model.
 */
export function normalizeGeminiReasoningEffort(
  model: string,
  effort?: GeminiReasoningEffort,
): GeminiReasoningEffort | undefined {
  const supported = getGeminiSupportedReasoningEfforts(model);
  if (supported.length === 0) {
    return undefined;
  }

  if (effort && supported.includes(effort)) {
    return effort;
  }

  return supported[0];
}
