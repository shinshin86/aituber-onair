import { MODEL_GPT_4O_MINI, MODEL_GPT_4O, MODEL_O3_MINI, VISION_SUPPORTED_MODELS } from '../../../../constants';
import { ChatService } from '../../ChatService';
import { OpenAIChatService } from './OpenAIChatService';
import { ChatServiceOptions, ChatServiceProvider } from '../ChatServiceProvider';

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
    const visionModel = options.visionModel || 
      (this.supportsVisionForModel(options.model || this.getDefaultModel()) 
        ? options.model 
        : this.getDefaultModel());
    
    return new OpenAIChatService(
      options.apiKey, 
      options.model || this.getDefaultModel(), 
      visionModel
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
