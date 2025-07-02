/**
 * AITuber Core
 * Modularized library of AITuber OnAir core features
 */

// Type definitions exports
export * from './types';

// Service exports
export type { ChatService } from './services/chat/ChatService';
export { OpenAIChatService } from './services/chat/providers/openai/OpenAIChatService';
export { OpenAISummarizer } from './services/chat/providers/openai/OpenAISummarizer';
export { GeminiSummarizer } from './services/chat/providers/gemini/GeminiSummarizer';

// Provider exports
export type {
  ChatServiceOptions,
  ChatServiceProvider,
} from './services/chat/providers/ChatServiceProvider';
export { ChatServiceFactory } from './services/chat/ChatServiceFactory';
export { OpenAIChatServiceProvider } from './services/chat/providers/openai/OpenAIChatServiceProvider';
export { GeminiChatServiceProvider } from './services/chat/providers/gemini/GeminiChatServiceProvider';
export { ClaudeChatServiceProvider } from './services/chat/providers/claude/ClaudeChatServiceProvider';

// Core module exports
export { EventEmitter } from './core/EventEmitter';
export type { MemoryOptions, Summarizer } from './core/MemoryManager';
export { MemoryManager } from './core/MemoryManager';
export type { ChatProcessorOptions } from './core/ChatProcessor';
export { ChatProcessor } from './core/ChatProcessor';
export {
  MAX_TOKENS_BY_LENGTH,
  CHAT_RESPONSE_LENGTH,
  DEFAULT_MAX_TOKENS,
} from './constants/chat';
export type { ChatResponseLength } from './constants/chat';
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
