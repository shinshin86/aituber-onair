import type { ChatMessage } from '../types/chat';
import type { AvatarViewTransform, VisualSettings } from '../types/settings';
import type { PsdAvatarController } from '../hooks/usePsdAvatar';
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
  smoothedValue: number;
  backgroundImageUrl?: string | null;
  psdAvatar: PsdAvatarController;
  visual: VisualSettings;
  avatarViewTransform: AvatarViewTransform;
  onAvatarViewTransformChange: (transform: AvatarViewTransform) => void;
  onToggleSettings: () => void;
}

export function ChatPanel({
  messages,
  partialResponse,
  isProcessing,
  onSend,
  mouthLevel,
  isSpeaking,
  smoothedValue,
  backgroundImageUrl,
  psdAvatar,
  visual,
  avatarViewTransform,
  onAvatarViewTransformChange,
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
      <button
        type="button"
        className="settings-button chat-settings-button"
        onClick={onToggleSettings}
        aria-label="Settings"
      >
        ⚙
      </button>
      <AvatarBackground
        mouthLevel={mouthLevel}
        isSpeaking={isSpeaking}
        smoothedValue={smoothedValue}
        psdAvatar={psdAvatar}
        avatarViewTransform={avatarViewTransform}
        motionEnabled={visual.motionEnabled}
        motionIntensity={visual.motionIntensity}
        onAvatarViewTransformChange={onAvatarViewTransformChange}
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
