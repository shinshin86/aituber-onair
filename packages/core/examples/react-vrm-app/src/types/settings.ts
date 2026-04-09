export type ChatProviderOption =
  | 'openai'
  | 'openai-compatible'
  | 'openrouter'
  | 'gemini'
  | 'gemini-nano'
  | 'claude'
  | 'zai'
  | 'kimi'
  | 'xai';
export type TTSEngineOption =
  | 'openai'
  | 'geminiTts'
  | 'openaiCompatible'
  | 'voicevox'
  | 'voicepeak'
  | 'aivisSpeech'
  | 'aivisCloud'
  | 'minimax'
  | 'xai'
  | 'piperPlus'
  | 'none';

export interface ProviderApiKeys {
  openai?: string;
  'openai-compatible'?: string;
  openrouter?: string;
  gemini?: string;
  claude?: string;
  zai?: string;
  kimi?: string;
  xai?: string;
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
  openAiCompatibleApiKey?: string;
  openAiCompatibleApiUrl?: string;
  openAiCompatibleModel?: string;
  openAiCompatibleSpeed?: string;
  geminiTtsModel?: string;
  geminiTtsLanguageCode?: string;
  geminiTtsPrompt?: string;
  voicevoxApiUrl?: string;
  voicepeakApiUrl?: string;
  aivisSpeechApiUrl?: string;
  aivisCloudApiKey?: string;
  aivisCloudModelUuid?: string;
  aivisCloudSpeakerUuid?: string;
  aivisCloudStyleId?: string;
  minimaxApiKey?: string;
  minimaxGroupId?: string;
  xaiLanguage?: string;
  xaiCodec?: string;
  xaiSampleRate?: number;
  xaiBitRate?: number;
  piperPlusBasePath?: string;
  piperPlusModelConfigFile?: string;
  piperPlusModelFile?: string;
  piperPlusVoiceFile?: string;
  piperPlusSpeed?: string;
  piperPlusNoiseScale?: string;
}

export interface AppSettings {
  llm: LLMSettings;
  tts: TTSSettings;
}
