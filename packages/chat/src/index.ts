/**
 * AITuber OnAir Chat Package
 * LLM API integration and chat processing functionality
 */

// Type definitions exports
export * from './types';

// Service exports
export type { ChatService } from './services/ChatService';
export { ChatServiceFactory } from './services/ChatServiceFactory';

// Provider exports
export type {
  ChatServiceOptions,
  ChatServiceOptionsByProvider,
  ChatProviderName,
  OpenAIChatServiceOptions,
  OpenAICompatibleChatServiceOptions,
  OpenRouterChatServiceOptions,
  GeminiChatServiceOptions,
  GeminiNanoChatServiceOptions,
  ClaudeChatServiceOptions,
  ZAIChatServiceOptions,
  XAIChatServiceOptions,
  KimiChatServiceOptions,
  DeepSeekChatServiceOptions,
  ChatServiceProvider,
  VisionSupportLevel,
} from './services/providers/ChatServiceProvider';

// OpenAI provider exports
export { OpenAIChatService } from './services/providers/openai/OpenAIChatService';
export { OpenAIChatServiceProvider } from './services/providers/openai/OpenAIChatServiceProvider';
export { OpenAICompatibleChatServiceProvider } from './services/providers/openaiCompatible/OpenAICompatibleChatServiceProvider';

// Gemini provider exports
export { GeminiChatService } from './services/providers/gemini/GeminiChatService';
export { GeminiChatServiceProvider } from './services/providers/gemini/GeminiChatServiceProvider';

// Gemini Nano provider exports
export { GeminiNanoChatService } from './services/providers/geminiNano/GeminiNanoChatService';
export { GeminiNanoChatServiceProvider } from './services/providers/geminiNano/GeminiNanoChatServiceProvider';

// Claude provider exports
export { ClaudeChatService } from './services/providers/claude/ClaudeChatService';
export { ClaudeChatServiceProvider } from './services/providers/claude/ClaudeChatServiceProvider';

// OpenRouter provider exports
export { OpenRouterChatService } from './services/providers/openrouter/OpenRouterChatService';
export { OpenRouterChatServiceProvider } from './services/providers/openrouter/OpenRouterChatServiceProvider';

// Z.ai provider exports
export { ZAIChatService } from './services/providers/zai/ZAIChatService';
export { ZAIChatServiceProvider } from './services/providers/zai/ZAIChatServiceProvider';

// xAI provider exports
export { XAIChatService } from './services/providers/xai/XAIChatService';
export { XAIChatServiceProvider } from './services/providers/xai/XAIChatServiceProvider';

// Kimi provider exports
export { KimiChatService } from './services/providers/kimi/KimiChatService';
export { KimiChatServiceProvider } from './services/providers/kimi/KimiChatServiceProvider';

// DeepSeek provider exports
export { DeepSeekChatService } from './services/providers/deepseek/DeepSeekChatService';
export { DeepSeekChatServiceProvider } from './services/providers/deepseek/DeepSeekChatServiceProvider';

// Constants exports
export * from './constants';

// Utility exports
export * from './utils';

// Adapters
export { installGASFetch } from './adapters/gasFetch';
