import { ClaudeChatServiceProvider } from './claude/ClaudeChatServiceProvider';
import { GeminiChatServiceProvider } from './gemini/GeminiChatServiceProvider';
import { GeminiNanoChatServiceProvider } from './geminiNano/GeminiNanoChatServiceProvider';
import { KimiChatServiceProvider } from './kimi/KimiChatServiceProvider';
import { OpenAICompatibleChatServiceProvider } from './openaiCompatible/OpenAICompatibleChatServiceProvider';
import { OpenAIChatServiceProvider } from './openai/OpenAIChatServiceProvider';
import { OpenRouterChatServiceProvider } from './openrouter/OpenRouterChatServiceProvider';
import { XAIChatServiceProvider } from './xai/XAIChatServiceProvider';
import { ZAIChatServiceProvider } from './zai/ZAIChatServiceProvider';

export const DEFAULT_CHAT_SERVICE_PROVIDERS = [
  new OpenAIChatServiceProvider(),
  new OpenAICompatibleChatServiceProvider(),
  new GeminiChatServiceProvider(),
  new GeminiNanoChatServiceProvider(),
  new ClaudeChatServiceProvider(),
  new OpenRouterChatServiceProvider(),
  new ZAIChatServiceProvider(),
  new XAIChatServiceProvider(),
  new KimiChatServiceProvider(),
];
