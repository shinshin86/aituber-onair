import { useEffect, useRef } from 'react';
import TypingIndicator from './TypingIndicator';
import { renderMarkdownContent } from './markdownContent';
import type { Language } from '../i18n';

export interface SupportMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  state?: 'streaming' | 'error';
}

interface MessageListProps {
  messages: SupportMessage[];
  language: Language;
}

export default function MessageList({ messages, language }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });

  return (
    <div className="message-list" aria-live="polite">
      {messages.map((message) => (
        <div
          className={`message-row message-row--${message.role}`}
          key={message.id}
        >
          {message.role === 'assistant' && (
            <img className="message-avatar" src="/support-avatar.png" alt="" />
          )}
          {message.state === 'streaming' && !message.content ? (
            <TypingIndicator language={language} />
          ) : (
            <div
              className={`message-bubble${
                message.state === 'error' ? ' message-bubble--error' : ''
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="markdown-content">
                  {renderMarkdownContent(
                    message.content,
                    message.state === 'streaming' ? (
                      <span
                        className="stream-cursor"
                        aria-hidden="true"
                        key="stream-cursor"
                      />
                    ) : undefined,
                  )}
                </div>
              ) : (
                <>
                  {message.content}
                  {message.state === 'streaming' && (
                    <span className="stream-cursor" aria-hidden="true" />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
