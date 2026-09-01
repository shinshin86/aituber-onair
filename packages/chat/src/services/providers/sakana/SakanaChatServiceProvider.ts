import {
  ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
  MODEL_FUGU,
  MODEL_SAKANA_NAMAZU,
  SAKANA_SUPPORTED_MODELS,
  isSakanaVisionModel,
} from '../../../constants/sakana';
import { ChatService } from '../../ChatService';
import {
  ChatServiceProvider,
  SakanaChatServiceOptions,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { SakanaChatService } from './SakanaChatService';
import { ToolDefinition } from '../../../types/toolChat';
import { resolveVisionModel } from '../../../utils';

export class SakanaChatServiceProvider
  implements ChatServiceProvider<SakanaChatServiceOptions>
{
  createChatService(options: SakanaChatServiceOptions): ChatService {
    this.validateRequiredOptions(options);

    const model = options.model || this.getDefaultModel();
    const visionModel = resolveVisionModel({
      model,
      visionModel: options.visionModel,
      defaultModel: this.getDefaultModel(),
      defaultVisionModel: MODEL_SAKANA_NAMAZU,
      supportsVisionForModel: (visionModel) =>
        this.supportsVisionForModel(visionModel),
      validate: 'explicit',
    });
    const tools: ToolDefinition[] | undefined = options.tools;
    if (options.thinking !== undefined && model !== MODEL_SAKANA_NAMAZU) {
      throw new Error(
        'Sakana thinking control is only supported for sakana-namazu.',
      );
    }
    const thinking =
      model === MODEL_SAKANA_NAMAZU
        ? (options.thinking ?? { type: 'disabled' as const })
        : undefined;

    return new SakanaChatService(
      options.apiKey,
      model,
      visionModel,
      tools,
      this.resolveEndpoint(options),
      options.responseLength,
      thinking,
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
    return true;
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'supported';
  }

  supportsVisionForModel(model: string): boolean {
    return isSakanaVisionModel(model);
  }

  getVisionSupportLevelForModel(model: string): VisionSupportLevel {
    return this.supportsVisionForModel(model) ? 'supported' : 'unsupported';
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
