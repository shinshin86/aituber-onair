import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { translations, type Language } from '../i18n';
import {
  buildSupportSystemPrompt,
  buildSupportUserPrompt,
  createSupportService,
  getSupportSections,
  getSupportSourceLinks,
} from '../support';
import type { KnowledgeSection } from '../knowledge';
import type { GeminiNanoStatus } from '../useGeminiNanoStatus';
import { shouldSubmitMessageOnKeyDown } from './messageInputKeydown';

interface SupportMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  state?: 'pending' | 'error';
  sources?: { title: string; url: string }[];
}

interface ModelMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SupportChatProps {
  language: Language;
  status: GeminiNanoStatus;
  onPrepare: () => void;
  isPreparing: boolean;
}

let messageSequence = 0;

const nextMessageId = () => {
  messageSequence += 1;
  return messageSequence;
};

export default function SupportChat({
  language,
  status,
  onPrepare,
  isPreparing,
}: SupportChatProps) {
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [modelTranscript, setModelTranscript] = useState<ModelMessage[]>([]);
  const [lastSelectedSections, setLastSelectedSections] = useState<
    KnowledgeSection[]
  >([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const service = useMemo(() => createSupportService(language), [language]);
  const isReady = status === 'available';

  // biome-ignore lint/correctness/useExhaustiveDependencies: The selected language is intentionally the reset trigger.
  useEffect(() => {
    setMessages([]);
    setModelTranscript([]);
    setLastSelectedSections([]);
    setDraft('');
    setIsLoading(false);
  }, [language]);

  const resetConversation = () => {
    setMessages([]);
    setModelTranscript([]);
    setLastSelectedSections([]);
    setDraft('');
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !isReady || isLoading) return;

    const userMessage: SupportMessage = {
      id: nextMessageId(),
      role: 'user',
      content,
    };
    const assistantId = nextMessageId();
    const pendingMessage: SupportMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      state: 'pending',
    };
    const sections = getSupportSections(content, lastSelectedSections);
    const modelUserContent = buildSupportUserPrompt(content, sections);
    const conversation = modelTranscript.slice(-6);

    setDraft('');
    setIsLoading(true);
    setMessages((current) => [...current, userMessage, pendingMessage]);

    let completedResponse = '';
    try {
      await service.processChat(
        [
          { role: 'system', content: buildSupportSystemPrompt(language) },
          ...conversation,
          { role: 'user', content: modelUserContent },
        ],
        (response) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: `${message.content}${response}` }
                : message,
            ),
          );
        },
        async (response) => {
          completedResponse = response;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: response, state: undefined }
                : message,
            ),
          );
        },
      );
      setModelTranscript((current) => [
        ...current,
        { role: 'user', content: modelUserContent },
        { role: 'assistant', content: completedResponse },
      ]);
      setLastSelectedSections(sections);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                sources: getSupportSourceLinks(sections, t.chat.packageReadme),
              }
            : message,
        ),
      );
    } catch (error) {
      const detail =
        error instanceof Error && error.message
          ? error.message
          : t.chat.unknownError;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: `${t.chat.errorPrefix} ${detail}`,
                state: 'error',
              }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!shouldSubmitMessageOnKeyDown(event)) return;

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <div className="support-widget">
      {isOpen && (
        <section className="chat-panel" aria-label={t.chat.panelLabel}>
          <header className="chat-header">
            <div className="chat-agent">
              <span className="chat-avatar">
                <img src="/support-avatar.png" alt="" />
                <span
                  className={isReady ? 'status-dot is-ready' : 'status-dot'}
                />
              </span>
              <span>
                <strong>{t.chat.displayName}</strong>
                <small>{t.chat.subtitle}</small>
              </span>
            </div>
            <div className="chat-actions">
              <button
                type="button"
                onClick={resetConversation}
                aria-label={t.chat.reset}
                title={t.chat.reset}
              >
                ↻
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t.chat.close}
                title={t.chat.close}
              >
                ×
              </button>
            </div>
          </header>

          <div className="chat-status">
            <span className={isReady ? 'is-ready' : undefined}>
              {isReady ? t.chat.online : t.chat.offline}
            </span>
            {!isReady && (
              <button
                type="button"
                onClick={onPrepare}
                disabled={
                  isPreparing ||
                  (status !== 'downloadable' && status !== 'downloading')
                }
              >
                {isPreparing ? t.model.preparing : t.model.prepare}
              </button>
            )}
          </div>

          <div className="message-list" aria-live="polite">
            <div className="message-row message-row--assistant">
              <img src="/support-avatar.png" alt="" />
              <p>{t.chat.welcome}</p>
            </div>
            {messages.map((message) => (
              <div
                className={`message-row message-row--${message.role}`}
                key={message.id}
              >
                {message.role === 'assistant' && (
                  <img src="/support-avatar.png" alt="" />
                )}
                {message.state === 'pending' && !message.content ? (
                  <div className="typing-indicator" aria-label={t.chat.typing}>
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <div className="message-content">
                    <p
                      className={
                        message.state === 'error' ? 'message-error' : undefined
                      }
                    >
                      {message.content}
                    </p>
                    {message.role === 'assistant' &&
                      message.state !== 'error' &&
                      message.sources && (
                        <div className="message-sources">
                          <span>{t.chat.sourcesLabel}</span>
                          {message.sources.map((source) => (
                            <a
                              href={source.url}
                              key={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {source.title}
                            </a>
                          ))}
                        </div>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form className="message-input" onSubmit={sendMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isReady ? t.chat.inputPlaceholder : t.chat.inputDisabled
              }
              aria-label={t.chat.messageLabel}
              rows={1}
              disabled={!isReady || isLoading}
            />
            <button
              type="submit"
              disabled={!isReady || isLoading || !draft.trim()}
              aria-label={t.chat.send}
            >
              ↑
            </button>
          </form>
          <footer className="chat-footer">
            {t.chat.poweredBy} <strong>@aituber-onair/chat</strong>
          </footer>
        </section>
      )}

      <button
        type="button"
        className="support-launcher"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? t.chat.close : t.chat.open}
        aria-expanded={isOpen}
      >
        <img src="/support-avatar.png" alt="" />
        <span className={isReady ? 'is-ready' : undefined} />
      </button>
    </div>
  );
}
