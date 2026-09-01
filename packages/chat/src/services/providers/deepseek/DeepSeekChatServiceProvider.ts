import {
  DEEPSEEK_SUPPORTED_MODELS,
  ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
  MODEL_DEEPSEEK_V4_FLASH,
  MODEL_DEEPSEEK_V4_FLASH_VISION_EXP,
  isDeepSeekVisionModel,
} from '../../../constants/deepseek';
import { ChatService } from '../../ChatService';
import {
  ChatServiceProvider,
  DeepSeekChatServiceOptions,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { DeepSeekChatService } from './DeepSeekChatService';
import { ToolDefinition } from '../../../types/toolChat';
import { resolveVisionModel } from '../../../utils';

export class DeepSeekChatServiceProvider
  implements ChatServiceProvider<DeepSeekChatServiceOptions>
{
  createChatService(options: DeepSeekChatServiceOptions): ChatService {
    this.validateRequiredOptions(options);

    const model = options.model || this.getDefaultModel();
    const visionModel = resolveVisionModel({
      model,
      visionModel: options.visionModel,
      defaultModel: this.getDefaultModel(),
      defaultVisionModel: MODEL_DEEPSEEK_V4_FLASH_VISION_EXP,
      supportsVisionForModel: (visionModel) =>
        this.supportsVisionForModel(visionModel),
      validate: 'explicit',
    });
    const tools: ToolDefinition[] | undefined = options.tools;

    return new DeepSeekChatService(
      options.apiKey,
      model,
      visionModel,
      tools,
      this.resolveEndpoint(options),
      options.responseLength,
      options.reasoning_effort,
    );
  }

  getProviderName(): string {
    return 'deepseek';
  }

  getSupportedModels(): string[] {
    return [...DEEPSEEK_SUPPORTED_MODELS];
  }

  getDefaultModel(): string {
    return MODEL_DEEPSEEK_V4_FLASH;
  }

  supportsVision(): boolean {
    return true;
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'supported';
  }

  supportsVisionForModel(model: string): boolean {
    return isDeepSeekVisionModel(model);
  }

  getVisionSupportLevelForModel(model: string): VisionSupportLevel {
    return this.supportsVisionForModel(model) ? 'supported' : 'unsupported';
  }

  private validateRequiredOptions(options: DeepSeekChatServiceOptions): void {
    if (!options.apiKey?.trim()) {
      throw new Error('deepseek provider requires apiKey.');
    }
  }

  private resolveEndpoint(options: DeepSeekChatServiceOptions): string {
    if (options.endpoint) {
      return this.normalizeUrl(options.endpoint);
    }

    if (options.baseUrl) {
      const baseUrl = this.normalizeUrl(options.baseUrl);
      if (baseUrl.endsWith('/chat/completions')) {
        return baseUrl;
      }
      return `${baseUrl}/chat/completions`;
    }

    return ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API;
  }

  private normalizeUrl(value: string): string {
    return value.trim().replace(/\/+$/, '');
  }
}
