import { ChatService } from '../ChatService';
import { ChatResponseLength, GPT5PresetKey } from '../../constants/chat';
import { ToolDefinition, MCPServerConfig } from '../../types';

/**
 * Options for chat service providers
 */
export interface BaseChatServiceOptions {
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
  /** Tool definitions (OpenAI-compatible tools) */
  tools?: ToolDefinition[];
}

type DisallowKeys<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: never;
};

export type OpenAIChatServiceOptions = DisallowKeys<
  BaseChatServiceOptions,
  'baseUrl' | 'thinking' | 'includeReasoning' | 'reasoningMaxTokens'
> & {
  mcpServers?: MCPServerConfig[];
};

export type OpenRouterChatServiceOptions = DisallowKeys<
  BaseChatServiceOptions,
  | 'gpt5Preset'
  | 'gpt5EndpointPreference'
  | 'enableReasoningSummary'
  | 'verbosity'
  | 'baseUrl'
  | 'thinking'
  | 'responseFormat'
> & {
  appName?: string;
  appUrl?: string;
};

export type GeminiChatServiceOptions = DisallowKeys<
  BaseChatServiceOptions,
  | 'endpoint'
  | 'baseUrl'
  | 'verbosity'
  | 'reasoning_effort'
  | 'gpt5Preset'
  | 'gpt5EndpointPreference'
  | 'enableReasoningSummary'
  | 'includeReasoning'
  | 'reasoningMaxTokens'
  | 'responseFormat'
  | 'thinking'
> & {
  mcpServers?: MCPServerConfig[];
};

export type ClaudeChatServiceOptions = DisallowKeys<
  BaseChatServiceOptions,
  | 'endpoint'
  | 'baseUrl'
  | 'verbosity'
  | 'reasoning_effort'
  | 'gpt5Preset'
  | 'gpt5EndpointPreference'
  | 'enableReasoningSummary'
  | 'includeReasoning'
  | 'reasoningMaxTokens'
  | 'responseFormat'
  | 'thinking'
> & {
  mcpServers?: MCPServerConfig[];
};

export type KimiChatServiceOptions = DisallowKeys<
  BaseChatServiceOptions,
  | 'verbosity'
  | 'reasoning_effort'
  | 'gpt5Preset'
  | 'gpt5EndpointPreference'
  | 'enableReasoningSummary'
  | 'includeReasoning'
  | 'reasoningMaxTokens'
>;

export type ZAIChatServiceOptions = DisallowKeys<
  BaseChatServiceOptions,
  | 'verbosity'
  | 'reasoning_effort'
  | 'gpt5Preset'
  | 'gpt5EndpointPreference'
  | 'enableReasoningSummary'
  | 'includeReasoning'
  | 'reasoningMaxTokens'
  | 'baseUrl'
>;

export type ChatServiceOptions<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = BaseChatServiceOptions & TExtra;

export type ChatServiceOptionsByProvider = {
  openai: OpenAIChatServiceOptions;
  openrouter: OpenRouterChatServiceOptions;
  gemini: GeminiChatServiceOptions;
  claude: ClaudeChatServiceOptions;
  zai: ZAIChatServiceOptions;
  kimi: KimiChatServiceOptions;
};

export type ChatProviderName = keyof ChatServiceOptionsByProvider;

/**
 * Chat service provider interface
 * Abstraction for various AI API providers (OpenAI, Gemini, Claude, etc.)
 */
export interface ChatServiceProvider<
  TOptions extends BaseChatServiceOptions = BaseChatServiceOptions,
> {
  /**
   * Create a chat service instance
   * @param options Service options
   * @returns ChatService implementation
   */
  createChatService(options: TOptions): ChatService;

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
