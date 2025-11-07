import { AIVIS_SPEECH_API_ENDPOINT } from './speakers/aivisSpeech';
import { VOICEPEAK_API_ENDPOINT } from './speakers/voicepeak';
import { VOICEVOX_API_ENDPOINT } from './speakers/voicevox';

export type VoiceEngineType =
  | 'openai'
  | 'voicevox'
  | 'aivisSpeech'
  | 'aivisCloud'
  | 'voicepeak'
  | 'nijivoice'
  | 'minimax'
  | 'none';

export interface VoiceEngineConfig {
  name: string;
  apiUrl?: string;
  needsApiKey: boolean;
  placeholder: string;
  // Engine-specific parameters
  defaultParams?: Record<string, any>;
}

export const VOICE_ENGINE_CONFIGS: Record<VoiceEngineType, VoiceEngineConfig> =
  {
    openai: {
      name: 'OpenAI TTS',
      apiUrl: 'https://api.openai.com/v1/audio/speech',
      needsApiKey: true,
      placeholder: 'sk-...',
      defaultParams: {
        model: 'tts-1',
      },
    },
    voicevox: {
      name: 'VOICEVOX',
      apiUrl: VOICEVOX_API_ENDPOINT,
      needsApiKey: false,
      placeholder: 'API key not needed',
    },
    aivisSpeech: {
      name: 'Aivis Speech',
      apiUrl: AIVIS_SPEECH_API_ENDPOINT,
      needsApiKey: false,
      placeholder: 'API key not needed',
    },
    aivisCloud: {
      name: 'Aivis Cloud API',
      apiUrl: 'https://api.aivis-project.com/v1/tts/synthesize',
      needsApiKey: true,
      placeholder: 'Aivis Cloud API key',
      defaultParams: {
        speakingRate: 1.0,
        emotionalIntensity: 1.0,
        pitch: 0.0,
        volume: 1.0,
        outputFormat: 'mp3',
      },
    },
    voicepeak: {
      name: 'VoicePeak',
      apiUrl: VOICEPEAK_API_ENDPOINT,
      needsApiKey: false,
      placeholder: 'API key not needed',
    },
    nijivoice: {
      name: 'にじボイス',
      needsApiKey: true,
      placeholder: 'NijiVoice API key',
    },
    minimax: {
      name: 'MiniMax',
      apiUrl: 'https://api.minimax.io/v1/t2a_v2',
      needsApiKey: true,
      placeholder: 'sk-...',
      defaultParams: {
        endpoint: 'global',
      },
    },
    none: {
      name: '音声なし',
      needsApiKey: false,
      placeholder: '',
    },
  };

export const DEFAULT_VOICE_ENGINE: VoiceEngineType = 'none';
