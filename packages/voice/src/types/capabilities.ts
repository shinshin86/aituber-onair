import type { VoiceEngineType } from './voiceEngine';

export type VoiceRuntime = 'browser' | 'node' | 'server' | 'unknown';

export interface VoiceEngineCapabilities {
  engineType: VoiceEngineType;
  requiresApiKey: boolean;
  supportsEmotion: boolean;
  supportsVoiceList: boolean;
  supportsCustomEndpoint: boolean;
  runtimes: VoiceRuntime[];
}
