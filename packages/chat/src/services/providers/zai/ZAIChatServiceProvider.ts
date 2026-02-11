import {
  ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
  MODEL_GLM_5,
  MODEL_GLM_4_7,
  MODEL_GLM_4_7_FLASHX,
  MODEL_GLM_4_7_FLASH,
  MODEL_GLM_4_6,
  MODEL_GLM_4_6V,
  MODEL_GLM_4_6V_FLASHX,
  MODEL_GLM_4_6V_FLASH,
  isZaiVisionModel,
} from '../../../constants/zai';
import { ChatService } from '../../ChatService';
import { ZAIChatService } from './ZAIChatService';
import {
  ZAIChatServiceOptions,
  ChatServiceProvider,
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
    const thinking = options.thinking ?? { type: 'disabled' as const };

    return new ZAIChatService(
      options.apiKey,
      model,
      visionModel,
      tools,
      options.endpoint || ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
      options.responseLength,
      options.responseFormat,
      thinking,
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
      MODEL_GLM_5,
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
    return MODEL_GLM_4_7;
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
    return true;
  }

  /**
   * Check if a specific model supports vision capabilities
   */
  supportsVisionForModel(model: string): boolean {
    return isZaiVisionModel(model);
  }
}
