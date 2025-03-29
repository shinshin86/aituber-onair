export const ENDPOINT_OPENAI_CHAT_COMPLETIONS_API =
  'https://api.openai.com/v1/chat/completions';

// gpt model
export const MODEL_GPT_4O_MINI = 'gpt-4o-mini';
export const MODEL_GPT_4O = 'gpt-4o';
export const MODEL_O3_MINI = 'o3-mini';

export const MODEL_GPT_4_5_PREVIEW = 'gpt-4.5-preview';
export const MODEL_O1_MINI = 'o1-mini';
export const MODEL_O1 = 'o1';
// Vision support for models
export const VISION_SUPPORTED_MODELS = [
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_GPT_4_5_PREVIEW,
  MODEL_O1,
  // MODEL_O3_MINI and MODEL_O1_MINI is not included as it doesn't support vision
];
