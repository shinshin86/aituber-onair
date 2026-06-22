import {
  ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
  MODEL_PLAMO_3_0_PRIME,
  type PlamoReasoningEffort,
} from '../../../constants/plamo';
import { ChatResponseLength } from '../../../constants/chat';
import { ToolDefinition } from '../../../types/toolChat';
import { OpenAIChatService } from '../openai/OpenAIChatService';

export class PlamoChatService extends OpenAIChatService {
  constructor(
    apiKey: string,
    model: string = MODEL_PLAMO_3_0_PRIME,
    visionModel: string = model,
    tools?: ToolDefinition[],
    endpoint: string = ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
    responseLength?: ChatResponseLength,
    reasoning_effort?: PlamoReasoningEffort,
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
      reasoning_effort,
      false,
      'plamo',
      false,
    );
  }
}
