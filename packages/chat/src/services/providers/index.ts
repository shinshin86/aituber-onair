import { ClaudeChatServiceProvider } from './claude/ClaudeChatServiceProvider';
import { GeminiChatServiceProvider } from './gemini/GeminiChatServiceProvider';
import { KimiChatServiceProvider } from './kimi/KimiChatServiceProvider';
import { OpenAIChatServiceProvider } from './openai/OpenAIChatServiceProvider';
import { OpenRouterChatServiceProvider } from './openrouter/OpenRouterChatServiceProvider';
import { ZAIChatServiceProvider } from './zai/ZAIChatServiceProvider';

export const DEFAULT_CHAT_SERVICE_PROVIDERS = [
  new OpenAIChatServiceProvider(),
  new GeminiChatServiceProvider(),
  new ClaudeChatServiceProvider(),
  new OpenRouterChatServiceProvider(),
  new ZAIChatServiceProvider(),
  new KimiChatServiceProvider(),
];
