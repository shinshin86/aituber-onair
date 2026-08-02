export const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com';
export const ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API = `${DEEPSEEK_API_BASE_URL}/chat/completions`;

// DeepSeek V4 models
export const MODEL_DEEPSEEK_V4_FLASH = 'deepseek-v4-flash';
export const MODEL_DEEPSEEK_V4_PRO = 'deepseek-v4-pro';

export type DeepSeekReasoningEffort = 'none' | 'low' | 'high' | 'max';

const DEEPSEEK_V4_FLASH_REASONING_EFFORTS = [
  'none',
  'low',
  'high',
  'max',
] as const satisfies readonly DeepSeekReasoningEffort[];

const DEEPSEEK_V4_PRO_REASONING_EFFORTS = [
  'none',
  'high',
  'max',
] as const satisfies readonly DeepSeekReasoningEffort[];

// Legacy DeepSeek model aliases
/** @deprecated Use MODEL_DEEPSEEK_V4_FLASH instead. */
export const MODEL_DEEPSEEK_CHAT = 'deepseek-chat';
/** @deprecated Use MODEL_DEEPSEEK_V4_FLASH or MODEL_DEEPSEEK_V4_PRO instead. */
export const MODEL_DEEPSEEK_REASONER = 'deepseek-reasoner';

export const DEEPSEEK_SUPPORTED_MODELS = [
  MODEL_DEEPSEEK_V4_FLASH,
  MODEL_DEEPSEEK_V4_PRO,
];

export const DEEPSEEK_DEPRECATED_MODELS = [
  MODEL_DEEPSEEK_CHAT,
  MODEL_DEEPSEEK_REASONER,
];

export function getDeepSeekSupportedReasoningEfforts(
  model: string,
): readonly DeepSeekReasoningEffort[] {
  if (model === MODEL_DEEPSEEK_V4_FLASH) {
    return DEEPSEEK_V4_FLASH_REASONING_EFFORTS;
  }

  if (model === MODEL_DEEPSEEK_V4_PRO) {
    return DEEPSEEK_V4_PRO_REASONING_EFFORTS;
  }

  return [];
}

export function isDeepSeekReasoningEffortModel(model: string): boolean {
  return getDeepSeekSupportedReasoningEfforts(model).length > 0;
}

/** Chat-oriented default that disables DeepSeek thinking for lower latency. */
export function getDefaultDeepSeekReasoningEffort(
  model: string,
): DeepSeekReasoningEffort | undefined {
  return isDeepSeekReasoningEffortModel(model) ? 'none' : undefined;
}

export function normalizeDeepSeekReasoningEffort(
  model: string,
  effort?: DeepSeekReasoningEffort,
): DeepSeekReasoningEffort | undefined {
  const supported = getDeepSeekSupportedReasoningEfforts(model);
  if (supported.length === 0) {
    return undefined;
  }

  const requested = effort ?? getDefaultDeepSeekReasoningEffort(model);
  if (requested && supported.includes(requested)) {
    return requested;
  }

  // DeepSeek currently maps V4 Pro low to high. Normalize it explicitly so
  // callers and capability metadata observe the effective behavior.
  if (model === MODEL_DEEPSEEK_V4_PRO && requested === 'low') {
    return 'high';
  }

  return getDefaultDeepSeekReasoningEffort(model);
}
