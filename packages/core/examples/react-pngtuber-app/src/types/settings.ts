export type ChatProviderOption =
  | 'openai'
  | 'openrouter'
  | 'gemini'
  | 'claude'
  | 'zai'
  | 'openai-compatible';
export type TTSEngineOption =
  | 'openai'
  | 'voicevox'
  | 'voicepeak'
  | 'aivisSpeech'
  | 'aivisCloud'
  | 'minimax'
  | 'none';

export interface ProviderApiKeys {
  openai?: string;
  openrouter?: string;
  gemini?: string;
  claude?: string;
  zai?: string;
  'openai-compatible'?: string;
}

export interface LLMSettings {
  provider: ChatProviderOption;
  model: string;
  endpoint?: string;
  apiKeys: ProviderApiKeys;
  openRouterDynamicFreeModels?: {
    models: string[];
    fetchedAt: number;
    maxCandidates: number;
  };
}

export interface TTSSettings {
  engine: TTSEngineOption;
  speaker: string;
  voicevoxApiUrl?: string;
  voicepeakApiUrl?: string;
  aivisSpeechApiUrl?: string;
  aivisCloudApiKey?: string;
  aivisCloudModelUuid?: string;
  aivisCloudSpeakerUuid?: string;
  aivisCloudStyleId?: string;
  minimaxApiKey?: string;
  minimaxGroupId?: string;
}

export interface AppSettings {
  llm: LLMSettings;
  tts: TTSSettings;
}
