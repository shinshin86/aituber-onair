import { MODEL_GPT_4O_MINI } from '../../../constants';
import { ChatService } from '../ChatService';
import { OpenAIChatService } from '../OpenAIChatService';
import { ChatServiceOptions, ChatServiceProvider } from './ChatServiceProvider';

/**
 * OpenAI API provider implementation
 */
export class OpenAIChatServiceProvider implements ChatServiceProvider {
  /**
   * Create a chat service instance
   * @param options Service options
   * @returns OpenAIChatService instance
   */
  createChatService(options: ChatServiceOptions): ChatService {
    return new OpenAIChatService(options.apiKey, options.model);
  }

  /**
   * Get the provider name
   * @returns Provider name ('openai')
   */
  getProviderName(): string {
    return 'openai';
  }

  /**
   * Get the list of supported models
   * @returns Array of supported model names
   */
  getSupportedModels(): string[] {
    return [MODEL_GPT_4O_MINI];
  }

  /**
   * Get the default model
   * @returns Default model name
   */
  getDefaultModel(): string {
    return MODEL_GPT_4O_MINI;
  }

  /**
   * Check if this provider supports vision (image processing)
   * @returns Vision support status (true)
   */
  supportsVision(): boolean {
    return true;
  }
}
