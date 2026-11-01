export const SARASHINA_API_BASE_URL = 'https://api.sarashina.ai/v1';
export const ENDPOINT_SARASHINA_CHAT_COMPLETIONS_API = `${SARASHINA_API_BASE_URL}/chat/completions`;

export const MODEL_SARASHINA_3_NANO = 'sarashina3-nano';
export const MODEL_SARASHINA_3_MINI = 'sarashina3-mini';
export const MODEL_SARASHINA_3_2_MINI_THINKING = 'sarashina3.2-mini-thinking';

export const SARASHINA_SUPPORTED_MODELS = [
  MODEL_SARASHINA_3_NANO,
  MODEL_SARASHINA_3_MINI,
  MODEL_SARASHINA_3_2_MINI_THINKING,
];

export const SARASHINA_MAX_COMPLETION_TOKENS = 8000;
export type SarashinaReasoningEffort = 'low' | 'medium' | 'high';

export function getSarashinaSupportedReasoningEfforts(
  model: string,
): readonly SarashinaReasoningEffort[] {
  return model === MODEL_SARASHINA_3_2_MINI_THINKING
    ? ['low', 'medium', 'high']
    : [];
}

export function getDefaultSarashinaReasoningEffort(
  model: string,
): SarashinaReasoningEffort | undefined {
  return getSarashinaSupportedReasoningEfforts(model).length
    ? 'low'
    : undefined;
}
