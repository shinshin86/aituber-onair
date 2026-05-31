// API Endpoints
export const ENDPOINT_GEMINI_API = 'https://generativelanguage.googleapis.com';

// Gemini / Gemma models
export const MODEL_GEMMA_4_31B_IT = 'gemma-4-31b-it';
export const MODEL_GEMMA_4_26B_A4B_IT = 'gemma-4-26b-a4b-it';
export const MODEL_GEMINI_3_5_FLASH = 'gemini-3.5-flash';
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
  MODEL_GEMINI_3_5_FLASH,
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
