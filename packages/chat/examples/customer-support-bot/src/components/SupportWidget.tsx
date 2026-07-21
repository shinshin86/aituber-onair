import { useState } from 'react';
import {
  ChatServiceFactory,
  type ChatProviderName,
  type ChatServiceOptionsByProvider,
  type Message,
} from '@aituber-onair/chat';
import ChatPanel from './ChatPanel';
import type { SupportMessage } from './MessageList';
import {
  hasRequiredSettings,
  loadSettings,
  type SupportSettings,
} from './SettingsPanel';
import { buildSystemPrompt } from '../prompts/systemPrompt';
import { type Language, SETTINGS_STORAGE_KEY, translations } from '../i18n';

let messageSequence = 0;

const createMessageId = (prefix: string) => {
  messageSequence += 1;
  return `${prefix}-${Date.now()}-${messageSequence}`;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const createChatService = (settings: SupportSettings) => {
  const options: Record<string, unknown> = {
    model: settings.model,
    responseLength: 'short',
  };

  if (settings.provider !== 'gemini-nano') {
    options.apiKey = settings.apiKey;
  }
  if (settings.provider === 'openai') {
    options.gpt5Preset = 'casual';
  }
  if (settings.provider === 'openai-compatible') {
    options.endpoint = settings.endpoint;
  }

  return ChatServiceFactory.createChatService(
    settings.provider,
    options as ChatServiceOptionsByProvider[ChatProviderName],
  );
};

interface SupportWidgetProps {
  language: Language;
}

export default function SupportWidget({ language }: SupportWidgetProps) {
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SupportSettings>(loadSettings);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const welcomeMessage: SupportMessage = {
    id: 'welcome',
    role: 'assistant',
    content: t.chat.welcome,
  };

  const saveSettings = (nextSettings: SupportSettings) => {
    const localizedSettings = { ...nextSettings, language };
    setSettings(localizedSettings);
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(localizedSettings),
    );
    setIsSettingsOpen(false);
  };

  const sendMessage = async (content: string) => {
    if (isLoading) return;

    if (!hasRequiredSettings(settings)) {
      setIsSettingsOpen(true);
      return;
    }

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

    const conversation: Message[] = [
      {
        role: 'system',
        content: buildSystemPrompt(settings.persona),
      },
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
      const service = createChatService(settings);

      await service.processChat(
        conversation,
        (partial) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + partial }
                : message,
            ),
          );
        },
        async (complete) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: complete, state: undefined }
                : message,
            ),
          );
        },
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
          settings={settings}
          language={language}
          isLoading={isLoading}
          isSettingsOpen={isSettingsOpen}
          onClose={() => setIsOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCloseSettings={() => setIsSettingsOpen(false)}
          onSaveSettings={saveSettings}
          onSend={sendMessage}
        />
      )}
      <button
        type="button"
        className={`support-launcher${isOpen ? ' support-launcher--open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? t.chat.closeChat : t.chat.openChat}
        aria-expanded={isOpen}
      >
        <img src="/support-avatar.png" alt="" />
        <span aria-hidden="true" />
      </button>
    </div>
  );
}
