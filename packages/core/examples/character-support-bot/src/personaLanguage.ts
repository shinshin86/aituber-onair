import type { Language } from './i18n';

export interface DefaultPersonas {
  en: string;
  ja: string;
}

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

export const isDefaultPersona = (
  persona: string,
  defaultPersonas: DefaultPersonas,
  aliases: string[] = [],
): boolean =>
  persona === defaultPersonas.en ||
  persona === defaultPersonas.ja ||
  aliases.includes(persona);

export const resolvePersonaForLanguage = (
  persona: string,
  defaultPersonas: DefaultPersonas,
  language: Language,
  aliases: string[] = [],
): string =>
  isDefaultPersona(persona, defaultPersonas, aliases)
    ? defaultPersonas[language]
    : persona;
