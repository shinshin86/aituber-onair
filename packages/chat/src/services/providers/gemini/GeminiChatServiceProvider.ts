import {
  MODEL_GEMINI_3_1_PRO_PREVIEW,
  MODEL_GEMINI_3_PRO_PREVIEW,
  MODEL_GEMINI_3_FLASH_PREVIEW,
  MODEL_GEMINI_2_5_PRO,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_2_5_FLASH_LITE,
  MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_2_0_FLASH_LITE,
  GEMINI_VISION_SUPPORTED_MODELS,
} from '../../../constants';
import { ChatService } from '../../ChatService';
import { GeminiChatService } from './GeminiChatService';
import {
  GeminiChatServiceOptions,
  ChatServiceProvider,
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
    // Use the visionModel if provided, otherwise use the model that supports vision
    const visionModel = resolveVisionModel({
      model: options.model,
      visionModel: options.visionModel,
      defaultModel: this.getDefaultModel(),
      defaultVisionModel: this.getDefaultModel(),
      supportsVisionForModel: (model) => this.supportsVisionForModel(model),
      validate: 'resolved',
    });

    return new GeminiChatService(
      options.apiKey,
      options.model || this.getDefaultModel(),
      visionModel,
      options.tools || [],
      options.mcpServers || [],
      options.responseLength,
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
    return [
      MODEL_GEMINI_3_1_PRO_PREVIEW,
      MODEL_GEMINI_3_PRO_PREVIEW,
      MODEL_GEMINI_3_FLASH_PREVIEW,
      MODEL_GEMINI_2_5_PRO,
      MODEL_GEMINI_2_5_FLASH,
      MODEL_GEMINI_2_5_FLASH_LITE,
      MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
      MODEL_GEMINI_2_0_FLASH,
      MODEL_GEMINI_2_0_FLASH_LITE,
    ];
  }

  /**
   * Get the default model
   * @returns Default model name
   */
  getDefaultModel(): string {
    return MODEL_GEMINI_2_0_FLASH_LITE;
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
    return GEMINI_VISION_SUPPORTED_MODELS.includes(model);
  }
}
