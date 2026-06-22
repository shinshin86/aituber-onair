import {
  ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
  MODEL_PLAMO_3_0_PRIME,
  PLAMO_SUPPORTED_MODELS,
} from '../../../constants/plamo';
import { ChatService } from '../../ChatService';
import {
  ChatServiceProvider,
  PlamoChatServiceOptions,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { PlamoChatService } from './PlamoChatService';
import { ToolDefinition } from '../../../types/toolChat';

export class PlamoChatServiceProvider
  implements ChatServiceProvider<PlamoChatServiceOptions>
{
  createChatService(options: PlamoChatServiceOptions): ChatService {
    this.validateRequiredOptions(options);

    const model = options.model || this.getDefaultModel();
    const tools: ToolDefinition[] | undefined = options.tools;

    return new PlamoChatService(
      options.apiKey,
      model,
      options.visionModel ?? model,
      tools,
      this.resolveEndpoint(options),
      options.responseLength,
      options.reasoning_effort,
    );
  }

  getProviderName(): string {
    return 'plamo';
  }

  getSupportedModels(): string[] {
    return [...PLAMO_SUPPORTED_MODELS];
  }

  getDefaultModel(): string {
    return MODEL_PLAMO_3_0_PRIME;
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

  private validateRequiredOptions(options: PlamoChatServiceOptions): void {
    if (!options.apiKey?.trim()) {
      throw new Error('plamo provider requires apiKey.');
    }
  }

  private resolveEndpoint(options: PlamoChatServiceOptions): string {
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

    return ENDPOINT_PLAMO_CHAT_COMPLETIONS_API;
  }

  private normalizeUrl(value: string): string {
    return value.trim().replace(/\/+$/, '');
  }
}
