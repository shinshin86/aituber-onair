export const PLAMO_API_BASE_URL = 'https://api.platform.preferredai.jp/v1';
export const ENDPOINT_PLAMO_CHAT_COMPLETIONS_API = `${PLAMO_API_BASE_URL}/chat/completions`;

export const MODEL_PLAMO_3_0_PRIME = 'plamo-3.0-prime';
/** @deprecated Scheduled for retirement on September 30, 2026. */
export const MODEL_PLAMO_2_2_PRIME = 'plamo-2.2-prime';

export const PLAMO_SUPPORTED_MODELS = [MODEL_PLAMO_3_0_PRIME];

export const PLAMO_DEPRECATED_MODELS = [MODEL_PLAMO_2_2_PRIME];

export type PlamoReasoningEffort = 'none' | 'medium';
