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
  speaker: string | number;
  // Engine-specific parameters
  defaultParams?: Record<string, any>;
}

export const VOICE_ENGINE_CONFIGS: Record<VoiceEngineType, VoiceEngineConfig> = {
  openai: {
    name: 'OpenAI TTS',
    apiUrl: 'https://api.openai.com/v1/audio/speech',
    needsApiKey: true,
    placeholder: 'sk-...',
    speaker: 'alloy',
    defaultParams: {
      voice: 'alloy',
      model: 'tts-1',
    }
  },
  voicevox: {
    name: 'VOICEVOX',
    apiUrl: 'http://localhost:50021',
    needsApiKey: false,
    placeholder: 'API key not needed',
    speaker: 1,
  },
  aivisSpeech: {
    name: 'Aivis Speech',
    apiUrl: 'http://localhost:10101',
    needsApiKey: false,
    placeholder: 'API key not needed',
    speaker: '888753760',
  },
  aivisCloud: {
    name: 'Aivis Cloud API',
    apiUrl: 'https://api.aivis-project.com/v1/tts/synthesize',
    needsApiKey: true,
    placeholder: 'Aivis Cloud API key',
    speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
    defaultParams: {
      speakingRate: 1.0,
      emotionalIntensity: 1.0,
      pitch: 0.0,
      volume: 1.0,
      outputFormat: 'mp3',
    }
  },
  voicepeak: {
    name: 'VoicePeak',
    apiUrl: 'http://localhost:20202',
    needsApiKey: false,
    placeholder: 'API key not needed',
    speaker: 'f1',
  },
  nijivoice: {
    name: 'にじボイス (NijiVoice)',
    needsApiKey: true,
    placeholder: 'NijiVoice API key',
    speaker: '56bb72e9-62f4-49d9-b57f-e86da9de7730',
  },
  minimax: {
    name: 'MiniMax',
    apiUrl: 'https://api.minimax.io/v1/t2a_v2',
    needsApiKey: true,
    placeholder: 'apiKey:groupId',
    speaker: 'male-qn-qingse',
    defaultParams: {
      endpoint: 'global',
    }
  },
  none: {
    name: '音声なし',
    needsApiKey: false,
    placeholder: '',
    speaker: '',
  }
};

export const DEFAULT_VOICE_ENGINE: VoiceEngineType = 'none';