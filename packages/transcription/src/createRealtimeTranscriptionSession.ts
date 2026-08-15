import type {
  RealtimeTranscriptionOptions,
  RealtimeTranscriptionSession,
} from './types';
import { OpenAIRealtimeTranscriptionSession } from './providers/OpenAIRealtimeTranscriptionSession';
import { WebSpeechTranscriptionSession } from './providers/WebSpeechTranscriptionSession';

export function createRealtimeTranscriptionSession(
  options: RealtimeTranscriptionOptions
): RealtimeTranscriptionSession {
  if (options.provider === 'web-speech') {
    return new WebSpeechTranscriptionSession(options);
  }
  return new OpenAIRealtimeTranscriptionSession(options);
}
