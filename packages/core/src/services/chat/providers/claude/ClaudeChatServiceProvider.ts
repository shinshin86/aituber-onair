import {
  MODEL_CLAUDE_3_HAIKU,
  MODEL_CLAUDE_3_5_HAIKU,
  MODEL_CLAUDE_3_5_SONNET,
  MODEL_CLAUDE_3_7_SONNET,
  CLAUDE_VISION_SUPPORTED_MODELS,
} from '../../../../constants';
import { ChatService } from '../../ChatService';
import { ClaudeChatService } from './ClaudeChatService';
import {
  ChatServiceOptions,
  ChatServiceProvider,
} from '../ChatServiceProvider';

/**
 * Claude API provider implementation
 */
export class ClaudeChatServiceProvider implements ChatServiceProvider {
  /**
   * Create a chat service instance
   * @param options Service options
   * @returns ClaudeChatService instance
   */
  createChatService(options: ChatServiceOptions): ChatService {
    // Use the visionModel if provided, otherwise use the model that supports vision
    const visionModel =
      options.visionModel ||
      (this.supportsVisionForModel(options.model || this.getDefaultModel())
        ? options.model
        : this.getDefaultModel());

    return new ClaudeChatService(
      options.apiKey,
      options.model || this.getDefaultModel(),
      visionModel,
      options.tools ?? [],
    );
  }

  /**
   * Get the provider name
   * @returns Provider name ('claude')
   */
  getProviderName(): string {
    return 'claude';
  }

  /**
   * Get the list of supported models
   * @returns Array of supported model names
   */
  getSupportedModels(): string[] {
    return [
      MODEL_CLAUDE_3_HAIKU,
      MODEL_CLAUDE_3_5_HAIKU,
      MODEL_CLAUDE_3_5_SONNET,
      MODEL_CLAUDE_3_7_SONNET,
    ];
  }

  /**
   * Get the default model
   * @returns Default model name
   */
  getDefaultModel(): string {
    return MODEL_CLAUDE_3_HAIKU;
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
    return CLAUDE_VISION_SUPPORTED_MODELS.includes(model);
  }
}
