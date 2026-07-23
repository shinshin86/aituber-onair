import { useEffect, useState } from 'react';
import ChatPanel from './ChatPanel';
import type { SupportMessage } from './MessageList';
import {
  getSupportStatus,
  streamSupportChat,
  type SupportChatMessage,
} from '../api';
import { type Language, translations } from '../i18n';

let messageSequence = 0;

const createMessageId = (prefix: string) => {
  messageSequence += 1;
  return `${prefix}-${Date.now()}-${messageSequence}`;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

interface SupportWidgetProps {
  language: Language;
}

export default function SupportWidget({ language }: SupportWidgetProps) {
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [hasStatusError, setHasStatusError] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const welcomeMessage: SupportMessage = {
    id: 'welcome',
    role: 'assistant',
    content: t.chat.welcome,
  };

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsConfigured(null);
    setHasStatusError(false);
    void getSupportStatus()
      .then(({ configured }) => {
        if (!cancelled) setIsConfigured(configured);
      })
      .catch(() => {
        if (!cancelled) {
          setIsConfigured(false);
          setHasStatusError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (isLoading) return;

    if (isConfigured !== true) return;

    const userMessage: SupportMessage = {
      id: createMessageId('user'),
      role: 'user',
      content,
    };
    const assistantId = createMessageId('assistant');
    const streamingMessage: SupportMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      state: 'streaming',
    };

    const conversation: SupportChatMessage[] = [
      {
        role: welcomeMessage.role,
        content: welcomeMessage.content,
      },
      ...messages
        .filter((message) => message.state !== 'error')
        .map(({ role, content: messageContent }) => ({
          role,
          content: messageContent,
        })),
      { role: 'user', content },
    ];

    setMessages((current) => [...current, userMessage, streamingMessage]);
    setIsLoading(true);

    try {
      const complete = await streamSupportChat(conversation, (delta) => {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + delta }
              : message,
          ),
        );
      });
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: complete, state: undefined }
            : message,
        ),
      );
    } catch (error) {
      const detail = getErrorMessage(error, t.chat.providerErrorFallback);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: `${t.chat.providerErrorPrefix} ${detail}`,
                state: 'error',
              }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="support-widget">
      {isOpen && (
        <ChatPanel
          messages={[welcomeMessage, ...messages]}
          language={language}
          isConfigured={isConfigured}
          hasStatusError={hasStatusError}
          isLoading={isLoading}
          isMenuOpen={isMenuOpen}
          onClose={() => setIsOpen(false)}
          onOpenMenu={() => setIsMenuOpen(true)}
          onCloseMenu={() => setIsMenuOpen(false)}
          onSend={sendMessage}
        />
      )}
      <button
        type="button"
        className={`support-launcher${isOpen ? ' support-launcher--open' : ''}`}
        onClick={() => {
          setIsOpen((open) => !open);
          setIsMenuOpen(false);
        }}
        aria-label={isOpen ? t.chat.closeChat : t.chat.openChat}
        aria-expanded={isOpen}
      >
        <img src="/support-avatar.png" alt="" />
        <span aria-hidden="true" />
      </button>
    </div>
  );
}
