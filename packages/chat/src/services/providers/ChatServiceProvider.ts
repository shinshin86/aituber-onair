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
  /** Base URL for OpenAI-compatible APIs (Kimi only) */
  baseUrl?: string;
  /** Response length setting */
  responseLength?: ChatResponseLength;
  /** Verbosity level for GPT-5 models (OpenAI only) */
  verbosity?: 'low' | 'medium' | 'high';
  /** Reasoning effort level for GPT-5 models (OpenAI) and gpt-oss models (OpenRouter) */
  reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
  /** GPT-5 usage preset (OpenAI only) - overrides individual reasoning/verbosity settings */
  gpt5Preset?: GPT5PresetKey;
  /** GPT-5 endpoint preference (OpenAI only) - 'chat' for Chat Completions API, 'responses' for Responses API, 'auto' for automatic selection */
  gpt5EndpointPreference?: 'chat' | 'responses' | 'auto';
  /** Enable reasoning summary for GPT-5 models (OpenAI only) - requires organization verification */
  enableReasoningSummary?: boolean;
  /** Include reasoning in response (OpenRouter only) - default false to avoid empty responses */
  includeReasoning?: boolean;
  /** Maximum tokens allocated for reasoning (OpenRouter only) */
  reasoningMaxTokens?: number;
  /** Response format (OpenAI-compatible JSON mode) */
  responseFormat?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: any;
  };
  /** Thinking mode options (Z.ai/Kimi only) */
  thinking?: {
    type: 'enabled' | 'disabled';
    clear_thinking?: boolean;
  };
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
