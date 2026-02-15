export type ChatProviderOption = 'openai' | 'openrouter' | 'gemini' | 'claude' | 'zai';
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
}

export interface LLMSettings {
  provider: ChatProviderOption;
  model: string;
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
