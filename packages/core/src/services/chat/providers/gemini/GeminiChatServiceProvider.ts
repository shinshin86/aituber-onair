import {
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_2_0_FLASH_LITE,
  MODEL_GEMINI_1_5_FLASH,
  GEMINI_VISION_SUPPORTED_MODELS,
} from '../../../../constants';
import { ChatService } from '../../ChatService';
import { GeminiChatService } from './GeminiChatService';
import {
  ChatServiceOptions,
  ChatServiceProvider,
} from '../ChatServiceProvider';

/**
 * Gemini API provider implementation
 */
export class GeminiChatServiceProvider implements ChatServiceProvider {
  /**
   * Create a chat service instance
   * @param options Service options
   * @returns GeminiChatService instance
   */
  createChatService(options: ChatServiceOptions): ChatService {
    // Use the visionModel if provided, otherwise use the model that supports vision
    const visionModel =
      options.visionModel ||
      (this.supportsVisionForModel(options.model || this.getDefaultModel())
        ? options.model
        : this.getDefaultModel());

    return new GeminiChatService(
      options.apiKey,
      options.model || this.getDefaultModel(),
      visionModel,
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
      MODEL_GEMINI_2_0_FLASH,
      MODEL_GEMINI_2_0_FLASH_LITE,
      MODEL_GEMINI_1_5_FLASH,
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
