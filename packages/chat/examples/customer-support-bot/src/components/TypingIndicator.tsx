import { type Language, translations } from '../i18n';

interface TypingIndicatorProps {
  language: Language;
}

export default function TypingIndicator({ language }: TypingIndicatorProps) {
  return (
    <div
      className="typing-indicator"
      aria-label={translations[language].chat.typing}
    >
      <span />
      <span />
      <span />
    </div>
  );
}
