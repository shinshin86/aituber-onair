export const ENDPOINT_OPENAI_CHAT_COMPLETIONS_API =
  'https://api.openai.com/v1/chat/completions';
export const ENDPOINT_OPENAI_RESPONSES_API =
  'https://api.openai.com/v1/responses';

// gpt model
export const MODEL_GPT_5_NANO = 'gpt-5-nano';
export const MODEL_GPT_5_MINI = 'gpt-5-mini';
export const MODEL_GPT_5 = 'gpt-5';
export const MODEL_GPT_5_1 = 'gpt-5.1';
export const MODEL_GPT_5_4 = 'gpt-5.4';
export const MODEL_GPT_5_4_PRO = 'gpt-5.4-pro';

export const MODEL_GPT_4_1 = 'gpt-4.1';
export const MODEL_GPT_4_1_MINI = 'gpt-4.1-mini';
export const MODEL_GPT_4_1_NANO = 'gpt-4.1-nano';

export const MODEL_GPT_4O_MINI = 'gpt-4o-mini';
export const MODEL_GPT_4O = 'gpt-4o';
export const MODEL_O3_MINI = 'o3-mini';

export const MODEL_O1_MINI = 'o1-mini';
export const MODEL_O1 = 'o1';

// Vision support for models
export const VISION_SUPPORTED_MODELS = [
  MODEL_GPT_5_NANO,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5,
  MODEL_GPT_5_1,
  MODEL_GPT_5_4,
  MODEL_GPT_5_4_PRO,
  MODEL_GPT_4_1,
  MODEL_GPT_4_1_MINI,
  MODEL_GPT_4_1_NANO,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_O1,
  // MODEL_O3_MINI and MODEL_O1_MINI are not included as they don't support vision
];

// GPT-5 models list
export const GPT_5_MODELS = [
  MODEL_GPT_5_NANO,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5,
  MODEL_GPT_5_1,
  MODEL_GPT_5_4,
  MODEL_GPT_5_4_PRO,
];

export type OpenAIReasoningEffort =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh';

/**
 * Check if a model is a GPT-5 model
 * @param model Model name to check
 * @returns True if the model is a GPT-5 variant
 */
export function isGPT5Model(model: string): boolean {
  return GPT_5_MODELS.includes(model);
}

/**
 * GPT-5.4 Pro currently requires the Responses API endpoint
 */
export function isResponsesOnlyGPT5Model(model: string): boolean {
  return model === MODEL_GPT_5_4_PRO;
}

/**
 * Check if the provided model allows the reasoning_effort 'xhigh' level
 */
export function allowsReasoningXHigh(model: string): boolean {
  return model === MODEL_GPT_5_4 || model === MODEL_GPT_5_4_PRO;
}

/**
 * Check if the provided model allows the reasoning_effort 'none' shortcut
 * Supported by GPT-5.1 and GPT-5.4
 */
export function allowsReasoningNone(model: string): boolean {
  return model === MODEL_GPT_5_1 || model === MODEL_GPT_5_4;
}

/**
 * Check if the provided model allows the 'minimal' reasoning effort level
 * GPT-5.1 and GPT-5.4 variants remove 'minimal'
 */
export function allowsReasoningMinimal(model: string): boolean {
  return (
    model === MODEL_GPT_5_NANO ||
    model === MODEL_GPT_5_MINI ||
    model === MODEL_GPT_5
  );
}

/**
 * Check if the provided model allows the 'low' reasoning effort level
 * GPT-5.4 Pro starts from 'medium'
 */
export function allowsReasoningLow(model: string): boolean {
  return model !== MODEL_GPT_5_4_PRO;
}

/**
 * Get default reasoning effort by GPT-5 model family
 * - GPT-5.1 / GPT-5.4: none
 * - GPT-5.4 Pro and earlier GPT-5 variants: medium
 */
export function getDefaultReasoningEffortForGPT5Model(
  model: string,
): 'none' | 'medium' {
  if (model === MODEL_GPT_5_1 || model === MODEL_GPT_5_4) {
    return 'none';
  }
  return 'medium';
}
