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
  | 'unrealSpeech'
  | 'elevenLabs'
  | 'inworld'
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
    unrealSpeech: {
      name: 'Unreal Speech',
      apiUrl: 'https://api.v8.unrealspeech.com/stream',
      needsApiKey: true,
      placeholder: 'Unreal Speech API key',
      defaultParams: {
        bitrate: '192k',
        codec: 'libmp3lame',
      },
    },
    elevenLabs: {
      name: 'ElevenLabs',
      apiUrl: 'https://api.elevenlabs.io/v1/text-to-speech',
      needsApiKey: true,
      placeholder: 'ElevenLabs API key',
      defaultParams: {
        model: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
      },
    },
    inworld: {
      name: 'Inworld',
      apiUrl: 'https://api.inworld.ai/tts/v1/voice',
      needsApiKey: true,
      placeholder: 'Inworld Basic Base64 credentials',
      defaultParams: {
        model: 'inworld-tts-2',
        audioEncoding: 'MP3',
        sampleRateHertz: 48000,
        language: 'ja-JP',
      },
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
