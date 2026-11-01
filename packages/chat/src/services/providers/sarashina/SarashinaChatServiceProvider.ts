import {
  ENDPOINT_SARASHINA_CHAT_COMPLETIONS_API,
  MODEL_SARASHINA_3_NANO,
  SARASHINA_SUPPORTED_MODELS,
} from '../../../constants/sarashina';
import { ChatService } from '../../ChatService';
import {
  ChatServiceProvider,
  SarashinaChatServiceOptions,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { SarashinaChatService } from './SarashinaChatService';

export class SarashinaChatServiceProvider
  implements ChatServiceProvider<SarashinaChatServiceOptions>
{
  createChatService(options: SarashinaChatServiceOptions): ChatService {
    if (options.visionModel !== undefined) {
      throw new Error('Sarashina does not support vision.');
    }
    const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '');
    let endpoint = ENDPOINT_SARASHINA_CHAT_COMPLETIONS_API;
    if (options.endpoint) {
      endpoint = normalizeUrl(options.endpoint);
    } else if (options.baseUrl) {
      const baseUrl = normalizeUrl(options.baseUrl);
      endpoint = baseUrl.endsWith('/chat/completions')
        ? baseUrl
        : `${baseUrl}/chat/completions`;
    }
    return new SarashinaChatService(
      options.apiKey,
      options.model || this.getDefaultModel(),
      options.tools,
      endpoint,
      options.responseLength,
      options.reasoning_effort,
    );
  }

  getProviderName(): string {
    return 'sarashina';
  }

  getSupportedModels(): string[] {
    return [...SARASHINA_SUPPORTED_MODELS];
  }

  getDefaultModel(): string {
    return MODEL_SARASHINA_3_NANO;
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
}
