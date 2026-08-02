import {
  ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
  type DeepSeekReasoningEffort,
  MODEL_DEEPSEEK_V4_FLASH,
  normalizeDeepSeekReasoningEffort,
} from '../../../constants/deepseek';
import { ChatResponseLength } from '../../../constants/chat';
import { ToolDefinition } from '../../../types/toolChat';
import { OpenAIChatService } from '../openai/OpenAIChatService';

export class DeepSeekChatService extends OpenAIChatService {
  constructor(
    apiKey: string,
    model: string = MODEL_DEEPSEEK_V4_FLASH,
    visionModel: string = model,
    tools?: ToolDefinition[],
    endpoint: string = ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
    responseLength?: ChatResponseLength,
    reasoningEffort?: DeepSeekReasoningEffort,
  ) {
    const normalizedReasoningEffort = normalizeDeepSeekReasoningEffort(
      model,
      reasoningEffort,
    );
    super(
      apiKey,
      model,
      visionModel,
      tools,
      endpoint,
      [],
      responseLength,
      undefined,
      normalizedReasoningEffort,
      false,
      'deepseek',
      false,
    );

    if (
      tools?.length &&
      normalizedReasoningEffort !== undefined &&
      normalizedReasoningEffort !== 'none'
    ) {
      throw new Error(
        'DeepSeek thinking with tools is not supported yet. ' +
          "Use reasoning_effort: 'none' for tool calling.",
      );
    }
  }
}
