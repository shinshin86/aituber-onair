import {
  GEMINI_VISION_SUPPORTED_MODELS,
  GEMINI_RECOMMENDED_MODELS,
  MODEL_GEMINI_3_1_FLASH_LITE,
  isGeminiReasoningEffortModel,
  normalizeGeminiReasoningEffort,
} from '../../../constants';
import { ChatService } from '../../ChatService';
import { GeminiChatService } from './GeminiChatService';
import {
  GeminiChatServiceOptions,
  ChatServiceProvider,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { resolveVisionModel } from '../../../utils';

/**
 * Gemini API provider implementation
 */
export class GeminiChatServiceProvider
  implements ChatServiceProvider<GeminiChatServiceOptions>
{
  /**
   * Create a chat service instance
   * @param options Service options
   * @returns GeminiChatService instance
   */
  createChatService(options: GeminiChatServiceOptions): ChatService {
    const model = options.model || this.getDefaultModel();
    if (
      options.reasoning_effort !== undefined &&
      !isGeminiReasoningEffortModel(model)
    ) {
      throw new Error(
        `Model ${model} does not support Gemini reasoning_effort. ` +
          'Use it with Gemini 3 thinkingLevel models; ' +
          'Gemini 2.5 models use thinkingBudget instead.',
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

    return new GeminiChatService(
      options.apiKey,
      model,
      visionModel,
      options.tools || [],
      options.mcpServers || [],
      options.responseLength,
      normalizeGeminiReasoningEffort(model, options.reasoning_effort),
    );
  }

  /**
   * Get the provider name
   * @returns Provider name ('gemini')
   */
  getProviderName(): string {
    return 'gemini';
  }

  /**
   * Get the list of supported models
   * @returns Array of supported model names
   */
  getSupportedModels(): string[] {
    return [...GEMINI_RECOMMENDED_MODELS];
  }

  /**
   * Get the default model
   * @returns Default model name
   */
  getDefaultModel(): string {
    return MODEL_GEMINI_3_1_FLASH_LITE;
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
    return GEMINI_VISION_SUPPORTED_MODELS.includes(model);
  }

  getVisionSupportLevelForModel(model: string): VisionSupportLevel {
    return this.supportsVisionForModel(model) ? 'supported' : 'unsupported';
  }
}
