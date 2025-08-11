import { ChatService } from '../ChatService';
import { ChatResponseLength, GPT5PresetKey } from '../../constants/chat';

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
  /** API endpoint type (chat/completions or responses (OpenAI only)) */
  endpoint?: string;
  /** Response length setting */
  responseLength?: ChatResponseLength;
  /** Verbosity level for GPT-5 models (OpenAI only) */
  verbosity?: 'low' | 'medium' | 'high';
  /** Reasoning effort level for GPT-5 models (OpenAI only) */
  reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
  /** GPT-5 usage preset (OpenAI only) - overrides individual reasoning/verbosity settings */
  gpt5Preset?: GPT5PresetKey;
  /** GPT-5 endpoint preference (OpenAI only) - 'chat' for Chat Completions API, 'responses' for Responses API, 'auto' for automatic selection */
  gpt5EndpointPreference?: 'chat' | 'responses' | 'auto';
  /** Enable reasoning summary for GPT-5 models (OpenAI only) - requires organization verification */
  enableReasoningSummary?: boolean;
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
