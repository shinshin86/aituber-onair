import {
  ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
  MODEL_GLM_5_3,
  MODEL_GLM_5_3_FLASH,
  MODEL_GLM_5_2,
  MODEL_GLM_5_1,
  MODEL_GLM_5,
  MODEL_GLM_5_TURBO,
  MODEL_GLM_5V_TURBO,
  MODEL_GLM_4_7,
  MODEL_GLM_4_7_FLASHX,
  MODEL_GLM_4_7_FLASH,
  MODEL_GLM_4_6,
  MODEL_GLM_4_6V,
  MODEL_GLM_4_6V_FLASHX,
  MODEL_GLM_4_6V_FLASH,
  getZaiSupportedReasoningEfforts,
  isZaiAlwaysThinkingModel,
  isZaiVisionModel,
  normalizeZaiReasoningEffort,
} from '../../../constants/zai';
import { ChatService } from '../../ChatService';
import { ZAIChatService } from './ZAIChatService';
import {
  ZAIChatServiceOptions,
  ChatServiceProvider,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { ToolDefinition } from '../../../types/toolChat';
import { resolveVisionModel } from '../../../utils';

/**
 * Z.ai API provider implementation
 */
export class ZAIChatServiceProvider
  implements ChatServiceProvider<ZAIChatServiceOptions>
{
  /**
   * Create a chat service instance
   */
  createChatService(options: ZAIChatServiceOptions): ChatService {
    const model = options.model || this.getDefaultModel();
    const visionModel = resolveVisionModel({
      model,
      visionModel: options.visionModel,
      defaultModel: this.getDefaultModel(),
      defaultVisionModel: this.getDefaultVisionModel(),
      supportsVisionForModel: (visionModel) =>
        this.supportsVisionForModel(visionModel),
      validate: 'explicit',
    });

    const tools: ToolDefinition[] | undefined = options.tools;
    const supportedReasoningEfforts = getZaiSupportedReasoningEfforts(model);
    if (
      options.reasoning_effort !== undefined &&
      !supportedReasoningEfforts.includes(options.reasoning_effort)
    ) {
      const supportedMessage =
        supportedReasoningEfforts.length > 0
          ? `Supported values: ${supportedReasoningEfforts.join(', ')}.`
          : 'This model does not expose configurable effort.';
      throw new Error(
        `Model ${model} does not support Z.ai reasoning_effort: ` +
          `${options.reasoning_effort}. ${supportedMessage}`,
      );
    }

    const normalizedReasoningEffort = normalizeZaiReasoningEffort(
      model,
      options.reasoning_effort,
    );
    const alwaysThinking = isZaiAlwaysThinkingModel(model);
    const usesExplicitThinking = options.thinking !== undefined;
    const thinking = alwaysThinking
      ? {
          type: 'enabled' as const,
          clear_thinking: options.thinking?.clear_thinking ?? true,
        }
      : usesExplicitThinking && options.reasoning_effort === undefined
        ? options.thinking
        : normalizedReasoningEffort === 'high' ||
            normalizedReasoningEffort === 'max'
          ? {
              type: 'enabled' as const,
              clear_thinking: options.thinking?.clear_thinking,
            }
          : {
              type: 'disabled' as const,
              clear_thinking: options.thinking?.clear_thinking,
            };
    const reasoningEffort = alwaysThinking
      ? normalizedReasoningEffort
      : thinking?.type === 'enabled' && options.reasoning_effort !== undefined
        ? normalizedReasoningEffort
        : undefined;

    return new ZAIChatService(
      options.apiKey,
      model,
      visionModel,
      tools,
      options.endpoint || ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
      options.responseLength,
      options.responseFormat,
      thinking,
      reasoningEffort,
    );
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return 'zai';
  }

  /**
   * Get the list of supported models
   */
  getSupportedModels(): string[] {
    return [
      MODEL_GLM_5_3,
      MODEL_GLM_5_3_FLASH,
      MODEL_GLM_5_2,
      MODEL_GLM_5_1,
      MODEL_GLM_5,
      MODEL_GLM_5_TURBO,
      MODEL_GLM_5V_TURBO,
      MODEL_GLM_4_7,
      MODEL_GLM_4_7_FLASHX,
      MODEL_GLM_4_7_FLASH,
      MODEL_GLM_4_6,
      MODEL_GLM_4_6V,
      MODEL_GLM_4_6V_FLASHX,
      MODEL_GLM_4_6V_FLASH,
    ];
  }

  /**
   * Get the default model
   */
  getDefaultModel(): string {
    return MODEL_GLM_5_2;
  }

  /**
   * Get the default vision model
   */
  private getDefaultVisionModel(): string {
    return MODEL_GLM_4_6V_FLASH;
  }

  /**
   * Check if this provider supports vision
   */
  supportsVision(): boolean {
    return this.getVisionSupportLevel() !== 'unsupported';
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'supported';
  }

  /**
   * Check if a specific model supports vision capabilities
   */
  supportsVisionForModel(model: string): boolean {
    return isZaiVisionModel(model);
  }

  getVisionSupportLevelForModel(model: string): VisionSupportLevel {
    return this.supportsVisionForModel(model) ? 'supported' : 'unsupported';
  }
}
