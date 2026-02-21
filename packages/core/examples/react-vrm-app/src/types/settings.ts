export type ChatProviderOption =
  | 'openai'
  | 'openai-compatible'
  | 'openrouter'
  | 'gemini'
  | 'claude'
  | 'zai'
  | 'kimi';
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
  'openai-compatible'?: string;
  openrouter?: string;
  gemini?: string;
  claude?: string;
  zai?: string;
  kimi?: string;
}

export interface LLMSettings {
  provider: ChatProviderOption;
  model: string;
  endpoint?: string;
  apiKeys: ProviderApiKeys;
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
