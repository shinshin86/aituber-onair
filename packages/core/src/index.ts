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
  type ToolDefinition,
  type ToolUseBlock,
  type ToolResultBlock,
  type ToolChatCompletion,
  type MCPServerConfig,
  // Constants
  type ChatResponseLength,
  CHAT_RESPONSE_LENGTH,
  MAX_TOKENS_BY_LENGTH,
  DEFAULT_MAX_TOKENS,
  DEFAULT_VISION_PROMPT,
  getMaxTokensForResponseLength,
  // OpenAI model constants
  MODEL_GPT_5_NANO,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5,
  MODEL_GPT_5_CHAT_LATEST,
  MODEL_GPT_4_1,
  MODEL_GPT_4_1_MINI,
  MODEL_GPT_4_1_NANO,
  MODEL_GPT_4O,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4_5_PREVIEW,
  MODEL_O3_MINI,
  MODEL_O1,
  MODEL_O1_MINI,
  GPT_5_MODELS,
  isGPT5Model,
  VISION_SUPPORTED_MODELS,
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  // GPT-5 presets
  GPT5_PRESETS,
  type GPT5PresetKey,
  // Gemini model constants
  MODEL_GEMINI_2_5_PRO,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_2_5_FLASH_LITE,
  MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_2_0_FLASH_LITE,
  MODEL_GEMINI_1_5_FLASH,
  MODEL_GEMINI_1_5_PRO,
  GEMINI_VISION_SUPPORTED_MODELS,
  ENDPOINT_GEMINI_API,
  // Claude model constants
  MODEL_CLAUDE_3_HAIKU,
  MODEL_CLAUDE_3_5_HAIKU,
  MODEL_CLAUDE_3_5_SONNET,
  MODEL_CLAUDE_3_7_SONNET,
  MODEL_CLAUDE_4_SONNET,
  MODEL_CLAUDE_4_OPUS,
  CLAUDE_VISION_SUPPORTED_MODELS,
  ENDPOINT_CLAUDE_API,
  // Utils
  textToScreenplay as chatTextToScreenplay,
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
  type MinimaxModel,
  type MinimaxVoiceSettingsOptions,
  type MinimaxAudioSettingsOptions,
  type MinimaxAudioFormat,
  type VoiceEngineType,
  talkStyles,
  type TalkStyle,
  type Talk,
  emotions,
  type EmotionType,
  type EmotionTypeForVoicepeak,
  type Screenplay as VoiceScreenplay,
  type ChatScreenplay,
  type SpeakOptions,
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
