import {
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  MODEL_MISTRAL_SMALL_LATEST,
} from '../../../constants/mistral';
import { ChatResponseLength } from '../../../constants/chat';
import { ToolDefinition } from '../../../types/toolChat';
import { OpenAIChatService } from '../openai/OpenAIChatService';
import type { MistralReasoningEffort } from '../../../constants/mistral';

export class MistralChatService extends OpenAIChatService {
  constructor(
    apiKey: string,
    model: string = MODEL_MISTRAL_SMALL_LATEST,
    visionModel: string = model,
    tools?: ToolDefinition[],
    endpoint: string = ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
    responseLength?: ChatResponseLength,
    reasoningEffort?: MistralReasoningEffort,
  ) {
    super(
      apiKey,
      model,
      visionModel,
      tools,
      endpoint,
      [],
      responseLength,
      undefined,
      reasoningEffort,
      false,
      'mistral',
      false,
    );
  }
}
