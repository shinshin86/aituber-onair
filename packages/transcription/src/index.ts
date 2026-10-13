export { resolveOpenAICompatibleTranscriptionEndpoint } from './providers/openaiCompatibleTranscription';
export { createRealtimeTranscriptionSession } from './createRealtimeTranscriptionSession';
export { TranscriptionSessionError } from './errors';
export { isTranscriptionProviderSupported } from './support';
export type {
  GeminiLiveAuth,
  GeminiLiveTranscriptionOptions,
  GeminiTranscriptionMode,
  LocalWhisperModelSize,
  LocalWhisperTranscriptionOptions,
  OpenAICompatibleTranscriptionAuth,
  OpenAICompatibleTranscriptionOptions,
  OpenAIRealtimeAuth,
  OpenAIRealtimeTranscriptionOptions,
  RealtimeTranscriptionOptions,
  RealtimeTranscriptionSession,
  TranscriptUpdate,
  TranscriptionCapabilities,
  TranscriptionDelay,
  TranscriptionError,
  TranscriptionErrorCode,
  TranscriptionProviderName,
  TranscriptionProgress,
  TranscriptionState,
  WebSpeechTranscriptionOptions,
} from './types';
