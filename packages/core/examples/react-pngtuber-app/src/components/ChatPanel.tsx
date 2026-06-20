import type { ChatMessage } from '../types/chat';
import type { VisualSettings } from '../types/settings';
import type { AvatarImageUrls } from './AvatarPanel';
import { AvatarBackground } from './AvatarPanel';
import { ChatLog } from './ChatLog';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  messages: ChatMessage[];
  partialResponse: string;
  isProcessing: boolean;
  onSend: (text: string) => void;
  mouthLevel: number;
  isSpeaking: boolean;
  backgroundImageUrl?: string | null;
  avatarImageUrls?: AvatarImageUrls;
  visual: VisualSettings;
  onToggleSettings: () => void;
}

export function ChatPanel({
  messages,
  partialResponse,
  isProcessing,
  onSend,
  mouthLevel,
  isSpeaking,
  backgroundImageUrl,
  avatarImageUrls,
  visual,
  onToggleSettings,
}: ChatPanelProps) {
  const isBroadcast = visual.layoutMode === 'broadcast';
  const shouldShowInput = !isBroadcast || visual.showInputInBroadcast;
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');
  const broadcastCaption =
    partialResponse || latestAssistantMessage?.content.trim() || '';
  const panelStyle =
    visual.backgroundMode === 'green'
      ? { backgroundColor: '#00ff00' }
      : backgroundImageUrl
    ? {
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <div
      className={`chat-panel${isBroadcast ? ' chat-panel-broadcast' : ''}${
        isBroadcast && shouldShowInput ? ' chat-panel-broadcast-input' : ''
      }`}
      style={panelStyle}
    >
      {isBroadcast && (
        <button
          type="button"
          className="settings-button chat-settings-button"
          onClick={onToggleSettings}
          aria-label="Settings"
        >
          ⚙
        </button>
      )}
      <AvatarBackground
        mouthLevel={mouthLevel}
        isSpeaking={isSpeaking}
        avatarImageUrls={avatarImageUrls}
      />
      {isBroadcast ? (
        broadcastCaption && (
          <div className="broadcast-caption">{broadcastCaption}</div>
        )
      ) : (
        <ChatLog messages={messages} partialResponse={partialResponse} />
      )}
      {shouldShowInput && <ChatInput onSend={onSend} disabled={isProcessing} />}
    </div>
  );
}
