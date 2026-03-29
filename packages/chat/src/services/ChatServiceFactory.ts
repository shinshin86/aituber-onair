import { ChatService } from './ChatService';
import {
  ChatServiceOptions,
  ChatServiceOptionsByProvider,
  ChatProviderName,
  ChatServiceProvider,
  VisionSupportLevel,
} from './providers/ChatServiceProvider';
import { DEFAULT_CHAT_SERVICE_PROVIDERS } from './providers';

/**
 * Chat service factory
 * Manages and creates various AI providers
 */
export class ChatServiceFactory {
  /** Map of registered providers */
  private static providers: Map<string, ChatServiceProvider<any>> = new Map();

  /**
   * Register a new provider
   * @param provider Provider instance
   */
  static registerProvider(provider: ChatServiceProvider<any>): void {
    this.providers.set(provider.getProviderName(), provider);
  }

  /**
   * Create a chat service with the specified provider name and options
   * @param providerName Provider name
   * @param options Service options
   * @returns Created ChatService instance
   */
  static createChatService<TProvider extends ChatProviderName>(
    providerName: TProvider,
    options: ChatServiceOptionsByProvider[TProvider],
  ): ChatService;
  static createChatService(
    providerName: string,
    options: ChatServiceOptions,
  ): ChatService {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown chat provider: ${providerName}`);
    }
    return provider.createChatService(options);
  }

  /**
   * Get registered providers
   * @returns Provider map
   */
  static getProviders(): Map<string, ChatServiceProvider<any>> {
    return this.providers;
  }

  /**
   * Get array of available provider names
   * @returns Array of provider names
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get models supported by the specified provider
   * @param providerName Provider name
   * @returns Array of supported models, empty array if provider doesn't exist
   */
  static getSupportedModels(providerName: string): string[] {
    const provider = this.providers.get(providerName);
    return provider ? provider.getSupportedModels() : [];
  }

  /**
   * Get provider-level vision support status.
   */
  static getVisionSupportLevel(providerName: string): VisionSupportLevel {
    const provider = this.providers.get(providerName);
    return provider ? provider.getVisionSupportLevel() : 'unsupported';
  }

  /**
   * Get model-level vision support status.
   */
  static getVisionSupportLevelForModel(
    providerName: string,
    model: string,
  ): VisionSupportLevel {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return 'unsupported';
    }

    if (provider.getVisionSupportLevelForModel) {
      return provider.getVisionSupportLevelForModel(model);
    }

    if (provider.supportsVisionForModel) {
      return provider.supportsVisionForModel(model)
        ? 'supported'
        : 'unsupported';
    }

    return provider.getVisionSupportLevel();
  }
}

DEFAULT_CHAT_SERVICE_PROVIDERS.forEach((provider) =>
  ChatServiceFactory.registerProvider(provider),
);
