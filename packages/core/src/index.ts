/**
 * AITuber Core
 * Modularized library of AITuber OnAir core features
 */

// Type definitions exports
export * from './types';

// Chat exports (re-exported from @aituber-onair/chat for backward compatibility)
export {
  // Service exports
  type ChatService,
  ChatServiceFactory,
  // Provider exports
  type ChatServiceOptions,
  type ChatServiceProvider,
  // OpenAI provider
  OpenAIChatService,
  OpenAIChatServiceProvider,
  // Gemini provider
  GeminiChatService,
  GeminiChatServiceProvider,
  // Claude provider
  ClaudeChatService,
  ClaudeChatServiceProvider,
  // Type definitions
  type Message,
  type MessageWithVision,
  type VisionBlock,
  type ChatType,
  type SpeakOptions,
  type ChatScreenplay,
  type ToolDefinition,
  type ToolUseBlock,
  type ToolResultBlock,
  type ToolChatCompletion,
  type MCPServerConfig,
  // Constants
  type ChatResponseLength,
  MAX_TOKENS_BY_LENGTH,
  DEFAULT_MAX_TOKENS,
  DEFAULT_VISION_PROMPT,
  // Utils
  textToScreenplay as textToChatScreenplay,
  screenplayToText as chatScreenplayToText,
  EmotionParser as ChatEmotionParser,
} from '@aituber-onair/chat';

// Core module exports
export { EventEmitter } from './core/EventEmitter';
export type { MemoryOptions, Summarizer } from './core/MemoryManager';
export { MemoryManager } from './core/MemoryManager';
export { OpenAISummarizer } from './services/chat/providers/openai/OpenAISummarizer';
export { GeminiSummarizer } from './services/chat/providers/gemini/GeminiSummarizer';
export { ClaudeSummarizer } from './services/chat/providers/claude/ClaudeSummarizer';
export type { ChatProcessorOptions } from './core/ChatProcessor';
export { ChatProcessor } from './core/ChatProcessor';
export type { AITuberOnAirCoreOptions } from './core/AITuberOnAirCore';
export {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
} from './core/AITuberOnAirCore';

// Constants exports
export * from './constants';

// Utility exports
export * from './utils';
export { createMemoryStorage } from './utils/storage';

// Voice exports (re-exported from @aituber-onair/voice for backward compatibility)
export {
  // Core services
  VoiceEngineAdapter,
  type VoiceService,
  type VoiceServiceOptions,
  type AudioPlayOptions,
  // Voice engines
  VoiceEngineFactory,
  type VoiceEngine,
  VoiceVoxEngine,
  VoicePeakEngine,
  AivisSpeechEngine,
  OpenAiEngine,
  NijiVoiceEngine,
  MinimaxEngine,
  // Types
  type VoiceEngineType,
  talkStyles,
  type TalkStyle,
  type Talk,
  emotions,
  type EmotionType,
  type EmotionTypeForVoicepeak,
  type Screenplay as VoiceScreenplay,
  type VoiceActor,
  // Utils
  textToScreenplay,
  textsToScreenplay,
  screenplayToText,
  EmotionParser,
  splitSentence,
  textsToScreenplay as textsToVoiceScreenplay,
  // Constants
  VOICE_VOX_API_URL,
  VOICEPEAK_API_URL,
  AIVIS_SPEECH_API_URL,
  NIJI_VOICE_API_URL,
  OPENAI_TTS_API_URL,
  MINIMAX_GLOBAL_API_URL,
  MINIMAX_CHINA_API_URL,
  MINIMAX_GLOBAL_VOICE_LIST_URL,
  MINIMAX_CHINA_VOICE_LIST_URL,
} from '@aituber-onair/voice';
