import MessageInput from './MessageInput';
import MessageList, { type SupportMessage } from './MessageList';
import SettingsPanel, {
  hasRequiredSettings,
  type SupportSettings,
} from './SettingsPanel';
import { type Language, translations } from '../i18n';

interface ChatPanelProps {
  messages: SupportMessage[];
  settings: SupportSettings;
  language: Language;
  isLoading: boolean;
  isSettingsOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onSaveSettings: (settings: SupportSettings) => void;
  onSend: (message: string) => void;
}

export default function ChatPanel({
  messages,
  settings,
  language,
  isLoading,
  isSettingsOpen,
  onClose,
  onOpenSettings,
  onCloseSettings,
  onSaveSettings,
  onSend,
}: ChatPanelProps) {
  const isProviderReady = hasRequiredSettings(settings);
  const t = translations[language];

  return (
    <section className="chat-panel" aria-label={t.chat.panelLabel}>
      <header className="chat-header">
        <div className="chat-agent">
          <div className="chat-avatar-wrap">
            <img src="/support-avatar.png" alt="Onair-chan" />
            <span className="online-dot" aria-label={t.chat.online} />
          </div>
          <div>
            <strong>Onair-chan</strong>
            <span>{t.chat.subtitle}</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={t.chat.openSettings}
            title={t.chat.settingsTitle}
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

      {isSettingsOpen ? (
        <SettingsPanel
          settings={settings}
          language={language}
          onSave={onSaveSettings}
          onCancel={onCloseSettings}
        />
      ) : (
        <>
          <MessageList messages={messages} language={language} />
          {!isProviderReady && (
            <output className="api-key-notice">
              <div>
                <strong>{t.chat.setupTitle}</strong>
                <span>{t.chat.setupDescription}</span>
              </div>
              <button type="button" onClick={onOpenSettings}>
                {t.chat.openSettingsButton}
              </button>
            </output>
          )}
          <MessageInput
            disabled={!isProviderReady || isLoading}
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
