import type { VoiceEngineType } from './voiceEngine';

export type VoiceRuntime = 'browser' | 'node' | 'server' | 'unknown';
export type VoiceListEndpoint = 'global' | 'china';

export interface VoiceEngineCapabilities {
  engineType: VoiceEngineType;
  requiresApiKey: boolean;
  supportsEmotion: boolean;
  supportsVoiceList: boolean;
  supportsCustomEndpoint: boolean;
  runtimes: VoiceRuntime[];
}

export interface VoiceEngineVoice {
  id: string;
  label: string;
  metadata?: Record<string, string>;
}

export interface VoiceEngineVoiceListOptions {
  apiKey?: string;
  apiUrl?: string;
  voiceListApiUrl?: string;
  endpoint?: VoiceListEndpoint;
  language?: string;
  includeCatalog?: boolean;
  limit?: number;
  skip?: number;
  pageSize?: number;
}
