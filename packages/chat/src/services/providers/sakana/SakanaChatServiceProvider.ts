import {
  ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
  MODEL_FUGU,
  SAKANA_SUPPORTED_MODELS,
} from '../../../constants/sakana';
import { ChatService } from '../../ChatService';
import {
  ChatServiceProvider,
  SakanaChatServiceOptions,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { SakanaChatService } from './SakanaChatService';
import { ToolDefinition } from '../../../types/toolChat';

export class SakanaChatServiceProvider
  implements ChatServiceProvider<SakanaChatServiceOptions>
{
  createChatService(options: SakanaChatServiceOptions): ChatService {
    this.validateRequiredOptions(options);

    const model = options.model || this.getDefaultModel();
    const tools: ToolDefinition[] | undefined = options.tools;

    return new SakanaChatService(
      options.apiKey,
      model,
      options.visionModel ?? model,
      tools,
      this.resolveEndpoint(options),
      options.responseLength,
    );
  }

  getProviderName(): string {
    return 'sakana';
  }

  getSupportedModels(): string[] {
    return [...SAKANA_SUPPORTED_MODELS];
  }

  getDefaultModel(): string {
    return MODEL_FUGU;
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

  private validateRequiredOptions(options: SakanaChatServiceOptions): void {
    if (!options.apiKey?.trim()) {
      throw new Error('sakana provider requires apiKey.');
    }
  }

  private resolveEndpoint(options: SakanaChatServiceOptions): string {
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

    return ENDPOINT_SAKANA_CHAT_COMPLETIONS_API;
  }

  private normalizeUrl(value: string): string {
    return value.trim().replace(/\/+$/, '');
  }
}
