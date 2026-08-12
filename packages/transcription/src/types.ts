export type TranscriptionProviderName = 'web-speech' | 'openai-realtime';

export interface TranscriptUpdate {
  utteranceId: string;
  text: string;
  isFinal: boolean;
}

export interface TranscriptionCapabilities {
  interimResults: boolean;
  multipleLanguages: boolean;
  keywords: boolean;
  configurableDelay: boolean;
}

export type TranscriptionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'stopping'
  | 'error'
  | 'disposed';

export type TranscriptionErrorCode =
  | 'unsupported-provider'
  | 'insecure-context'
  | 'permission-denied'
  | 'no-speech'
  | 'authentication-failed'
  | 'client-secret-failed'
  | 'connection-failed'
  | 'provider-error'
  | 'invalid-configuration'
  | 'session-disposed';

export interface TranscriptionError extends Error {
  code: TranscriptionErrorCode;
  provider: TranscriptionProviderName;
}

export type OpenAIRealtimeAuth =
  | {
      type: 'client-secret';
      getClientSecret: () => Promise<string>;
    }
  | {
      type: 'browser-api-key';
      getApiKey: () => Promise<string>;
      acknowledgeBrowserKeyRisk: true;
    };

export type TranscriptionDelay =
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh';

export interface WebSpeechTranscriptionOptions {
  provider: 'web-speech';
  language: string;
  continuous?: boolean;
}

export interface OpenAIRealtimeTranscriptionOptions {
  provider: 'openai-realtime';
  auth: OpenAIRealtimeAuth;
  languages?: string[];
  keywords?: string[];
  prompt?: string;
  delay?: TranscriptionDelay;
}

export type RealtimeTranscriptionOptions =
  | WebSpeechTranscriptionOptions
  | OpenAIRealtimeTranscriptionOptions;

export interface RealtimeTranscriptionSession {
  readonly provider: TranscriptionProviderName;
  readonly capabilities: TranscriptionCapabilities;
  readonly state: TranscriptionState;
  start(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  onTranscript(listener: (update: TranscriptUpdate) => void): () => void;
  onStateChange(listener: (state: TranscriptionState) => void): () => void;
  onError(listener: (error: TranscriptionError) => void): () => void;
}
