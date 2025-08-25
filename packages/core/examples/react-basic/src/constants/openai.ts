import {
  MODEL_GPT_5_NANO,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5,
  MODEL_GPT_5_CHAT_LATEST,
  MODEL_GPT_4_1_NANO,
  MODEL_GPT_4_1_MINI,
  MODEL_GPT_4_1,
  MODEL_O3_MINI,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_GPT_4_5_PREVIEW,
} from '@aituber-onair/core';

// OpenAI models list
export const openaiModels = [
  MODEL_GPT_4_1_NANO,
  MODEL_GPT_4_1_MINI,
  MODEL_GPT_4_1,
  MODEL_GPT_5_NANO,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5,
  MODEL_GPT_5_CHAT_LATEST,
  MODEL_O3_MINI,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_GPT_4_5_PREVIEW,
];

// OpenAI default settings
export const DEFAULT_CHAT_PROVIDER = 'openai';
export const DEFAULT_MODEL = MODEL_GPT_4_1_NANO;
export const DEFAULT_SYSTEM_PROMPT = 'あなたはフレンドリーなAITuberです。';