import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { type Language, translations } from '../i18n';

interface MessageInputProps {
  disabled: boolean;
  isLoading: boolean;
  language: Language;
  onSend: (message: string) => void;
}

export default function MessageInput({
  disabled,
  isLoading,
  language,
  onSend,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const t = translations[language];

  const submit = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled && !isLoading
            ? t.chat.inputDisabledPlaceholder
            : t.chat.inputPlaceholder
        }
        aria-label={t.chat.messageLabel}
        rows={1}
        disabled={disabled}
      />
      <button
        type="submit"
        className="send-message-button"
        disabled={disabled || !message.trim()}
        aria-label={t.chat.sendMessage}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4 12 16-8-5 16-3-6-8-2Z" />
          <path d="m12 14 8-10" />
        </svg>
      </button>
    </form>
  );
}
