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
  UnrealSpeechVoiceServiceOptions,
  ElevenLabsVoiceServiceOptions,
  InworldVoiceServiceOptions,
  GradiumVoiceServiceOptions,
  VoiceVoxQueryParameterOverrides,
  AivisSpeechQueryParameterOverrides,
} from './services/VoiceService';
export { VoiceEngineAdapter } from './services/VoiceEngineAdapter';
export type { PiperPlusAssets } from './engines/PiperPlusEngine';

// Audio players
export * from './services/audio';
export type { AudioPlayer } from './types/audioPlayer';

// Voice engines
export * from './engines';

// Types
export * from './types/voice';
export * from './types/voiceEngine';
export type {
  VoiceEngineCapabilities,
  VoiceEngineVoice,
  VoiceEngineVoiceListOptions,
  VoiceRuntime,
} from './types/capabilities';
export * from './types/chat';

// Utils
export {
  textToScreenplay,
  textsToScreenplay,
  screenplayToText,
} from './utils/screenplay';
export { EmotionParser, emotionToTalkStyle } from './utils/emotionParser';
export {
  getAllVoiceEngineCapabilities,
  getVoiceEngineCapabilities,
} from './utils/voiceEngineCapabilities';
export { getVoiceEngineVoiceList } from './utils/voiceEngineVoiceList';

// Voice-specific messages utility
export {
  splitSentence,
  textsToScreenplay as textsToVoiceScreenplay,
} from './services/messages';

// Constants
export * from './constants/voiceEngine';
