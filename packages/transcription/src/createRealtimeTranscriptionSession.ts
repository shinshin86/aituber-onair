import type {
  RealtimeTranscriptionOptions,
  RealtimeTranscriptionSession,
} from './types';
import { LocalWhisperTranscriptionSession } from './providers/LocalWhisperTranscriptionSession';
import { OpenAIRealtimeTranscriptionSession } from './providers/OpenAIRealtimeTranscriptionSession';
import { WebSpeechTranscriptionSession } from './providers/WebSpeechTranscriptionSession';

export function createRealtimeTranscriptionSession(
  options: RealtimeTranscriptionOptions
): RealtimeTranscriptionSession {
  switch (options.provider) {
    case 'web-speech':
      return new WebSpeechTranscriptionSession(options);
    case 'openai-realtime':
      return new OpenAIRealtimeTranscriptionSession(options);
    case 'local-whisper':
      return new LocalWhisperTranscriptionSession(options);
    default: {
      const exhaustiveProvider: never = options;
      throw new Error(
        `Unsupported transcription options: ${exhaustiveProvider}`
      );
    }
  }
}
