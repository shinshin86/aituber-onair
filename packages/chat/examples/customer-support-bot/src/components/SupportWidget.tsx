import { useState } from 'react';
import { ChatServiceFactory, type Message } from '@aituber-onair/chat';
import ChatPanel from './ChatPanel';
import type { SupportMessage } from './MessageList';
import {
  loadSettings,
  SETTINGS_STORAGE_KEY,
  type SupportSettings,
} from './SettingsPanel';
import { buildSystemPrompt } from '../prompts/systemPrompt';

const WELCOME_MESSAGE: SupportMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm Onair-chan. Ask me anything about @aituber-onair/chat — providers, streaming, tools, vision, or setup.",
};

let messageSequence = 0;

const createMessageId = (prefix: string) => {
  messageSequence += 1;
  return `${prefix}-${Date.now()}-${messageSequence}`;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return 'The provider request failed. Check your API key and model settings.';
};

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SupportSettings>(loadSettings);
  const [messages, setMessages] = useState<SupportMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const saveSettings = (nextSettings: SupportSettings) => {
    setSettings(nextSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    setIsSettingsOpen(false);
  };

  const sendMessage = async (content: string) => {
    if (isLoading || !settings.apiKey.trim()) {
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
      const commonOptions = {
        apiKey: settings.apiKey,
        model: settings.model,
        responseLength: 'short' as const,
      };
      const service =
        settings.provider === 'openai'
          ? ChatServiceFactory.createChatService('openai', {
              ...commonOptions,
              gpt5Preset: 'casual',
            })
          : settings.provider === 'claude'
            ? ChatServiceFactory.createChatService('claude', commonOptions)
            : ChatServiceFactory.createChatService('gemini', commonOptions);

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
      const detail = getErrorMessage(error);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: `Sorry, I couldn't reach the provider. ${detail}`,
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
          messages={messages}
          settings={settings}
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
        aria-label={isOpen ? 'Close support chat' : 'Open support chat'}
        aria-expanded={isOpen}
      >
        <img src="/support-avatar.png" alt="" />
        <span aria-hidden="true" />
      </button>
    </div>
  );
}
