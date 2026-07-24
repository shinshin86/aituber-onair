import type { Language } from './i18n';

const SPEECH_RECOGNITION_LANGUAGES: Record<Language, string> = {
  en: 'en-US',
  ja: 'ja-JP',
};

export const getSpeechRecognitionLanguage = (language: Language): string =>
  SPEECH_RECOGNITION_LANGUAGES[language];

export const getLanguageAwareChatEndpoint = (
  origin: string,
  language: Language,
): string => {
  const endpoint = new URL('/api/support/chat/completions', origin);
  endpoint.searchParams.set('language', language);
  return endpoint.toString();
};
