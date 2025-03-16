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

// Utility exports
export * from './utils';
export { createMemoryStorage } from './utils/storage';

// Constants exports
export * from './constants';

// Explicitly re-export Screenplay type (already exported via ./types, but explicitly re-exported for clarity)
export type { Screenplay } from './types';
