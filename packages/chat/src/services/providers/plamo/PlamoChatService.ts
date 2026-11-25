import {
  ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
  MODEL_PLAMO_3_0_PRIME,
  type PlamoReasoningEffort,
} from '../../../constants/plamo.js';
import { ChatResponseLength } from '../../../constants/chat.js';
import { ToolDefinition } from '../../../types/toolChat.js';
import { OpenAIChatService } from '../openai/OpenAIChatService.js';

export class PlamoChatService extends OpenAIChatService {
  constructor(
    apiKey: string,
    model: string = MODEL_PLAMO_3_0_PRIME,
    visionModel: string = model,
    tools?: ToolDefinition[],
    endpoint: string = ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
    responseLength?: ChatResponseLength,
    reasoning_effort: PlamoReasoningEffort = 'none',
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
