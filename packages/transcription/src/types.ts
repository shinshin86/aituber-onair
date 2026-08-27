export type TranscriptionProviderName =
  | 'web-speech'
  | 'openai-realtime'
  | 'gemini-live'
  | 'local-whisper';

export interface TranscriptUpdate {
  utteranceId: string;
  text: string;
  isFinal: boolean;
}

export interface TranscriptionProgress {
  phase: 'download' | 'initialize' | 'ready';
  file?: string;
  loadedBytes?: number;
  totalBytes?: number;
  /** Normalized progress from 0 to 1, when the total size is known. */
  progress?: number;
  message?: string;
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
  | 'ephemeral-token-failed'
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

export type GeminiLiveAuth =
  | {
      type: 'ephemeral-token';
      getEphemeralToken: () => Promise<string>;
    }
  | {
      type: 'browser-api-key';
      getApiKey: () => Promise<string>;
      acknowledgeBrowserKeyRisk: true;
    };

export type GeminiTranscriptionMode = 'verbatim' | 'smart';

export type TranscriptionDelay =
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh';

export type LocalWhisperModelSize = 'tiny' | 'base' | 'small';

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

export interface GeminiLiveTranscriptionOptions {
  provider: 'gemini-live';
  auth: GeminiLiveAuth;

  /**
   * Optional BCP 47 language hints. An empty or omitted list enables automatic
   * language detection, including code-switching within a session.
   */
  languages?: string[];

  /**
   * Terms used to bias recognition toward names, jargon, and other uncommon
   * vocabulary. Gemini accepts up to 1,000 terms; Google recommends using no
   * more than 100 for best results.
   */
  keywords?: string[];

  /**
   * "verbatim" preserves fillers and false starts. "smart" cleans and formats
   * the transcript for readability.
   *
   * Default: "verbatim"
   */
  mode?: GeminiTranscriptionMode;
}

export interface LocalWhisperTranscriptionOptions {
  provider: 'local-whisper';

  /**
   * Whisper model size.
   *
   * Default: "tiny". Larger models download more data on first use and infer
   * more slowly, but can improve recognition quality.
   */
  model?: LocalWhisperModelSize;

  /**
   * Optional language hint.
   *
   * Accepts BCP 47-style input such as "ja-JP" or "en-US". The
   * implementation normalizes this before passing it to Whisper. When omitted,
   * Whisper performs language detection.
   */
  language?: string;

  /**
   * Amount of silence used to detect the end of an utterance.
   *
   * Default: 500
   * Minimum: 150
   */
  silenceDurationMs?: number;

  /**
   * Advanced: override the URL of the local Whisper worker asset.
   * Use this when your bundler cannot resolve the worker file that ships with
   * this package (for example when the package is pre-bundled by a dev server).
   * The URL must point to the `local-whisper.worker.js` asset built by this
   * package or an equivalent module worker.
   */
  workerUrl?: string | URL;
}

export type RealtimeTranscriptionOptions =
  | WebSpeechTranscriptionOptions
  | OpenAIRealtimeTranscriptionOptions
  | GeminiLiveTranscriptionOptions
  | LocalWhisperTranscriptionOptions;

export interface RealtimeTranscriptionSession {
  readonly provider: TranscriptionProviderName;
  readonly capabilities: TranscriptionCapabilities;
  readonly state: TranscriptionState;
  start(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  onTranscript(listener: (update: TranscriptUpdate) => void): () => void;
  onProgress(listener: (progress: TranscriptionProgress) => void): () => void;
  onStateChange(listener: (state: TranscriptionState) => void): () => void;
  onError(listener: (error: TranscriptionError) => void): () => void;
}
