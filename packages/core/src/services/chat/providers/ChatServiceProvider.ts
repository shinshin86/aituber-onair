import { ChatService } from '../ChatService';

/**
 * Options for chat service providers
 */
export interface ChatServiceOptions {
  /** API Key */
  apiKey: string;
  /** Model name */
  model?: string;
  /** Vision model name (for image processing) */
  visionModel?: string;
  /** API endpoint type (chat/completions or responses) */
  endpoint?: string;
  /** Additional provider-specific options */
  [key: string]: any;
}

/**
 * Chat service provider interface
 * Abstraction for various AI API providers (OpenAI, Gemini, Claude, etc.)
 */
export interface ChatServiceProvider {
  /**
   * Create a chat service instance
   * @param options Service options
   * @returns ChatService implementation
   */
  createChatService(options: ChatServiceOptions): ChatService;

  /**
   * Get the provider name
   * @returns Provider name
   */
  getProviderName(): string;

  /**
   * Get the list of supported models
   * @returns Array of supported models
   */
  getSupportedModels(): string[];

  /**
   * Get the default model
   * @returns Default model name
   */
  getDefaultModel(): string;

  /**
   * Check if the provider supports vision (image processing)
   * @returns Support status
   */
  supportsVision(): boolean;
}
