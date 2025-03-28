
export const ENDPOINT_OPENAI_CHAT_COMPLETIONS_API =
  'https://api.openai.com/v1/chat/completions';

// gpt model
export const MODEL_GPT_4O_MINI = 'gpt-4o-mini';
export const MODEL_GPT_4O = 'gpt-4o';
export const MODEL_O3_MINI = 'o3-mini';

// Vision support for models
export const VISION_SUPPORTED_MODELS = [
    MODEL_GPT_4O_MINI,
    MODEL_GPT_4O,
    // MODEL_O3_MINI is not included as it doesn't support vision
  ];
  