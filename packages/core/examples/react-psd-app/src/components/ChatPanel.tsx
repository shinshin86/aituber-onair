import type { ChatMessage } from '../types/chat';
import type { AvatarViewTransform, VisualSettings } from '../types/settings';
import type { PsdAvatarController } from '../hooks/usePsdAvatar';
import type {
  PsdEmotionEffectAnchor,
  PsdEmotionReaction,
} from '../lib/psdEmotionEffects';
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
  avatarReaction?: PsdEmotionReaction | null;
  visual: VisualSettings;
  avatarViewTransform: AvatarViewTransform;
  onAvatarViewTransformChange: (transform: AvatarViewTransform) => void;
  effectAnchor: PsdEmotionEffectAnchor;
  onEffectAnchorChange: (anchor: PsdEmotionEffectAnchor) => void;
  onEffectAnchorReset: () => void;
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
  avatarReaction,
  visual,
  avatarViewTransform,
  onAvatarViewTransformChange,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
  onToggleSettings,
}: ChatPanelProps) {
  const isBroadcast = visual.layoutMode === 'broadcast';
  const shouldShowInput = !isBroadcast || visual.showInputInBroadcast;
  const hasPsdAvatar = Boolean(
    psdAvatar.source || psdAvatar.model || psdAvatar.rig,
  );
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
        key={visual.psdEmotionEffectControlMode}
        mouthLevel={mouthLevel}
        isSpeaking={isSpeaking}
        smoothedValue={smoothedValue}
        psdAvatar={psdAvatar}
        avatarReaction={avatarReaction}
        avatarViewTransform={avatarViewTransform}
        motionEnabled={visual.motionEnabled}
        motionIntensity={visual.motionIntensity}
        onAvatarViewTransformChange={onAvatarViewTransformChange}
        effectAnchor={effectAnchor}
        onEffectAnchorChange={onEffectAnchorChange}
        onEffectAnchorReset={onEffectAnchorReset}
        emotionEffectControlMode={visual.psdEmotionEffectControlMode}
        emotionEffectMap={visual.psdEmotionEffectMap}
      />
      {isBroadcast ? (
        broadcastCaption && (
          <div className="broadcast-caption">{broadcastCaption}</div>
        )
      ) : (
        <ChatLog
          messages={messages}
          partialResponse={partialResponse}
          hideEmptyState={hasPsdAvatar}
        />
      )}
      {shouldShowInput && <ChatInput onSend={onSend} disabled={isProcessing} />}
    </div>
  );
}
