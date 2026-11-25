/**
 * AITuber OnAir Chat Package
 * LLM API integration and chat processing functionality
 */

// Type definitions exports
export * from './types/index.js';

// Service exports
export type { ChatService } from './services/ChatService.js';
export { ChatServiceFactory } from './services/ChatServiceFactory.js';

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
  GeminiNanoInitialPrompt,
  ClaudeChatServiceOptions,
  ZAIChatServiceOptions,
  XAIChatServiceOptions,
  KimiChatServiceOptions,
  DeepSeekChatServiceOptions,
  MistralChatServiceOptions,
  SakanaChatServiceOptions,
  SarashinaChatServiceOptions,
  PlamoChatServiceOptions,
  ChatServiceProvider,
  VisionSupportLevel,
} from './services/providers/ChatServiceProvider.js';

// OpenAI provider exports
export { OpenAIChatService } from './services/providers/openai/OpenAIChatService.js';
export { OpenAIChatServiceProvider } from './services/providers/openai/OpenAIChatServiceProvider.js';
export { OpenAICompatibleChatServiceProvider } from './services/providers/openaiCompatible/OpenAICompatibleChatServiceProvider.js';

// Gemini provider exports
export { GeminiChatService } from './services/providers/gemini/GeminiChatService.js';
export { GeminiChatServiceProvider } from './services/providers/gemini/GeminiChatServiceProvider.js';

// Gemini Nano provider exports
export { GeminiNanoChatService } from './services/providers/geminiNano/GeminiNanoChatService.js';
export { GeminiNanoChatServiceProvider } from './services/providers/geminiNano/GeminiNanoChatServiceProvider.js';

// Claude provider exports
export { ClaudeChatService } from './services/providers/claude/ClaudeChatService.js';
export { ClaudeChatServiceProvider } from './services/providers/claude/ClaudeChatServiceProvider.js';

// OpenRouter provider exports
export { OpenRouterChatService } from './services/providers/openrouter/OpenRouterChatService.js';
export { OpenRouterChatServiceProvider } from './services/providers/openrouter/OpenRouterChatServiceProvider.js';

// Z.ai provider exports
export { ZAIChatService } from './services/providers/zai/ZAIChatService.js';
export { ZAIChatServiceProvider } from './services/providers/zai/ZAIChatServiceProvider.js';

// xAI provider exports
export { XAIChatService } from './services/providers/xai/XAIChatService.js';
export { XAIChatServiceProvider } from './services/providers/xai/XAIChatServiceProvider.js';

// Kimi provider exports
export { KimiChatService } from './services/providers/kimi/KimiChatService.js';
export { KimiChatServiceProvider } from './services/providers/kimi/KimiChatServiceProvider.js';

// DeepSeek provider exports
export { DeepSeekChatService } from './services/providers/deepseek/DeepSeekChatService.js';
export { DeepSeekChatServiceProvider } from './services/providers/deepseek/DeepSeekChatServiceProvider.js';

// Mistral provider exports
export { MistralChatService } from './services/providers/mistral/MistralChatService.js';
export { MistralChatServiceProvider } from './services/providers/mistral/MistralChatServiceProvider.js';

// Sakana provider exports
export { SakanaChatService } from './services/providers/sakana/SakanaChatService.js';
export { SakanaChatServiceProvider } from './services/providers/sakana/SakanaChatServiceProvider.js';

// Sarashina provider exports
export { SarashinaChatService } from './services/providers/sarashina/SarashinaChatService.js';
export { SarashinaChatServiceProvider } from './services/providers/sarashina/SarashinaChatServiceProvider.js';

// PLaMo provider exports
export { PlamoChatService } from './services/providers/plamo/PlamoChatService.js';
export { PlamoChatServiceProvider } from './services/providers/plamo/PlamoChatServiceProvider.js';

// Constants exports
export * from './constants/index.js';

// Utility exports
export * from './utils/index.js';
export * from './backend.js';

// Adapters
export { installGASFetch } from './adapters/gasFetch.js';
