import {
  ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
  MODEL_FUGU,
} from '../../../constants/sakana';
import { ChatResponseLength } from '../../../constants/chat';
import { ToolDefinition } from '../../../types/toolChat';
import { OpenAIChatService } from '../openai/OpenAIChatService';

export class SakanaChatService extends OpenAIChatService {
  constructor(
    apiKey: string,
    model: string = MODEL_FUGU,
    visionModel: string = model,
    tools?: ToolDefinition[],
    endpoint: string = ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
    responseLength?: ChatResponseLength,
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
    );
  }
}
