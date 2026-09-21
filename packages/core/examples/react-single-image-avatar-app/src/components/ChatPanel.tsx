import type { EmotionEffectAnchor } from '../lib/emotionEffectAnchor';
import type { PngTuberEmotionReaction } from '../lib/pngtuberEmotionEffects';
import type { ChatMessage } from '../types/chat';
import type { VisualSettings } from '../types/settings';
import { AvatarBackground } from './AvatarPanel';
import { ChatInput } from './ChatInput';
import { ChatLog } from './ChatLog';

interface ChatPanelProps {
  messages: ChatMessage[];
  partialResponse: string;
  isProcessing: boolean;
  onSend: (text: string) => void;
  voiceLevel: number;
  isSpeaking: boolean;
  backgroundImageUrl?: string | null;
  avatarImageUrl?: string | null;
  motionPreviewToken?: number;
  avatarReaction?: PngTuberEmotionReaction | null;
  visual: VisualSettings;
  effectAnchor: EmotionEffectAnchor;
  onEffectAnchorChange: (anchor: EmotionEffectAnchor) => void;
  onEffectAnchorReset: () => void;
  onToggleSettings: () => void;
}

export function ChatPanel({
  messages,
  partialResponse,
  isProcessing,
  onSend,
  voiceLevel,
  isSpeaking,
  backgroundImageUrl,
  avatarImageUrl,
  motionPreviewToken,
  avatarReaction,
  visual,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
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
        voiceLevel={voiceLevel}
        isSpeaking={isSpeaking}
        avatarImageUrl={avatarImageUrl}
        motionPreviewToken={motionPreviewToken}
        motionStyle={visual.motionStyle}
        avatarReaction={avatarReaction}
        reactionControlMode={visual.pngtuberReactionControlMode}
        emotionEffectMap={visual.pngtuberEmotionEffectMap}
        effectAnchor={effectAnchor}
        onEffectAnchorChange={onEffectAnchorChange}
        onEffectAnchorReset={onEffectAnchorReset}
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
