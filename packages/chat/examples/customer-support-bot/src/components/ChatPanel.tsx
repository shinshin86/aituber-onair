import MessageInput from './MessageInput';
import MessageList, { type SupportMessage } from './MessageList';
import SettingsPanel, {
  hasRequiredSettings,
  type SupportSettings,
} from './SettingsPanel';

interface ChatPanelProps {
  messages: SupportMessage[];
  settings: SupportSettings;
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
  isLoading,
  isSettingsOpen,
  onClose,
  onOpenSettings,
  onCloseSettings,
  onSaveSettings,
  onSend,
}: ChatPanelProps) {
  const isProviderReady = hasRequiredSettings(settings);

  return (
    <section className="chat-panel" aria-label="AITuber OnAir support chat">
      <header className="chat-header">
        <div className="chat-agent">
          <div className="chat-avatar-wrap">
            <img src="/support-avatar.png" alt="Onair-chan" />
            <span className="online-dot" aria-label="Online" />
          </div>
          <div>
            <strong>Onair-chan</strong>
            <span>AITuber OnAir support</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close support chat"
            title="Close"
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
          onSave={onSaveSettings}
          onCancel={onCloseSettings}
        />
      ) : (
        <>
          <MessageList messages={messages} />
          {!isProviderReady && (
            <output className="api-key-notice">
              <div>
                <strong>Complete provider setup to start chatting</strong>
                <span>Demo settings stay in this browser.</span>
              </div>
              <button type="button" onClick={onOpenSettings}>
                Open settings
              </button>
            </output>
          )}
          <MessageInput
            disabled={!isProviderReady || isLoading}
            isLoading={isLoading}
            onSend={onSend}
          />
          <div className="chat-powered-by">
            Powered by <strong>@aituber-onair/chat</strong>
          </div>
        </>
      )}
    </section>
  );
}
