import {
  MODEL_CLAUDE_3_HAIKU,
  MODEL_CLAUDE_3_5_HAIKU,
  MODEL_CLAUDE_3_5_SONNET,
  MODEL_CLAUDE_3_7_SONNET,
  MODEL_CLAUDE_4_SONNET,
  MODEL_CLAUDE_4_OPUS,
  MODEL_CLAUDE_4_5_SONNET,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_5_OPUS,
  MODEL_CLAUDE_4_6_SONNET,
  MODEL_CLAUDE_4_6_OPUS,
  CLAUDE_VISION_SUPPORTED_MODELS,
} from '../../../constants';
import { ChatService } from '../../ChatService';
import { ClaudeChatService } from './ClaudeChatService';
// import { MCPServerConfig } from '../../../types';
import {
  ClaudeChatServiceOptions,
  ChatServiceProvider,
} from '../ChatServiceProvider';
import { resolveVisionModel } from '../../../utils';

/**
 * Claude API provider implementation
 */
export class ClaudeChatServiceProvider
  implements ChatServiceProvider<ClaudeChatServiceOptions>
{
  /**
   * Create a chat service instance
   * @param options Service options (can include mcpServers)
   * @returns ClaudeChatService instance
   */
  createChatService(options: ClaudeChatServiceOptions): ChatService {
    // Use the visionModel if provided, otherwise use the model that supports vision
    const visionModel = resolveVisionModel({
      model: options.model,
      visionModel: options.visionModel,
      defaultModel: this.getDefaultModel(),
      defaultVisionModel: this.getDefaultModel(),
      supportsVisionForModel: (model) => this.supportsVisionForModel(model),
      validate: 'resolved',
    });

    return new ClaudeChatService(
      options.apiKey,
      options.model || this.getDefaultModel(),
      visionModel,
      options.tools ?? [],
      options.mcpServers ?? [],
      options.responseLength,
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
      MODEL_CLAUDE_4_SONNET,
      MODEL_CLAUDE_4_OPUS,
      MODEL_CLAUDE_4_5_SONNET,
      MODEL_CLAUDE_4_5_HAIKU,
      MODEL_CLAUDE_4_5_OPUS,
      MODEL_CLAUDE_4_6_SONNET,
      MODEL_CLAUDE_4_6_OPUS,
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
