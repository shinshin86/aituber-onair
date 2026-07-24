export const DEFAULT_SPEECH_LANGUAGE = 'ja-JP';

export interface SpeechRecognitionMessages {
  startError: string;
  noSpeech: string;
  permissionDenied: string;
  noMicrophone: string;
  networkError: string;
  stopped: string;
  paused: string;
  listening: string;
  starting: string;
}

export const DEFAULT_SPEECH_RECOGNITION_MESSAGES: SpeechRecognitionMessages = {
  startError: 'Voice input could not start. You can keep typing instead.',
  noSpeech: 'No speech was detected. Try again or keep typing.',
  permissionDenied:
    'Microphone access was denied. You can keep typing instead.',
  noMicrophone: 'No microphone is available. You can keep typing instead.',
  networkError: 'Voice input is temporarily unavailable. You can keep typing.',
  stopped: 'Voice input stopped. You can keep typing instead.',
  paused: 'Voice input paused while Miko is speaking.',
  listening: 'Listening in {language}…',
  starting: 'Starting voice input…',
};

export function resolveSpeechLanguage(language?: string): string {
  return language?.trim() || DEFAULT_SPEECH_LANGUAGE;
}

export function appendTranscript(
  current: string,
  next: string,
  maxLength?: number,
): string {
  const base = current.trimEnd();
  const addition = next.trim();
  const appended = (() => {
    if (!base) return addition;
    if (!addition) return base;

    const needsSpace =
      /[A-Za-z0-9]$/.test(base) && /^[A-Za-z0-9]/.test(addition);
    return `${base}${needsSpace ? ' ' : ''}${addition}`;
  })();

  return maxLength === undefined
    ? appended
    : appended.slice(0, Math.max(0, maxLength));
}

export function getSpeechRecognitionErrorMessage(
  error: string,
  messages: SpeechRecognitionMessages = DEFAULT_SPEECH_RECOGNITION_MESSAGES,
): string | null {
  switch (error) {
    case 'aborted':
      return null;
    case 'start-failed':
      return messages.startError;
    case 'no-speech':
      return messages.noSpeech;
    case 'not-allowed':
    case 'service-not-allowed':
      return messages.permissionDenied;
    case 'audio-capture':
      return messages.noMicrophone;
    case 'network':
      return messages.networkError;
    default:
      return messages.stopped;
  }
}
