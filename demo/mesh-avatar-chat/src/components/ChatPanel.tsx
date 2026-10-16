import { type FormEvent, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../hooks/useChatCore';

interface ChatPanelProps {
  messages: ChatMessage[];
  partial: string;
  isProcessing: boolean;
  error: string;
  disabled: boolean;
  /** Shown in the input while the page cannot take messages yet */
  disabledHint?: string;
  onSend: (text: string) => void;
}

const SUGGESTIONS = [
  '自己紹介して',
  '今日のおすすめの過ごし方は？',
  '好きな食べ物は？',
];

export function ChatPanel({
  messages,
  partial,
  isProcessing,
  error,
  disabled,
  disabledHint,
  onSend,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, partial]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || disabled || isProcessing) return;
    onSend(text);
    setDraft('');
  };

  return (
    <section className="chat" aria-label="チャット">
      <div ref={listRef} className="chat-log" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`bubble bubble-${message.role}`}>
            {message.text}
          </div>
        ))}
        {isProcessing && (
          <div className="bubble bubble-assistant bubble-partial">
            {partial || '考え中…'}
          </div>
        )}
        {error && <div className="chat-error">{error}</div>}
      </div>
      {messages.length <= 1 && (
        <div className="suggestions">
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              className="chip"
              disabled={disabled || isProcessing}
              onClick={() => onSend(text)}
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <form className="chat-form" onSubmit={submit}>
        <input
          className="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            disabled && disabledHint ? disabledHint : 'ミコに話しかける'
          }
          aria-label="メッセージ"
          disabled={disabled}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button
          type="submit"
          className="send"
          disabled={disabled || isProcessing || !draft.trim()}
        >
          送信
        </button>
      </form>
    </section>
  );
}
