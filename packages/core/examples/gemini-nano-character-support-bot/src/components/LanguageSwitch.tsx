import { type Language, translations } from '../i18n';

const LANGUAGE_OPTIONS: Language[] = ['en', 'ja'];

interface LanguageSwitchProps {
  language: Language;
  onChange: (language: Language) => void;
  disabled?: boolean;
}

export default function LanguageSwitch({
  language,
  onChange,
  disabled = false,
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
          disabled={disabled}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </fieldset>
  );
}
