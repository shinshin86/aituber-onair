import { type Language, translations } from '../i18n';

const LANGUAGE_OPTIONS: Language[] = ['en', 'ja'];

interface LanguageSwitchProps {
  language: Language;
  onChange: (language: Language) => void;
}

export default function LanguageSwitch({
  language,
  onChange,
}: LanguageSwitchProps) {
  const t = translations[language];

  return (
    <fieldset className="language-switch" aria-label={t.language.label}>
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          type="button"
          key={option}
          className={language === option ? 'is-active' : undefined}
          aria-pressed={language === option}
          aria-label={
            option === 'en' ? t.language.english : t.language.japanese
          }
          onClick={() => onChange(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </fieldset>
  );
}
