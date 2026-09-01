export const ENDPOINT_OPENROUTER_API =
  'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter models
export const MODEL_OPENROUTER_AUTO = 'openrouter/auto';
export const MODEL_OPENROUTER_AUTO_BETA = 'openrouter/auto-beta';
export const MODEL_OPENROUTER_FUSION = 'openrouter/fusion';
export const MODEL_GPT_OSS_20B_FREE = 'openai/gpt-oss-20b:free';
export const MODEL_MOONSHOTAI_KIMI_K3 = 'moonshotai/kimi-k3';
export const MODEL_MOONSHOTAI_KIMI_K2_7_CODE = 'moonshotai/kimi-k2.7-code';
export const MODEL_MOONSHOTAI_KIMI_K2_6 = 'moonshotai/kimi-k2.6';
export const MODEL_MOONSHOTAI_KIMI_K2_5 = 'moonshotai/kimi-k2.5';
export const MODEL_MOONSHOTAI_KIMI_LATEST = '~moonshotai/kimi-latest';
export const MODEL_OPENAI_GPT_LATEST = '~openai/gpt-latest';
export const MODEL_OPENAI_GPT_MINI_LATEST = '~openai/gpt-mini-latest';
export const MODEL_OPENAI_GPT_5_6_SOL = 'openai/gpt-5.6-sol';
export const MODEL_OPENAI_GPT_5_6_TERRA = 'openai/gpt-5.6-terra';
export const MODEL_OPENAI_GPT_5_6_LUNA = 'openai/gpt-5.6-luna';
export const MODEL_OPENAI_GPT_5_5_PRO = 'openai/gpt-5.5-pro';
export const MODEL_OPENAI_GPT_5_5 = 'openai/gpt-5.5';
export const MODEL_OPENAI_GPT_5_1_CHAT = 'openai/gpt-5.1-chat';
export const MODEL_OPENAI_GPT_5_1_CODEX = 'openai/gpt-5.1-codex';
export const MODEL_OPENAI_GPT_5_MINI = 'openai/gpt-5-mini';
export const MODEL_OPENAI_GPT_5_NANO = 'openai/gpt-5-nano';
export const MODEL_OPENAI_GPT_4O = 'openai/gpt-4o';
export const MODEL_OPENAI_GPT_4_1_MINI = 'openai/gpt-4.1-mini';
export const MODEL_OPENAI_GPT_4_1_NANO = 'openai/gpt-4.1-nano';
export const MODEL_ANTHROPIC_CLAUDE_SONNET_LATEST =
  '~anthropic/claude-sonnet-latest';
export const MODEL_ANTHROPIC_CLAUDE_HAIKU_LATEST =
  '~anthropic/claude-haiku-latest';
export const MODEL_ANTHROPIC_CLAUDE_FABLE_5 = 'anthropic/claude-fable-5';
export const MODEL_ANTHROPIC_CLAUDE_SONNET_5 = 'anthropic/claude-sonnet-5';
export const MODEL_ANTHROPIC_CLAUDE_OPUS_5 = 'anthropic/claude-opus-5';
export const MODEL_ANTHROPIC_CLAUDE_OPUS_4_8 = 'anthropic/claude-opus-4.8';
export const MODEL_ANTHROPIC_CLAUDE_OPUS_4 = 'anthropic/claude-opus-4';
export const MODEL_ANTHROPIC_CLAUDE_SONNET_4 = 'anthropic/claude-sonnet-4';
export const MODEL_ANTHROPIC_CLAUDE_3_7_SONNET = 'anthropic/claude-3.7-sonnet';
export const MODEL_ANTHROPIC_CLAUDE_3_5_SONNET = 'anthropic/claude-3.5-sonnet';
export const MODEL_ANTHROPIC_CLAUDE_4_5_HAIKU = 'anthropic/claude-haiku-4.5';
export const MODEL_GOOGLE_GEMINI_PRO_LATEST = '~google/gemini-pro-latest';
export const MODEL_GOOGLE_GEMINI_FLASH_LATEST = '~google/gemini-flash-latest';
export const MODEL_GOOGLE_GEMINI_3_7_FLASH = 'google/gemini-3.7-flash';
export const MODEL_GOOGLE_GEMINI_3_6_FLASH = 'google/gemini-3.6-flash';
export const MODEL_GOOGLE_GEMINI_3_5_FLASH_LITE =
  'google/gemini-3.5-flash-lite';
export const MODEL_GOOGLE_GEMINI_2_5_PRO = 'google/gemini-2.5-pro';
export const MODEL_GOOGLE_GEMINI_2_5_FLASH = 'google/gemini-2.5-flash';
export const MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025 =
  'google/gemini-2.5-flash-lite-preview-09-2025';
export const MODEL_ZAI_GLM_5_2 = 'z-ai/glm-5.2';
export const MODEL_ZAI_GLM_5_3 = 'z-ai/glm-5.3';
export const MODEL_ZAI_GLM_5_3_FLASH = 'z-ai/glm-5.3-flash';
export const MODEL_ZAI_GLM_4_7_FLASH = 'z-ai/glm-4.7-flash';
export const MODEL_ZAI_GLM_4_5_AIR = 'z-ai/glm-4.5-air';
export const MODEL_ZAI_GLM_4_5_AIR_FREE = 'z-ai/glm-4.5-air:free';
export const MODEL_KWAIPILOT_KAT_CODER_AIR_V2_5 =
  'kwaipilot/kat-coder-air-v2.5';
export const MODEL_KWAIPILOT_KAT_CODER_PRO_V2_5 =
  'kwaipilot/kat-coder-pro-v2.5';
export const MODEL_XAI_GROK_LATEST = '~x-ai/grok-latest';
export const MODEL_XAI_GROK_4_6 = 'x-ai/grok-4.6';
export const MODEL_XAI_GROK_4_5 = 'x-ai/grok-4.5';
export const MODEL_OPENROUTER_DEEPSEEK_V4_FLASH = 'deepseek/deepseek-v4-flash';
export const MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731 =
  'deepseek/deepseek-v4-flash-0731';
export const MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813 =
  'deepseek/deepseek-v4-pro-0813';
export const MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP =
  'deepseek/deepseek-v4-flash-vision-exp';
export const MODEL_QWEN_QWEN_3_8_FLASH = 'qwen/qwen3.8-flash';

// These ids remain exported for compatibility but are absent from the current
// OpenRouter public model catalog.
export const OPENROUTER_DEPRECATED_MODELS = [
  MODEL_OPENAI_GPT_5_1_CHAT,
  MODEL_ANTHROPIC_CLAUDE_3_7_SONNET,
  MODEL_ANTHROPIC_CLAUDE_3_5_SONNET,
  MODEL_ZAI_GLM_4_5_AIR_FREE,
];

export type OpenRouterReasoningEffort =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max';

const DEFAULT_OPENROUTER_REASONING_EFFORTS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
] as const satisfies readonly OpenRouterReasoningEffort[];

const OPENROUTER_DEEPSEEK_V4_FLASH_REASONING_EFFORTS = [
  'none',
  'high',
  'xhigh',
] as const satisfies readonly OpenRouterReasoningEffort[];

const OPENROUTER_DEEPSEEK_V4_FLASH_0731_REASONING_EFFORTS = [
  'none',
  'low',
  'high',
  'max',
] as const satisfies readonly OpenRouterReasoningEffort[];

const OPENROUTER_DEEPSEEK_V4_PRO_REASONING_EFFORTS = [
  'none',
  'high',
  'xhigh',
] as const satisfies readonly OpenRouterReasoningEffort[];

const OPENROUTER_ALWAYS_THINKING_REASONING_EFFORTS = [
  'low',
  'high',
  'max',
] as const satisfies readonly OpenRouterReasoningEffort[];

const OPENROUTER_OPTIONAL_LOW_REASONING_EFFORTS = [
  'none',
  'low',
  'high',
  'max',
] as const satisfies readonly OpenRouterReasoningEffort[];

const OPENROUTER_CLAUDE_REASONING_EFFORTS = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const satisfies readonly OpenRouterReasoningEffort[];

// Free tier models
export const OPENROUTER_FREE_MODELS = [MODEL_GPT_OSS_20B_FREE];

// Vision supported models on OpenRouter
export const OPENROUTER_VISION_SUPPORTED_MODELS = [
  MODEL_OPENROUTER_AUTO_BETA,
  MODEL_MOONSHOTAI_KIMI_K3,
  MODEL_MOONSHOTAI_KIMI_K2_6,
  MODEL_MOONSHOTAI_KIMI_LATEST,
  MODEL_OPENAI_GPT_LATEST,
  MODEL_OPENAI_GPT_MINI_LATEST,
  MODEL_OPENAI_GPT_5_6_SOL,
  MODEL_OPENAI_GPT_5_6_TERRA,
  MODEL_OPENAI_GPT_5_6_LUNA,
  MODEL_OPENAI_GPT_5_5_PRO,
  MODEL_OPENAI_GPT_5_5,
  MODEL_OPENAI_GPT_5_1_CODEX,
  MODEL_OPENAI_GPT_5_MINI,
  MODEL_OPENAI_GPT_5_NANO,
  MODEL_OPENAI_GPT_4O,
  MODEL_OPENAI_GPT_4_1_MINI,
  MODEL_OPENAI_GPT_4_1_NANO,
  MODEL_ANTHROPIC_CLAUDE_SONNET_LATEST,
  MODEL_ANTHROPIC_CLAUDE_HAIKU_LATEST,
  MODEL_ANTHROPIC_CLAUDE_FABLE_5,
  MODEL_ANTHROPIC_CLAUDE_SONNET_5,
  MODEL_ANTHROPIC_CLAUDE_OPUS_5,
  MODEL_ANTHROPIC_CLAUDE_OPUS_4_8,
  MODEL_ANTHROPIC_CLAUDE_OPUS_4,
  MODEL_ANTHROPIC_CLAUDE_SONNET_4,
  MODEL_ANTHROPIC_CLAUDE_4_5_HAIKU,
  MODEL_GOOGLE_GEMINI_PRO_LATEST,
  MODEL_GOOGLE_GEMINI_FLASH_LATEST,
  MODEL_GOOGLE_GEMINI_3_7_FLASH,
  MODEL_GOOGLE_GEMINI_3_6_FLASH,
  MODEL_GOOGLE_GEMINI_3_5_FLASH_LITE,
  MODEL_GOOGLE_GEMINI_2_5_PRO,
  MODEL_GOOGLE_GEMINI_2_5_FLASH,
  MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025,
  MODEL_ZAI_GLM_5_3_FLASH,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP,
  MODEL_QWEN_QWEN_3_8_FLASH,
  MODEL_MOONSHOTAI_KIMI_K2_7_CODE,
  MODEL_MOONSHOTAI_KIMI_K2_5,
  MODEL_XAI_GROK_LATEST,
  MODEL_XAI_GROK_4_6,
  MODEL_XAI_GROK_4_5,
];

// Rate limits for free tier
export const OPENROUTER_FREE_RATE_LIMIT_PER_MINUTE = 20;
export const OPENROUTER_FREE_DAILY_LIMIT_LOW_CREDITS = 50;
export const OPENROUTER_FREE_DAILY_LIMIT_HIGH_CREDITS = 1000;
export const OPENROUTER_CREDITS_THRESHOLD = 10;

/**
 * Check if a model is a free tier model
 * @param model Model name to check
 * @returns True if the model is free tier
 */
export function isOpenRouterFreeModel(model: string): boolean {
  return model.trim().endsWith(':free');
}

/**
 * Check if a model supports vision on OpenRouter
 * @param model Model name to check
 * @returns True if the model supports vision
 */
export function isOpenRouterVisionModel(model: string): boolean {
  return OPENROUTER_VISION_SUPPORTED_MODELS.some((visionModel) =>
    model.includes(visionModel),
  );
}

export function getOpenRouterSupportedReasoningEfforts(
  model: string,
): readonly OpenRouterReasoningEffort[] {
  const normalizedModel = model.trim();
  if (
    normalizedModel === MODEL_ZAI_GLM_5_3 ||
    normalizedModel === MODEL_ZAI_GLM_5_3_FLASH
  ) {
    return OPENROUTER_ALWAYS_THINKING_REASONING_EFFORTS;
  }

  if (normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP) {
    return OPENROUTER_OPTIONAL_LOW_REASONING_EFFORTS;
  }

  if (
    normalizedModel === MODEL_ANTHROPIC_CLAUDE_SONNET_5 ||
    normalizedModel === MODEL_ANTHROPIC_CLAUDE_OPUS_4_8
  ) {
    return OPENROUTER_CLAUDE_REASONING_EFFORTS;
  }

  if (normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_FLASH) {
    return OPENROUTER_DEEPSEEK_V4_FLASH_REASONING_EFFORTS;
  }

  if (normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731) {
    return OPENROUTER_DEEPSEEK_V4_FLASH_0731_REASONING_EFFORTS;
  }

  if (normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813) {
    return OPENROUTER_DEEPSEEK_V4_PRO_REASONING_EFFORTS;
  }

  return DEFAULT_OPENROUTER_REASONING_EFFORTS;
}

export function getDefaultOpenRouterReasoningEffort(
  model: string,
): OpenRouterReasoningEffort | undefined {
  const normalizedModel = model.trim();
  if (
    normalizedModel === MODEL_ZAI_GLM_5_3 ||
    normalizedModel === MODEL_ZAI_GLM_5_3_FLASH
  ) {
    return 'low';
  }

  return normalizedModel === MODEL_ZAI_GLM_5_2 ||
    normalizedModel === MODEL_QWEN_QWEN_3_8_FLASH ||
    normalizedModel === MODEL_MOONSHOTAI_KIMI_K2_6 ||
    normalizedModel === MODEL_ANTHROPIC_CLAUDE_SONNET_5 ||
    normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP ||
    normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_FLASH ||
    normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731 ||
    normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813
    ? 'none'
    : undefined;
}

export function normalizeOpenRouterReasoningEffort(
  model: string,
  effort?: OpenRouterReasoningEffort,
): OpenRouterReasoningEffort | undefined {
  const normalizedModel = model.trim();
  const requested = effort ?? getDefaultOpenRouterReasoningEffort(model);
  if (!requested) {
    return undefined;
  }

  if (
    normalizedModel === MODEL_ZAI_GLM_5_3 ||
    normalizedModel === MODEL_ZAI_GLM_5_3_FLASH
  ) {
    if (requested === 'high') {
      return 'high';
    }
    if (requested === 'max' || requested === 'xhigh') {
      return 'max';
    }
    return 'low';
  }

  const supported = getOpenRouterSupportedReasoningEfforts(model);
  if (supported.includes(requested)) {
    return requested;
  }

  if (normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_FLASH) {
    return requested === 'max' ? 'xhigh' : 'none';
  }

  if (normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731) {
    if (requested === 'minimal' || requested === 'medium') {
      return 'low';
    }
    if (requested === 'xhigh') {
      return 'high';
    }
  }

  if (normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813) {
    if (requested === 'minimal' || requested === 'low') {
      return 'none';
    }
    if (requested === 'medium') {
      return 'high';
    }
    if (requested === 'max') {
      return 'xhigh';
    }
  }

  if (normalizedModel === MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP) {
    if (requested === 'minimal' || requested === 'medium') {
      return 'low';
    }
    if (requested === 'xhigh') {
      return 'high';
    }
  }

  return requested;
}
