export const MISTRAL_API_BASE_URL = 'https://api.mistral.ai/v1';
export const ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API = `${MISTRAL_API_BASE_URL}/chat/completions`;

// Mistral generalist models
export const MODEL_MISTRAL_SMALL_LATEST = 'mistral-small-latest';
export const MODEL_MISTRAL_SMALL_2603 = 'mistral-small-2603';
export const MODEL_MISTRAL_MEDIUM_3_5 = 'mistral-medium-3-5';
export const MODEL_MISTRAL_MEDIUM_2508 = 'mistral-medium-2508';
export const MODEL_MISTRAL_LARGE_LATEST = 'mistral-large-latest';
export const MODEL_MISTRAL_LARGE_2512 = 'mistral-large-2512';

export type MistralReasoningEffort = 'none' | 'high';

export const MISTRAL_SUPPORTED_MODELS = [
  MODEL_MISTRAL_SMALL_LATEST,
  MODEL_MISTRAL_MEDIUM_3_5,
  MODEL_MISTRAL_LARGE_LATEST,
  MODEL_MISTRAL_LARGE_2512,
  MODEL_MISTRAL_SMALL_2603,
  MODEL_MISTRAL_MEDIUM_2508,
];

export const MISTRAL_REASONING_EFFORT_SUPPORTED_MODELS = [
  MODEL_MISTRAL_SMALL_LATEST,
  MODEL_MISTRAL_MEDIUM_3_5,
];

export const MISTRAL_VISION_SUPPORTED_MODELS = [
  MODEL_MISTRAL_SMALL_LATEST,
  MODEL_MISTRAL_SMALL_2603,
  MODEL_MISTRAL_MEDIUM_3_5,
  MODEL_MISTRAL_MEDIUM_2508,
  MODEL_MISTRAL_LARGE_LATEST,
  MODEL_MISTRAL_LARGE_2512,
];

export function isMistralReasoningEffortModel(model: string): boolean {
  return MISTRAL_REASONING_EFFORT_SUPPORTED_MODELS.includes(model);
}

export function isMistralReasoningEffort(
  effort: string,
): effort is MistralReasoningEffort {
  return effort === 'none' || effort === 'high';
}

export function isMistralVisionModel(model: string): boolean {
  return MISTRAL_VISION_SUPPORTED_MODELS.includes(model);
}
