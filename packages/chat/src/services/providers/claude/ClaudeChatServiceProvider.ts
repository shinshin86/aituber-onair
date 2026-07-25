import {
  MODEL_CLAUDE_3_HAIKU,
  MODEL_CLAUDE_4_SONNET,
  MODEL_CLAUDE_4_OPUS,
  MODEL_CLAUDE_4_5_SONNET,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_5_OPUS,
  MODEL_CLAUDE_4_6_SONNET,
  MODEL_CLAUDE_4_6_OPUS,
  MODEL_CLAUDE_4_7_OPUS,
  MODEL_CLAUDE_4_8_OPUS,
  MODEL_CLAUDE_5_SONNET,
  MODEL_CLAUDE_5_OPUS,
  CLAUDE_VISION_SUPPORTED_MODELS,
  getClaudeSupportedReasoningEfforts,
} from '../../../constants';
import { ChatService } from '../../ChatService';
import { ClaudeChatService } from './ClaudeChatService';
// import { MCPServerConfig } from '../../../types';
import {
  ClaudeChatServiceOptions,
  ChatServiceProvider,
  VisionSupportLevel,
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
    const model = options.model || this.getDefaultModel();
    const supportedReasoningEfforts = getClaudeSupportedReasoningEfforts(model);
    if (
      options.reasoning_effort !== undefined &&
      !supportedReasoningEfforts.includes(options.reasoning_effort)
    ) {
      const supportedMessage =
        supportedReasoningEfforts.length > 0
          ? `Supported values: ${supportedReasoningEfforts.join(', ')}.`
          : 'This model does not expose configurable effort.';
      throw new Error(
        `Model ${model} does not support Claude reasoning_effort: ` +
          `${options.reasoning_effort}. ${supportedMessage}`,
      );
    }

    // Use the visionModel if provided, otherwise use the model that supports vision
    const visionModel = resolveVisionModel({
      model,
      visionModel: options.visionModel,
      defaultModel: this.getDefaultModel(),
      defaultVisionModel: this.getDefaultModel(),
      supportsVisionForModel: (model) => this.supportsVisionForModel(model),
      validate: 'resolved',
    });

    return new ClaudeChatService(
      options.apiKey,
      model,
      visionModel,
      options.tools ?? [],
      options.mcpServers ?? [],
      options.responseLength,
      options.reasoning_effort,
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
      MODEL_CLAUDE_4_SONNET,
      MODEL_CLAUDE_4_OPUS,
      MODEL_CLAUDE_4_5_SONNET,
      MODEL_CLAUDE_4_5_HAIKU,
      MODEL_CLAUDE_4_5_OPUS,
      MODEL_CLAUDE_4_6_SONNET,
      MODEL_CLAUDE_4_6_OPUS,
      MODEL_CLAUDE_4_7_OPUS,
      MODEL_CLAUDE_4_8_OPUS,
      MODEL_CLAUDE_5_SONNET,
      MODEL_CLAUDE_5_OPUS,
      MODEL_CLAUDE_3_HAIKU,
    ];
  }

  /**
   * Get the default model
   * @returns Default model name
   */
  getDefaultModel(): string {
    return MODEL_CLAUDE_4_5_HAIKU;
  }

  /**
   * Check if this provider supports vision (image processing)
   * @returns Vision support status (true)
   */
  supportsVision(): boolean {
    return this.getVisionSupportLevel() !== 'unsupported';
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'supported';
  }

  /**
   * Check if a specific model supports vision capabilities
   * @param model The model name to check
   * @returns True if the model supports vision, false otherwise
   */
  supportsVisionForModel(model: string): boolean {
    return CLAUDE_VISION_SUPPORTED_MODELS.includes(model);
  }

  getVisionSupportLevelForModel(model: string): VisionSupportLevel {
    return this.supportsVisionForModel(model) ? 'supported' : 'unsupported';
  }
}
