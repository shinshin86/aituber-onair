import { ChatService } from './ChatService';
import {
  ChatServiceOptions,
  ChatServiceProvider,
} from './providers/ChatServiceProvider';
import { OpenAIChatServiceProvider } from './providers/openai/OpenAIChatServiceProvider';
import { GeminiChatServiceProvider } from './providers/gemini/GeminiChatServiceProvider';

/**
 * Chat service factory
 * Manages and creates various AI providers
 */
export class ChatServiceFactory {
  /** Map of registered providers */
  private static providers: Map<string, ChatServiceProvider> = new Map();

  /**
   * Register a new provider
   * @param provider Provider instance
   */
  static registerProvider(provider: ChatServiceProvider): void {
    this.providers.set(provider.getProviderName(), provider);
  }

  /**
   * Create a chat service with the specified provider name and options
   * @param providerName Provider name
   * @param options Service options
   * @returns Created ChatService instance
   */
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
  static getProviders(): Map<string, ChatServiceProvider> {
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
}

// Register OpenAI as a provider
ChatServiceFactory.registerProvider(new OpenAIChatServiceProvider());
// Register Gemini as a provider
ChatServiceFactory.registerProvider(new GeminiChatServiceProvider());
