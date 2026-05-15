export const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com';
export const ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API = `${DEEPSEEK_API_BASE_URL}/chat/completions`;

// DeepSeek V4 models
export const MODEL_DEEPSEEK_V4_FLASH = 'deepseek-v4-flash';
export const MODEL_DEEPSEEK_V4_PRO = 'deepseek-v4-pro';

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
