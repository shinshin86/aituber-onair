import { ChatService } from '../ChatService';
import { ChatResponseLength, GPT5PresetKey } from '../../constants/chat';
import type { MistralReasoningEffort } from '../../constants/mistral';
import type { PlamoReasoningEffort } from '../../constants/plamo';
import type { XaiReasoningEffort } from '../../constants/xai';
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
  /** API endpoint URL (OpenAI-compatible full URL) */
  endpoint?: string;
  /** Base URL for OpenAI-compatible APIs */
  baseUrl?: string;
  /** Response length setting */
  responseLength?: ChatResponseLength;
  /** Verbosity level for GPT-5 models (OpenAI only) */
  verbosity?: 'low' | 'medium' | 'high';
  /** Reasoning effort level for reasoning-capable providers */
  reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
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

export type OpenAICompatibleChatServiceOptions = Omit<
  OpenAIChatServiceOptions,
  'apiKey' | 'model' | 'endpoint' | 'mcpServers'
> & {
  apiKey?: string;
  model: string;
  endpoint: string;
  mcpServers?: never;
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
  reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
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

export type DeepSeekChatServiceOptions = DisallowKeys<
  BaseChatServiceOptions,
  | 'verbosity'
  | 'reasoning_effort'
  | 'gpt5Preset'
  | 'gpt5EndpointPreference'
  | 'enableReasoningSummary'
  | 'includeReasoning'
  | 'reasoningMaxTokens'
  | 'thinking'
  | 'responseFormat'
>;

export type MistralChatServiceOptions = Omit<
  DisallowKeys<
    BaseChatServiceOptions,
    | 'verbosity'
    | 'gpt5Preset'
    | 'gpt5EndpointPreference'
    | 'enableReasoningSummary'
    | 'includeReasoning'
    | 'reasoningMaxTokens'
    | 'thinking'
    | 'responseFormat'
  >,
  'reasoning_effort'
> & {
  /** Mistral adjustable reasoning: only sent for supported models. */
  reasoning_effort?: MistralReasoningEffort;
};

export type SakanaChatServiceOptions = DisallowKeys<
  BaseChatServiceOptions,
  | 'verbosity'
  | 'reasoning_effort'
  | 'gpt5Preset'
  | 'gpt5EndpointPreference'
  | 'enableReasoningSummary'
  | 'includeReasoning'
  | 'reasoningMaxTokens'
  | 'thinking'
  | 'responseFormat'
>;

export type PlamoChatServiceOptions = Omit<
  DisallowKeys<
    BaseChatServiceOptions,
    | 'verbosity'
    | 'gpt5Preset'
    | 'gpt5EndpointPreference'
    | 'enableReasoningSummary'
    | 'includeReasoning'
    | 'reasoningMaxTokens'
    | 'thinking'
    | 'responseFormat'
  >,
  'reasoning_effort'
> & {
  /** PLaMo supports none or medium reasoning effort on reasoning-capable models. */
  reasoning_effort?: PlamoReasoningEffort;
};

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

export type XAIChatServiceOptions = DisallowKeys<
  BaseChatServiceOptions,
  | 'verbosity'
  | 'gpt5Preset'
  | 'gpt5EndpointPreference'
  | 'enableReasoningSummary'
  | 'includeReasoning'
  | 'reasoningMaxTokens'
  | 'baseUrl'
  | 'thinking'
  | 'responseFormat'
> & {
  /** xAI reasoning effort. Only sent for models that support it. */
  reasoning_effort?: XaiReasoningEffort;
};

export type GeminiNanoChatServiceOptions = {
  /** API Key is not needed for Gemini Nano (browser built-in AI) */
  apiKey?: never;
  /** Model name (fixed to 'gemini-nano') */
  model?: string;
  /** Response length setting */
  responseLength?: ChatResponseLength;
  /** Expected input languages for the Prompt API (default: ['ja']) */
  expectedInputLanguages?: string[];
  /** Expected output languages for the Prompt API (default: ['ja']) */
  expectedOutputLanguages?: string[];
};

export type ChatServiceOptions<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = BaseChatServiceOptions & TExtra;

export type ChatServiceOptionsByProvider = {
  openai: OpenAIChatServiceOptions;
  'openai-compatible': OpenAICompatibleChatServiceOptions;
  openrouter: OpenRouterChatServiceOptions;
  gemini: GeminiChatServiceOptions;
  claude: ClaudeChatServiceOptions;
  zai: ZAIChatServiceOptions;
  xai: XAIChatServiceOptions;
  kimi: KimiChatServiceOptions;
  deepseek: DeepSeekChatServiceOptions;
  mistral: MistralChatServiceOptions;
  sakana: SakanaChatServiceOptions;
  plamo: PlamoChatServiceOptions;
  'gemini-nano': GeminiNanoChatServiceOptions;
};

export type ChatProviderName = keyof ChatServiceOptionsByProvider;

export type VisionSupportLevel = 'supported' | 'unsupported' | 'unknown';

/**
 * Chat service provider interface
 * Abstraction for various AI API providers (OpenAI, Gemini, Claude, etc.)
 */
export interface ChatServiceProvider<TOptions = BaseChatServiceOptions> {
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
   * Get the provider-level vision support status.
   * - supported: known to support vision
   * - unsupported: known to not support vision
   * - unknown: depends on endpoint/model and cannot be pre-validated
   */
  getVisionSupportLevel(): VisionSupportLevel;

  /**
   * Get the model-level vision support status when pre-validation is possible.
   */
  getVisionSupportLevelForModel?(model: string): VisionSupportLevel;

  /**
   * Check if the provider supports vision (image processing)
   * @returns True when vision can be attempted
   */
  supportsVision(): boolean;

  /**
   * Check if a specific model supports vision capabilities.
   * Returns true when vision can be attempted for the model.
   */
  supportsVisionForModel?(model: string): boolean;
}
