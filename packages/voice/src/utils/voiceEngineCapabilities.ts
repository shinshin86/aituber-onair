import type {
  VoiceEngineCapabilities,
  VoiceRuntime,
} from '../types/capabilities';
import type { VoiceEngineType } from '../types/voiceEngine';

const CLOUD_ENGINES = new Set<VoiceEngineType>([
  'openai',
  'xai',
  'unrealSpeech',
  'elevenLabs',
  'inworld',
  'gradium',
  'geminiTts',
  'aivisCloud',
  'minimax',
]);

const CUSTOM_ENDPOINT_ENGINES = new Set<VoiceEngineType>([
  'voicevox',
  'voicepeak',
  'aivisSpeech',
  'openaiCompatible',
  'unrealSpeech',
  'elevenLabs',
  'inworld',
  'gradium',
  'geminiTts',
]);

const VOICE_LIST_ENGINES = new Set<VoiceEngineType>([
  'gradium',
  'minimax',
  'aivisCloud',
  'elevenLabs',
]);

const EMOTION_ENGINES = new Set<VoiceEngineType>([
  'voicevox',
  'voicepeak',
  'aivisSpeech',
  'aivisCloud',
  'none',
]);

const RUNTIME_BY_ENGINE: Record<VoiceEngineType, VoiceRuntime[]> = {
  voicevox: ['browser', 'node', 'server'],
  voicepeak: ['browser', 'node', 'server'],
  openai: ['browser', 'node', 'server'],
  xai: ['browser', 'node', 'server'],
  unrealSpeech: ['browser', 'node', 'server'],
  elevenLabs: ['browser', 'node', 'server'],
  inworld: ['browser', 'node', 'server'],
  gradium: ['browser', 'node', 'server'],
  geminiTts: ['browser', 'node', 'server'],
  openaiCompatible: ['browser', 'node', 'server'],
  aivisSpeech: ['browser', 'node', 'server'],
  aivisCloud: ['browser', 'node', 'server'],
  minimax: ['browser', 'node', 'server'],
  piperPlus: ['browser'],
  none: ['browser', 'node', 'server'],
};

export function getVoiceEngineCapabilities(
  engineType: VoiceEngineType,
): VoiceEngineCapabilities {
  return {
    engineType,
    requiresApiKey: CLOUD_ENGINES.has(engineType),
    supportsEmotion: EMOTION_ENGINES.has(engineType),
    supportsVoiceList: VOICE_LIST_ENGINES.has(engineType),
    supportsCustomEndpoint: CUSTOM_ENDPOINT_ENGINES.has(engineType),
    runtimes: [...RUNTIME_BY_ENGINE[engineType]],
  };
}

export function getAllVoiceEngineCapabilities(): VoiceEngineCapabilities[] {
  return (Object.keys(RUNTIME_BY_ENGINE) as VoiceEngineType[]).map(
    getVoiceEngineCapabilities,
  );
}
