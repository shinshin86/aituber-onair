import {
  ENDPOINT_KIMI_CHAT_COMPLETIONS_API,
  MODEL_KIMI_K2_5,
  isKimiVisionModel,
} from '../../../constants/kimi';
import { ChatService } from '../../ChatService';
import { KimiChatService } from './KimiChatService';
import {
  KimiChatServiceOptions,
  ChatServiceProvider,
} from '../ChatServiceProvider';
import { ToolDefinition } from '../../../types/toolChat';
import { resolveVisionModel } from '../../../utils';

/**
 * Kimi API provider implementation
 */
export class KimiChatServiceProvider
  implements ChatServiceProvider<KimiChatServiceOptions>
{
  /**
   * Create a chat service instance
   */
  createChatService(options: KimiChatServiceOptions): ChatService {
    const endpoint = this.resolveEndpoint(options);
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
    const defaultThinking = options.thinking ?? { type: 'enabled' as const };
    const thinking =
      tools && tools.length > 0
        ? { type: 'disabled' as const }
        : defaultThinking;

    return new KimiChatService(
      options.apiKey,
      model,
      visionModel,
      tools,
      endpoint,
      options.responseLength,
      options.responseFormat,
      thinking,
    );
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return 'kimi';
  }

  /**
   * Get the list of supported models
   */
  getSupportedModels(): string[] {
    return [MODEL_KIMI_K2_5];
  }

  /**
   * Get the default model
   */
  getDefaultModel(): string {
    return MODEL_KIMI_K2_5;
  }

  /**
   * Get the default vision model
   */
  private getDefaultVisionModel(): string {
    return MODEL_KIMI_K2_5;
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
    return isKimiVisionModel(model);
  }

  private resolveEndpoint(options: KimiChatServiceOptions): string {
    if (options.endpoint) {
      return this.normalizeEndpoint(options.endpoint);
    }
    if (options.baseUrl) {
      const baseUrl = this.normalizeEndpoint(options.baseUrl);
      if (baseUrl.endsWith('/chat/completions')) {
        return baseUrl;
      }
      return `${baseUrl}/chat/completions`;
    }
    return ENDPOINT_KIMI_CHAT_COMPLETIONS_API;
  }

  private normalizeEndpoint(value: string): string {
    return value.replace(/\/+$/, '');
  }
}
