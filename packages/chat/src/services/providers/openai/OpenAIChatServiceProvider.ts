import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_O3_MINI,
  VISION_SUPPORTED_MODELS,
} from '../../../constants';
import { ChatService } from '../../ChatService';
import { OpenAIChatService } from './OpenAIChatService';
import {
  ChatServiceOptions,
  ChatServiceProvider,
} from '../ChatServiceProvider';
import { ToolDefinition } from '../../../types/toolChat';

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
    // Use the visionModel if provided, otherwise use the model that supports vision
    const visionModel =
      options.visionModel ||
      (this.supportsVisionForModel(options.model || this.getDefaultModel())
        ? options.model
        : this.getDefaultModel());

    // tools definition
    const tools: ToolDefinition[] | undefined = options.tools;

    // if MCP servers are set, automatically use Responses API
    const mcpServers = (options as any).mcpServers ?? [];
    const shouldUseResponsesAPI = mcpServers.length > 0;
    const endpoint =
      options.endpoint ||
      (shouldUseResponsesAPI
        ? ENDPOINT_OPENAI_RESPONSES_API
        : ENDPOINT_OPENAI_CHAT_COMPLETIONS_API);

    return new OpenAIChatService(
      options.apiKey,
      options.model || this.getDefaultModel(),
      visionModel,
      tools,
      endpoint,
      mcpServers,
    );
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
    return [MODEL_GPT_4O_MINI, MODEL_GPT_4O, MODEL_O3_MINI];
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

  /**
   * Check if a specific model supports vision capabilities
   * @param model The model name to check
   * @returns True if the model supports vision, false otherwise
   */
  supportsVisionForModel(model: string): boolean {
    return VISION_SUPPORTED_MODELS.includes(model);
  }
}
