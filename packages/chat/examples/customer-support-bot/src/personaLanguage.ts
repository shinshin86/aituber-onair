import type { DefaultPersonas } from './api';
import type { Language } from './i18n';

export interface PersonaLanguageChange {
  persona: string;
  pendingResetLanguage?: Language;
}

const isDefaultPersona = (
  persona: string,
  defaultPersonas: DefaultPersonas,
): boolean => persona === defaultPersonas.en || persona === defaultPersonas.ja;

export const syncDefaultPersonaToLanguage = (
  persona: string,
  defaultPersonas: DefaultPersonas,
  language: Language,
): string =>
  isDefaultPersona(persona, defaultPersonas)
    ? defaultPersonas[language]
    : persona;

export const changePersonaLanguage = (
  persona: string,
  defaultPersonas: DefaultPersonas,
  language: Language,
): PersonaLanguageChange =>
  isDefaultPersona(persona, defaultPersonas)
    ? { persona: defaultPersonas[language] }
    : { persona, pendingResetLanguage: language };

export const resolveLoadedPersona = (
  persona: string,
  defaultPersonas: DefaultPersonas,
  language: Language,
  languageChangedWhileLoading: boolean,
): PersonaLanguageChange =>
  languageChangedWhileLoading
    ? changePersonaLanguage(persona, defaultPersonas, language)
    : {
        persona: syncDefaultPersonaToLanguage(
          persona,
          defaultPersonas,
          language,
        ),
      };

export const acceptPersonaReset = (
  defaultPersonas: DefaultPersonas,
  language: Language,
): PersonaLanguageChange => ({
  persona: defaultPersonas[language],
});

export const declinePersonaReset = (
  persona: string,
): PersonaLanguageChange => ({ persona });

export const reconcileSavedPersona = (
  currentPersona: string,
  savedPersona: string,
  languageChangedWhileSaving: boolean,
): string => (languageChangedWhileSaving ? currentPersona : savedPersona);
