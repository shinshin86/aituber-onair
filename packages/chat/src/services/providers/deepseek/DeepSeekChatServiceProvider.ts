import {
  DEEPSEEK_SUPPORTED_MODELS,
  ENDPOINT_DEEPSEEK_CHAT_COMPLETIONS_API,
  MODEL_DEEPSEEK_V4_FLASH,
} from '../../../constants/deepseek';
import { ChatService } from '../../ChatService';
import {
  ChatServiceProvider,
  DeepSeekChatServiceOptions,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { DeepSeekChatService } from './DeepSeekChatService';
import { ToolDefinition } from '../../../types/toolChat';

export class DeepSeekChatServiceProvider
  implements ChatServiceProvider<DeepSeekChatServiceOptions>
{
  createChatService(options: DeepSeekChatServiceOptions): ChatService {
    this.validateRequiredOptions(options);

    const model = options.model || this.getDefaultModel();
    const tools: ToolDefinition[] | undefined = options.tools;

    return new DeepSeekChatService(
      options.apiKey,
      model,
      options.visionModel ?? model,
      tools,
      this.resolveEndpoint(options),
      options.responseLength,
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
    return false;
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'unsupported';
  }

  supportsVisionForModel(_model: string): boolean {
    return false;
  }

  getVisionSupportLevelForModel(_model: string): VisionSupportLevel {
    return 'unsupported';
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
