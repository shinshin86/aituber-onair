export const DEFAULT_SPEECH_LANGUAGE = 'ja-JP';

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

export function getSpeechRecognitionErrorMessage(error: string): string | null {
  switch (error) {
    case 'aborted':
      return null;
    case 'no-speech':
      return 'No speech was detected. Try again or keep typing.';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was denied. You can keep typing instead.';
    case 'audio-capture':
      return 'No microphone is available. You can keep typing instead.';
    case 'network':
      return 'Voice input is temporarily unavailable. You can keep typing.';
    default:
      return 'Voice input stopped. You can keep typing instead.';
  }
}
