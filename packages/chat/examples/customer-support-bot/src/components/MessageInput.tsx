import { useState, type FormEvent, type KeyboardEvent } from 'react';

interface MessageInputProps {
  disabled: boolean;
  isLoading: boolean;
  onSend: (message: string) => void;
}

export default function MessageInput({
  disabled,
  isLoading,
  onSend,
}: MessageInputProps) {
  const [message, setMessage] = useState('');

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
            ? 'Add an API key in Settings to chat'
            : 'Ask about @aituber-onair/chat…'
        }
        aria-label="Message Onair-chan"
        rows={1}
        disabled={disabled}
      />
      <button
        type="submit"
        className="send-message-button"
        disabled={disabled || !message.trim()}
        aria-label="Send message"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4 12 16-8-5 16-3-6-8-2Z" />
          <path d="m12 14 8-10" />
        </svg>
      </button>
    </form>
  );
}
