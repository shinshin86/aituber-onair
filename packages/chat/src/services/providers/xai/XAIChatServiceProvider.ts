import {
  ENDPOINT_XAI_CHAT_COMPLETIONS_API,
  MODEL_GROK_4_3,
  MODEL_GROK_4_20_REASONING,
  MODEL_GROK_4_20_NON_REASONING,
  MODEL_GROK_4_1_FAST_REASONING,
  MODEL_GROK_4_1_FAST_NON_REASONING,
  isXaiVisionModel,
} from '../../../constants/xai';
import { ChatService } from '../../ChatService';
import { XAIChatService } from './XAIChatService';
import {
  XAIChatServiceOptions,
  ChatServiceProvider,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { ToolDefinition } from '../../../types/toolChat';
import { resolveVisionModel } from '../../../utils';

/**
 * xAI API provider implementation
 */
export class XAIChatServiceProvider
  implements ChatServiceProvider<XAIChatServiceOptions>
{
  /**
   * Create a chat service instance
   */
  createChatService(options: XAIChatServiceOptions): ChatService {
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

    return new XAIChatService(
      options.apiKey,
      model,
      visionModel,
      tools,
      options.endpoint || ENDPOINT_XAI_CHAT_COMPLETIONS_API,
      options.responseLength,
    );
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return 'xai';
  }

  /**
   * Get the list of supported models
   */
  getSupportedModels(): string[] {
    return [
      MODEL_GROK_4_3,
      MODEL_GROK_4_20_REASONING,
      MODEL_GROK_4_20_NON_REASONING,
      MODEL_GROK_4_1_FAST_REASONING,
      MODEL_GROK_4_1_FAST_NON_REASONING,
    ];
  }

  /**
   * Get the default model
   */
  getDefaultModel(): string {
    return MODEL_GROK_4_1_FAST_NON_REASONING;
  }

  /**
   * Get the default vision model
   */
  private getDefaultVisionModel(): string {
    return MODEL_GROK_4_1_FAST_NON_REASONING;
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
    return isXaiVisionModel(model);
  }

  getVisionSupportLevelForModel(model: string): VisionSupportLevel {
    return this.supportsVisionForModel(model) ? 'supported' : 'unsupported';
  }
}
