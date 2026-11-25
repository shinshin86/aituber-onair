import { ClaudeChatServiceProvider } from './claude/ClaudeChatServiceProvider.js';
import { DeepSeekChatServiceProvider } from './deepseek/DeepSeekChatServiceProvider.js';
import { GeminiChatServiceProvider } from './gemini/GeminiChatServiceProvider.js';
import { GeminiNanoChatServiceProvider } from './geminiNano/GeminiNanoChatServiceProvider.js';
import { KimiChatServiceProvider } from './kimi/KimiChatServiceProvider.js';
import { MistralChatServiceProvider } from './mistral/MistralChatServiceProvider.js';
import { OpenAICompatibleChatServiceProvider } from './openaiCompatible/OpenAICompatibleChatServiceProvider.js';
import { OpenAIChatServiceProvider } from './openai/OpenAIChatServiceProvider.js';
import { OpenRouterChatServiceProvider } from './openrouter/OpenRouterChatServiceProvider.js';
import { PlamoChatServiceProvider } from './plamo/PlamoChatServiceProvider.js';
import { SarashinaChatServiceProvider } from './sarashina/SarashinaChatServiceProvider.js';
import { SakanaChatServiceProvider } from './sakana/SakanaChatServiceProvider.js';
import { XAIChatServiceProvider } from './xai/XAIChatServiceProvider.js';
import { ZAIChatServiceProvider } from './zai/ZAIChatServiceProvider.js';

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
  new DeepSeekChatServiceProvider(),
  new MistralChatServiceProvider(),
  new SakanaChatServiceProvider(),
  new PlamoChatServiceProvider(),
  new SarashinaChatServiceProvider(),
];
