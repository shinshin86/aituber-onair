import {
  MODEL_GPT_OSS_20B_FREE,
  MODEL_MOONSHOTAI_KIMI_K2_5,
  OPENROUTER_FREE_MODELS,
  isOpenRouterVisionModel,
} from '../../../constants/openrouter';
import { ChatService } from '../../ChatService';
import { OpenRouterChatService } from './OpenRouterChatService';
import {
  ChatServiceOptions,
  ChatServiceProvider,
} from '../ChatServiceProvider';
import { ToolDefinition } from '../../../types/toolChat';

/**
 * OpenRouter API provider implementation
 * Provides access to multiple AI models through OpenRouter's unified API
 */
export class OpenRouterChatServiceProvider implements ChatServiceProvider {
  /**
   * Create a chat service instance
   * @param options Service options
   * @returns OpenRouterChatService instance
   */
  createChatService(options: ChatServiceOptions): ChatService {
    // For OpenRouter, use the main model as vision model placeholder
    // Only validate if visionModel is explicitly provided
    const visionModel =
      options.visionModel || options.model || this.getDefaultModel();

    // If visionModel is explicitly provided and different from main model, validate it
    if (
      options.visionModel &&
      !this.supportsVisionForModel(options.visionModel)
    ) {
      throw new Error(
        `Model ${options.visionModel} does not support vision capabilities.`,
      );
    }

    // Tools definition
    const tools: ToolDefinition[] | undefined = options.tools;

    // Extract OpenRouter-specific options
    const appName = (options as any).appName;
    const appUrl = (options as any).appUrl;

    return new OpenRouterChatService(
      options.apiKey,
      options.model || this.getDefaultModel(),
      visionModel,
      tools,
      options.endpoint,
      options.responseLength,
      appName,
      appUrl,
      options.reasoning_effort,
      options.includeReasoning,
      (options as any).reasoningMaxTokens,
    );
  }

  /**
   * Get the provider name
   * @returns Provider name ('openrouter')
   */
  getProviderName(): string {
    return 'openrouter';
  }

  /**
   * Get the list of supported models
   * Supports gpt-oss-20b:free and moonshotai/kimi-k2.5
   * @returns Array of supported model names
   */
  getSupportedModels(): string[] {
    return [
      // Free models
      MODEL_GPT_OSS_20B_FREE,
      // Other models
      MODEL_MOONSHOTAI_KIMI_K2_5,
    ];
  }

  /**
   * Get the default model
   * @returns Default model name (gpt-oss-20b:free)
   */
  getDefaultModel(): string {
    return MODEL_GPT_OSS_20B_FREE;
  }

  /**
   * Check if this provider supports vision (image processing)
   * @returns Vision support status (false - gpt-oss-20b does not support vision)
   */
  supportsVision(): boolean {
    return false;
  }

  /**
   * Check if a specific model supports vision capabilities
   * @param model The model name to check
   * @returns True if the model supports vision, false otherwise
   */
  supportsVisionForModel(model: string): boolean {
    return isOpenRouterVisionModel(model);
  }

  /**
   * Get list of free tier models
   * @returns Array of free model names
   */
  getFreeModels(): string[] {
    return OPENROUTER_FREE_MODELS;
  }

  /**
   * Check if a model is free tier
   * @param model Model name to check
   * @returns True if the model is free
   */
  isModelFree(model: string): boolean {
    return OPENROUTER_FREE_MODELS.includes(model) || model.endsWith(':free');
  }
}
