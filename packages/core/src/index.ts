/**
 * AITuber Core
 * Modularized library of AITuber OnAir core features
 */

// Type definitions exports
export * from './types';

// Service exports
export type { ChatService } from './services/chat/ChatService';
export { OpenAIChatService } from './services/chat/OpenAIChatService';
export { OpenAISummarizer } from './services/chat/OpenAISummarizer';

// Provider exports
export type {
  ChatServiceOptions,
  ChatServiceProvider,
} from './services/chat/providers/ChatServiceProvider';
export { ChatServiceFactory } from './services/chat/ChatServiceFactory';
export { OpenAIChatServiceProvider } from './services/chat/providers/OpenAIChatServiceProvider';
export { GeminiChatServiceProvider } from './services/chat/providers/GeminiChatServiceProvider';
export { ClaudeChatServiceProvider } from './services/chat/providers/ClaudeChatServiceProvider';

// Voice services
export type {
  VoiceService,
  VoiceServiceOptions,
  AudioPlayOptions,
} from './services/voice/VoiceService';
export { VoiceEngineAdapter } from './services/voice/VoiceEngineAdapter';

// Core module exports
export { EventEmitter } from './core/EventEmitter';
export type { MemoryOptions, Summarizer } from './core/MemoryManager';
export { MemoryManager } from './core/MemoryManager';
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