import MessageInput from './MessageInput';
import MessageList, { type SupportMessage } from './MessageList';
import WidgetMenu from './WidgetMenu';
import { type Language, translations } from '../i18n';

interface ChatPanelProps {
  messages: SupportMessage[];
  language: Language;
  isConfigured: boolean | null;
  hasStatusError: boolean;
  isLoading: boolean;
  isMenuOpen: boolean;
  onClose: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onSend: (message: string) => void;
}

export default function ChatPanel({
  messages,
  language,
  isConfigured,
  hasStatusError,
  isLoading,
  isMenuOpen,
  onClose,
  onOpenMenu,
  onCloseMenu,
  onSend,
}: ChatPanelProps) {
  const t = translations[language];

  return (
    <section className="chat-panel" aria-label={t.chat.panelLabel}>
      <header className="chat-header">
        <div className="chat-agent">
          <div className="chat-avatar-wrap">
            <img src="/support-avatar.png" alt={t.chat.avatarAlt} />
            <span className="online-dot" aria-label={t.chat.online} />
          </div>
          <div>
            <strong>{t.chat.displayName}</strong>
            <span>{t.chat.subtitle}</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={t.chat.openMenu}
            title={t.chat.menuTitle}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.chat.closeChat}
            title={t.chat.close}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </header>

      {isMenuOpen ? (
        <WidgetMenu language={language} onClose={onCloseMenu} />
      ) : (
        <>
          <MessageList messages={messages} language={language} />
          {isConfigured !== true && (
            <output
              className={`api-key-notice${
                hasStatusError ? ' api-key-notice--error' : ''
              }`}
            >
              <div>
                <strong>
                  {isConfigured === null
                    ? t.chat.checkingStatus
                    : hasStatusError
                      ? t.chat.statusUnavailableTitle
                      : t.chat.notConfiguredTitle}
                </strong>
                <span>
                  {hasStatusError
                    ? t.chat.statusUnavailableDescription
                    : t.chat.notConfiguredDescription}
                </span>
              </div>
              {isConfigured === false && !hasStatusError && (
                <a href="/admin" target="_blank" rel="noreferrer">
                  {t.chat.openAdminDashboard}
                </a>
              )}
            </output>
          )}
          <MessageInput
            disabled={isConfigured !== true || isLoading}
            isLoading={isLoading}
            language={language}
            onSend={onSend}
          />
          <div className="chat-powered-by">
            {t.chat.poweredBy} <strong>@aituber-onair/chat</strong>
          </div>
        </>
      )}
    </section>
  );
}
