import { AIVIS_SPEECH_API_ENDPOINT } from './speakers/aivisSpeech';
import { VOICEPEAK_API_ENDPOINT } from './speakers/voicepeak';
import { VOICEVOX_API_ENDPOINT } from './speakers/voicevox';

export type VoiceEngineType =
  | 'openai'
  | 'geminiTts'
  | 'openaiCompatible'
  | 'voicevox'
  | 'aivisSpeech'
  | 'aivisCloud'
  | 'voicepeak'
  | 'minimax'
  | 'xai'
  | 'piperPlus'
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
    geminiTts: {
      name: 'Gemini TTS',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
      needsApiKey: true,
      placeholder: 'Google API key',
      defaultParams: {
        model: 'gemini-3.1-flash-tts-preview',
        languageCode: 'ja-JP',
      },
    },
    openaiCompatible: {
      name: 'OpenAI-Compatible TTS',
      apiUrl: 'http://localhost:8880/v1/audio/speech',
      needsApiKey: false,
      placeholder: 'Optional API key',
      defaultParams: {
        model: 'local-model',
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
    minimax: {
      name: 'MiniMax',
      apiUrl: 'https://api.minimax.io/v1/t2a_v2',
      needsApiKey: true,
      placeholder: 'sk-...',
      defaultParams: {
        endpoint: 'global',
      },
    },
    xai: {
      name: 'xAI TTS',
      apiUrl: 'https://api.x.ai/v1/tts',
      needsApiKey: true,
      placeholder: 'xai-...',
    },
    piperPlus: {
      name: 'Piper Plus',
      needsApiKey: false,
      placeholder: '',
    },
    none: {
      name: '音声なし',
      needsApiKey: false,
      placeholder: '',
    },
  };

export const DEFAULT_VOICE_ENGINE: VoiceEngineType = 'none';
