import {
  CLAUDE_DEPRECATED_MODELS,
  DEEPSEEK_DEPRECATED_MODELS,
  GEMINI_DEPRECATED_MODELS,
  KIMI_DEPRECATED_MODELS,
  MISTRAL_DEPRECATED_MODELS,
  OPENAI_DEPRECATED_MODELS,
  PLAMO_DEPRECATED_MODELS,
  XAI_DEPRECATED_MODELS,
} from '@aituber-onair/core';

// Only ids already shut down in Chat 0.66.0 are migrated. Scheduled
// shutdowns and provider-routed aliases must retain the user's saved choice.
const SHUT_DOWN_OPENAI_MODELS = ['gpt-4.1-nano', 'o1', 'o1-mini', 'o3-mini'];

export function migrateSavedLlmModel(provider: string, model: string): string {
  return provider === 'openai' && SHUT_DOWN_OPENAI_MODELS.includes(model)
    ? 'gpt-5.6-luna'
    : model;
}

const DEPRECATED_MODELS: Record<string, readonly string[]> = {
  openai: OPENAI_DEPRECATED_MODELS,
  claude: CLAUDE_DEPRECATED_MODELS,
  gemini: GEMINI_DEPRECATED_MODELS,
  kimi: KIMI_DEPRECATED_MODELS,
  deepseek: DEEPSEEK_DEPRECATED_MODELS,
  mistral: MISTRAL_DEPRECATED_MODELS,
  plamo: PLAMO_DEPRECATED_MODELS,
  xai: XAI_DEPRECATED_MODELS,
};

export function getLlmModelLabel(provider: string, model: string): string {
  return DEPRECATED_MODELS[provider]?.includes(model)
    ? `${model}（非推奨）`
    : provider === 'mistral' && model === 'mistral-large-4-0'
      ? `${model}（プレビュー）`
      : model;
}
