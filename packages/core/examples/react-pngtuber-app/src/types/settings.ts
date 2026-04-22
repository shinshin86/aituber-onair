export type ChatProviderOption =
  | 'openai'
  | 'openrouter'
  | 'gemini'
  | 'gemini-nano'
  | 'claude'
  | 'xai'
  | 'zai'
  | 'kimi'
  | 'openai-compatible';
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
export type StreamingPlatformOption = 'none' | 'youtube' | 'twitch';

export interface ProviderApiKeys {
  openai?: string;
  openrouter?: string;
  gemini?: string;
  claude?: string;
  xai?: string;
  zai?: string;
  kimi?: string;
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

export interface StreamSettings {
  platform: StreamingPlatformOption;
  youtubeApiKey: string;
  youtubeLiveId: string;
  youtubeEnabled: boolean;
  youtubeCommentIntervalMs: number;
  twitchClientId: string;
  twitchAccessToken: string;
  twitchChannel: string;
  twitchEnabled: boolean;
  twitchCommentIntervalMs: number;
}

export interface AppSettings {
  llm: LLMSettings;
  tts: TTSSettings;
  stream: StreamSettings;
}
