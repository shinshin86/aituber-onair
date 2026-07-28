import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useCharacterSupportCore } from '../hooks/useCharacterSupportCore';
import type { GeminiNanoStatus } from '../hooks/useGeminiNanoStatus';
import { useSyntheticLipsync } from '../hooks/useSyntheticLipsync';
import { type Language, translations } from '../i18n';
import AvatarCanvas from './AvatarCanvas';
import LanguageSwitch from './LanguageSwitch';

const MAX_MESSAGE_LENGTH = 1200;

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m4 4 17 8-17 8 3-8-3-8Z" />
    <path d="M7 12h14" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2c.7 5.8 4.2 9.3 10 10-5.8.7-9.3 4.2-10 10-.7-5.8-4.2-9.3-10-10 5.8-.7 9.3-4.2 10-10Z" />
  </svg>
);

interface SupportWidgetProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  status: GeminiNanoStatus;
  onPrepare: () => void;
  isPreparing: boolean;
  onBusyChange: (busy: boolean) => void;
}

export default function SupportWidget({
  language,
  onLanguageChange,
  status,
  onPrepare,
  isPreparing,
  onBusyChange,
}: SupportWidgetProps) {
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [draft, setDraft] = useState('');
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const modelAvailable = status === 'available';
  const canPrepare = status === 'downloadable' || status === 'downloading';
  const {
    messages,
    isReady,
    isProcessing,
    isSpeechActive,
    reaction,
    sendMessage,
    resetConversation,
  } = useCharacterSupportCore({
    enabled: hasOpened && modelAvailable,
    language,
    errorMessage: t.chat.coreError,
  });
  const mouthLevel = useSyntheticLipsync(isSpeechActive);

  useEffect(() => {
    const element = messageListRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    onBusyChange(isProcessing);
    return () => onBusyChange(false);
  }, [isProcessing, onBusyChange]);

  const toggleWidget = () => {
    setHasOpened(true);
    setIsOpen((current) => !current);
  };

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !isReady || isProcessing) return;

    setDraft('');
    await sendMessage(content);
  };

  const canSend =
    isReady && !isProcessing && draft.trim().length > 0 && modelAvailable;

  return (
    <aside className="support-widget" aria-label={t.chat.widgetLabel}>
      {isOpen && (
        <section className="support-panel" aria-label={t.chat.panelLabel}>
          <header className="support-header">
            <div>
              <span className="support-kicker">{t.chat.kicker}</span>
              <strong>Miko</strong>
              <span className="support-presence">
                <i /> {isSpeechActive ? t.chat.speaking : t.chat.local}
              </span>
            </div>
            <div className="support-header-actions">
              <LanguageSwitch
                language={language}
                onChange={onLanguageChange}
                disabled={isProcessing || isPreparing}
              />
              <button
                type="button"
                onClick={resetConversation}
                disabled={isProcessing}
                aria-label={t.chat.reset}
                title={t.chat.reset}
              >
                <span aria-hidden="true">↻</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t.chat.close}
                title={t.chat.close}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </header>

          <AvatarCanvas
            voiceLevel={mouthLevel}
            isSpeaking={isSpeechActive}
            reaction={reaction}
          />

          <div
            className={`widget-model-state widget-model-state--${status}`}
            role="status"
          >
            <span>{t.model[status]}</span>
            {canPrepare && (
              <button type="button" onClick={onPrepare} disabled={isPreparing}>
                {isPreparing ? t.model.preparing : t.model.prepare}
              </button>
            )}
          </div>

          <div className="conversation" ref={messageListRef} aria-live="polite">
            <div className="message-row message-row--assistant">
              <div className="message-bubble">{t.chat.welcome}</div>
            </div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-row message-row--${message.role}`}
              >
                <div
                  className={`message-bubble${
                    message.state === 'error' ? ' is-error' : ''
                  }`}
                >
                  {message.content ||
                    (message.state === 'streaming' ? (
                      <span className="typing-dots" aria-label={t.chat.typing}>
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : null)}
                </div>
              </div>
            ))}
          </div>

          <form className="message-composer" onSubmit={submitMessage}>
            <label htmlFor="support-message">{t.chat.messageLabel}</label>
            <div>
              <textarea
                id="support-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing &&
                    event.keyCode !== 229
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={
                  modelAvailable
                    ? t.chat.inputPlaceholder
                    : t.chat.inputDisabled
                }
                disabled={!isReady || isProcessing}
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={t.chat.send}
              >
                <SendIcon />
              </button>
            </div>
          </form>
          <footer className="support-footer">
            {t.chat.poweredBy} <strong>@aituber-onair/core</strong>
          </footer>
        </section>
      )}

      <button
        type="button"
        className={`support-launcher${isOpen ? ' is-open' : ''}`}
        onClick={toggleWidget}
        aria-expanded={isOpen}
        aria-label={isOpen ? t.chat.closeWidget : t.chat.openWidget}
      >
        {isOpen ? (
          <span className="launcher-close" aria-hidden="true">
            ×
          </span>
        ) : (
          <>
            <span className="launcher-icon">
              <SparkIcon />
            </span>
            <span>
              <small>{t.chat.launcherKicker}</small>
              {t.chat.launcherTitle}
            </span>
          </>
        )}
      </button>
    </aside>
  );
}
