/**
 * AITuber OnAir Voice Package
 * Voice synthesis and text-to-speech functionality
 */

// Core services
export type {
  VoiceService,
  VoiceServiceOptions,
  AudioPlayOptions,
  MinimaxVoiceSettingsOptions,
  MinimaxAudioSettingsOptions,
  MinimaxAudioFormat,
} from './services/VoiceService';
export { VoiceEngineAdapter } from './services/VoiceEngineAdapter';

// Audio players
export * from './services/audio';
export type { AudioPlayer } from './types/audioPlayer';

// Voice engines
export * from './engines';

// Types
export * from './types/voice';
export * from './types/voiceEngine';
export * from './types/chat';

// Utils
export {
  textToScreenplay,
  textsToScreenplay,
  screenplayToText,
} from './utils/screenplay';
export { EmotionParser } from './utils/emotionParser';

// Voice-specific messages utility
export {
  splitSentence,
  textsToScreenplay as textsToVoiceScreenplay,
} from './services/messages';

// Constants
export * from './constants/voiceEngine';
