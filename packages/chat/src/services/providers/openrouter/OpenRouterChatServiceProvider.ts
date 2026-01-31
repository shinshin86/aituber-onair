import {
  MODEL_GPT_OSS_20B_FREE,
  MODEL_MOONSHOTAI_KIMI_K2_5,
  MODEL_OPENAI_GPT_5_1_CHAT,
  MODEL_OPENAI_GPT_5_1_CODEX,
  MODEL_OPENAI_GPT_5_MINI,
  MODEL_OPENAI_GPT_5_NANO,
  MODEL_OPENAI_GPT_4O,
  MODEL_OPENAI_GPT_4_1_MINI,
  MODEL_OPENAI_GPT_4_1_NANO,
  MODEL_ANTHROPIC_CLAUDE_OPUS_4,
  MODEL_ANTHROPIC_CLAUDE_SONNET_4,
  MODEL_ANTHROPIC_CLAUDE_3_7_SONNET,
  MODEL_ANTHROPIC_CLAUDE_3_5_SONNET,
  MODEL_ANTHROPIC_CLAUDE_4_5_HAIKU,
  MODEL_GOOGLE_GEMINI_2_5_PRO,
  MODEL_GOOGLE_GEMINI_2_5_FLASH,
  MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025,
  MODEL_ZAI_GLM_4_7_FLASH,
  MODEL_ZAI_GLM_4_5_AIR,
  MODEL_ZAI_GLM_4_5_AIR_FREE,
  OPENROUTER_FREE_MODELS,
  isOpenRouterVisionModel,
} from '../../../constants/openrouter';
import { ChatService } from '../../ChatService';
import { OpenRouterChatService } from './OpenRouterChatService';
import {
  OpenRouterChatServiceOptions,
  ChatServiceProvider,
} from '../ChatServiceProvider';
import { ToolDefinition } from '../../../types/toolChat';
import { resolveVisionModel } from '../../../utils';

/**
 * OpenRouter API provider implementation
 * Provides access to multiple AI models through OpenRouter's unified API
 */
export class OpenRouterChatServiceProvider
  implements ChatServiceProvider<OpenRouterChatServiceOptions>
{
  /**
   * Create a chat service instance
   * @param options Service options
   * @returns OpenRouterChatService instance
   */
  createChatService(options: OpenRouterChatServiceOptions): ChatService {
    // For OpenRouter, use the main model as vision model placeholder
    // Only validate if visionModel is explicitly provided
    const visionModel = resolveVisionModel({
      model: options.model,
      visionModel: options.visionModel,
      defaultModel: this.getDefaultModel(),
      defaultVisionModel: options.model || this.getDefaultModel(),
      supportsVisionForModel: (visionModel) =>
        this.supportsVisionForModel(visionModel),
      validate: 'explicit',
    });

    // Tools definition
    const tools: ToolDefinition[] | undefined = options.tools;

    // Extract OpenRouter-specific options
    const appName = options.appName;
    const appUrl = options.appUrl;

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
      options.reasoningMaxTokens,
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
   * Supports a curated list of OpenRouter models
   * @returns Array of supported model names
   */
  getSupportedModels(): string[] {
    return [
      // Free models
      MODEL_GPT_OSS_20B_FREE,
      MODEL_ZAI_GLM_4_5_AIR_FREE,
      // OpenAI models
      MODEL_OPENAI_GPT_5_1_CHAT,
      MODEL_OPENAI_GPT_5_1_CODEX,
      MODEL_OPENAI_GPT_5_MINI,
      MODEL_OPENAI_GPT_5_NANO,
      MODEL_OPENAI_GPT_4O,
      MODEL_OPENAI_GPT_4_1_MINI,
      MODEL_OPENAI_GPT_4_1_NANO,
      // Anthropic models
      MODEL_ANTHROPIC_CLAUDE_OPUS_4,
      MODEL_ANTHROPIC_CLAUDE_SONNET_4,
      MODEL_ANTHROPIC_CLAUDE_3_7_SONNET,
      MODEL_ANTHROPIC_CLAUDE_3_5_SONNET,
      MODEL_ANTHROPIC_CLAUDE_4_5_HAIKU,
      // Gemini models
      MODEL_GOOGLE_GEMINI_2_5_PRO,
      MODEL_GOOGLE_GEMINI_2_5_FLASH,
      MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025,
      // Z.ai models
      MODEL_ZAI_GLM_4_7_FLASH,
      MODEL_ZAI_GLM_4_5_AIR,
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
    return this.getSupportedModels().some((model) =>
      this.supportsVisionForModel(model),
    );
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
