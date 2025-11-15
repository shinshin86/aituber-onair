import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  MODEL_GPT_5_NANO,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5,
  MODEL_GPT_5_CHAT_LATEST,
  MODEL_GPT_5_1,
  MODEL_GPT_4_1,
  MODEL_GPT_4_1_MINI,
  MODEL_GPT_4_1_NANO,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_O3_MINI,
  MODEL_O1_MINI,
  MODEL_O1,
  MODEL_GPT_4_5_PREVIEW,
  VISION_SUPPORTED_MODELS,
  isGPT5Model,
} from '../../../constants';
import { GPT5_PRESETS } from '../../../constants/chat';
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
    // Apply GPT-5 optimizations if needed
    const optimizedOptions = this.optimizeGPT5Options(options);
    // Use the visionModel if provided, otherwise use the model that supports vision
    const visionModel =
      optimizedOptions.visionModel ||
      (this.supportsVisionForModel(
        optimizedOptions.model || this.getDefaultModel(),
      )
        ? optimizedOptions.model
        : this.getDefaultModel());

    // tools definition
    const tools: ToolDefinition[] | undefined = optimizedOptions.tools;

    // Determine endpoint based on MCP servers, GPT-5 model, and user preference
    const mcpServers = (optimizedOptions as any).mcpServers ?? [];
    const modelName = optimizedOptions.model || this.getDefaultModel();

    // Determine endpoint preference
    let shouldUseResponsesAPI = false;

    // MCP requires Responses API regardless of model
    if (mcpServers.length > 0) {
      shouldUseResponsesAPI = true;
    } else if (isGPT5Model(modelName)) {
      // For GPT-5 models without MCP, respect user endpoint preference
      const preference = optimizedOptions.gpt5EndpointPreference || 'chat'; // Default to chat API for GPT-5
      shouldUseResponsesAPI = preference === 'responses';
    }

    const endpoint =
      optimizedOptions.endpoint ||
      (shouldUseResponsesAPI
        ? ENDPOINT_OPENAI_RESPONSES_API
        : ENDPOINT_OPENAI_CHAT_COMPLETIONS_API);

    return new OpenAIChatService(
      optimizedOptions.apiKey,
      modelName,
      visionModel,
      tools,
      endpoint,
      mcpServers,
      optimizedOptions.responseLength,
      optimizedOptions.verbosity,
      optimizedOptions.reasoning_effort,
      optimizedOptions.enableReasoningSummary,
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
    return [
      MODEL_GPT_5_NANO,
      MODEL_GPT_5_MINI,
      MODEL_GPT_5,
      MODEL_GPT_5_CHAT_LATEST,
      MODEL_GPT_5_1,
      MODEL_GPT_4_1,
      MODEL_GPT_4_1_MINI,
      MODEL_GPT_4_1_NANO,
      MODEL_GPT_4O_MINI,
      MODEL_GPT_4O,
      MODEL_O3_MINI,
      MODEL_O1_MINI,
      MODEL_O1,
      MODEL_GPT_4_5_PREVIEW,
    ];
  }

  /**
   * Get the default model
   * @returns Default model name
   */
  getDefaultModel(): string {
    return MODEL_GPT_5_NANO;
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

  /**
   * Apply GPT-5 specific optimizations to options
   * @param options Original chat service options
   * @returns Optimized options for GPT-5 usage
   */
  private optimizeGPT5Options(options: ChatServiceOptions): ChatServiceOptions {
    const modelName = options.model || this.getDefaultModel();

    // Skip optimization for non-GPT-5 models
    if (!isGPT5Model(modelName)) {
      return options;
    }

    const optimized = { ...options };

    // Apply preset if specified (only affects reasoning_effort and verbosity)
    if (options.gpt5Preset) {
      const preset = GPT5_PRESETS[options.gpt5Preset];
      optimized.reasoning_effort = preset.reasoning_effort;
      optimized.verbosity = preset.verbosity;
    } else {
      // Set default reasoning_effort if not specified
      if (!options.reasoning_effort) {
        optimized.reasoning_effort =
          this.getDefaultReasoningEffortForModel(modelName);
      }
    }

    // Keep the user's selected response length regardless of API endpoint
    // Users can manually select reasoning response lengths if desired

    return optimized;
  }

  /**
   * Determine the default reasoning effort for GPT-5 family models
   * GPT-5.1 defaults to 'none' (fastest), earlier GPT-5 defaults to 'medium'
   */
  private getDefaultReasoningEffortForModel(
    modelName: string,
  ): 'none' | 'medium' {
    if (modelName === MODEL_GPT_5_1) {
      return 'none';
    }
    return 'medium';
  }
}
