import {
  ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
  MODEL_DEEPSEEK_V4_FLASH,
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
      'deepseek',
      false,
    );
  }
}
