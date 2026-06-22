export const PLAMO_API_BASE_URL = 'https://api.platform.preferredai.jp/v1';
export const ENDPOINT_PLAMO_CHAT_COMPLETIONS_API = `${PLAMO_API_BASE_URL}/chat/completions`;

export const MODEL_PLAMO_3_0_PRIME = 'plamo-3.0-prime';
export const MODEL_PLAMO_2_2_PRIME = 'plamo-2.2-prime';

export const PLAMO_SUPPORTED_MODELS = [
  MODEL_PLAMO_3_0_PRIME,
  MODEL_PLAMO_2_2_PRIME,
];

export type PlamoReasoningEffort = 'none' | 'medium';
