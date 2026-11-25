import {
  ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
  MODEL_FUGU,
} from '../../../constants/sakana.js';
import { ChatResponseLength } from '../../../constants/chat.js';
import { ToolDefinition } from '../../../types/toolChat.js';
import { OpenAIChatService } from '../openai/OpenAIChatService.js';

export class SakanaChatService extends OpenAIChatService {
  constructor(
    apiKey: string,
    model: string = MODEL_FUGU,
    visionModel: string = model,
    tools?: ToolDefinition[],
    endpoint: string = ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
    responseLength?: ChatResponseLength,
    thinking?: { type: 'enabled' | 'disabled' },
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
      undefined,
      false,
      'sakana',
      false,
      undefined,
      thinking?.type === 'enabled',
    );
  }
}
