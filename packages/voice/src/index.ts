/**
 * AITuber OnAir Voice Package
 * Voice synthesis and text-to-speech functionality
 */

// Core services
export type {
  VoiceService,
  VoiceServiceOptions,
  VoiceServiceOptionsUpdate,
  AudioPlayOptions,
  MinimaxVoiceSettingsOptions,
  MinimaxAudioSettingsOptions,
  MinimaxAudioFormat,
  PiperPlusVoiceServiceOptions,
  WebSpeechVoiceServiceOptions,
  UnrealSpeechVoiceServiceOptions,
  ElevenLabsVoiceServiceOptions,
  OpenRouterVoiceServiceOptions,
  OpenRouterVoiceServiceOptionsUpdate,
  DeepgramVoiceServiceOptions,
  DeepgramVoiceServiceOptionsUpdate,
  InworldVoiceServiceOptions,
  GradiumVoiceServiceOptions,
  VoiceVoxQueryParameterOverrides,
  AivisSpeechQueryParameterOverrides,
} from './services/VoiceService.js';
export { VoiceEngineAdapter } from './services/VoiceEngineAdapter.js';
export type { PiperPlusAssets } from './engines/PiperPlusEngine.js';

// Audio players
export * from './services/audio/index.js';
export type { AudioPlayer } from './types/audioPlayer.js';

// Voice engines
export * from './engines/index.js';

// Types
export * from './types/voice.js';
export * from './types/voiceEngine.js';
export type {
  VoiceEngineCapabilities,
  VoiceEngineVoice,
  VoiceEngineVoiceListOptions,
  VoiceRuntime,
} from './types/capabilities.js';
export * from './types/chat.js';

// Utils
export {
  textToScreenplay,
  textsToScreenplay,
  screenplayToText,
} from './utils/screenplay.js';
export { EmotionParser, emotionToTalkStyle } from './utils/emotionParser.js';
export {
  getAllVoiceEngineCapabilities,
  getVoiceEngineCapabilities,
} from './utils/voiceEngineCapabilities.js';
export { getVoiceEngineVoiceList } from './utils/voiceEngineVoiceList.js';
export {
  OpenAICompatibleSpeechEndpointError,
  resolveOpenAICompatibleSpeechEndpoint,
  listOpenAICompatibleSpeechModels,
  listOpenAICompatibleSpeechVoices,
  getOpenAICompatibleSpeechServerInfo,
  testOpenAICompatibleSpeech,
  type OpenAICompatibleSpeechEndpointErrorCode,
  type ResolvedOpenAICompatibleSpeechEndpoint,
  type OpenAICompatibleSpeechRequestOptions,
  type OpenAICompatibleSpeechVoiceList,
  type OpenAICompatibleSpeechServerInfo,
  type TestOpenAICompatibleSpeechOptions,
  type OpenAICompatibleSpeechTestResult,
} from './utils/openaiCompatibleSpeech.js';

// Voice-specific messages utility
export {
  splitSentence,
  textsToScreenplay as textsToVoiceScreenplay,
} from './services/messages.js';

// Constants
export * from './constants/voiceEngine.js';
