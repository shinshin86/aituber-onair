import {
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  isMistralReasoningEffortModel,
  isMistralVisionModel,
  MISTRAL_SUPPORTED_MODELS,
  MODEL_MISTRAL_SMALL_LATEST,
} from '../../../constants/mistral';
import { ChatService } from '../../ChatService';
import {
  ChatServiceProvider,
  MistralChatServiceOptions,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { MistralChatService } from './MistralChatService';
import { ToolDefinition } from '../../../types/toolChat';
import { resolveVisionModel } from '../../../utils';

export class MistralChatServiceProvider
  implements ChatServiceProvider<MistralChatServiceOptions>
{
  createChatService(options: MistralChatServiceOptions): ChatService {
    this.validateRequiredOptions(options);

    const model = options.model || this.getDefaultModel();
    const visionModel = resolveVisionModel({
      model,
      visionModel: options.visionModel,
      defaultModel: this.getDefaultModel(),
      defaultVisionModel: this.getDefaultVisionModel(),
      supportsVisionForModel: (targetModel) =>
        this.supportsVisionForModel(targetModel),
      validate: 'explicit',
    });
    const tools: ToolDefinition[] | undefined = options.tools;
    const reasoningEffort = isMistralReasoningEffortModel(model)
      ? options.reasoning_effort
      : undefined;

    return new MistralChatService(
      options.apiKey,
      model,
      visionModel,
      tools,
      this.resolveEndpoint(options),
      options.responseLength,
      reasoningEffort,
    );
  }

  getProviderName(): string {
    return 'mistral';
  }

  getSupportedModels(): string[] {
    return [...MISTRAL_SUPPORTED_MODELS];
  }

  getDefaultModel(): string {
    return MODEL_MISTRAL_SMALL_LATEST;
  }

  private getDefaultVisionModel(): string {
    return MODEL_MISTRAL_SMALL_LATEST;
  }

  supportsVision(): boolean {
    return this.getVisionSupportLevel() !== 'unsupported';
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'supported';
  }

  supportsVisionForModel(model: string): boolean {
    return isMistralVisionModel(model);
  }

  getVisionSupportLevelForModel(model: string): VisionSupportLevel {
    return this.supportsVisionForModel(model) ? 'supported' : 'unsupported';
  }

  private validateRequiredOptions(options: MistralChatServiceOptions): void {
    if (!options.apiKey?.trim()) {
      throw new Error('mistral provider requires apiKey.');
    }
  }

  private resolveEndpoint(options: MistralChatServiceOptions): string {
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

    return ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API;
  }

  private normalizeUrl(value: string): string {
    return value.trim().replace(/\/+$/, '');
  }
}
