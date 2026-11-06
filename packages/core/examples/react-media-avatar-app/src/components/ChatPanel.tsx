import { useRef } from 'react';
import type { AvatarEmotion, AvatarMediaMap } from '../lib/avatarMedia';
import type { EmotionEffectAnchor } from '../lib/emotionEffectAnchor';
import type { PngTuberEmotionReaction } from '../lib/pngtuberEmotionEffects';
import type { ChatMessage } from '../types/chat';
import type { VisualSettings } from '../types/settings';
import { AvatarBackground } from './AvatarPanel';
import { ChatInput, type ChatVoiceInputProps } from './ChatInput';
import { ChatLog } from './ChatLog';

interface ChatPanelProps {
  voiceInput: ChatVoiceInputProps;
  messages: ChatMessage[];
  partialResponse: string;
  isProcessing: boolean;
  onSend: (text: string) => void;
  backgroundImageUrl?: string | null;
  avatarUploads: AvatarMediaMap;
  avatarEmotion: AvatarEmotion;
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
  backgroundImageUrl,
  avatarUploads,
  avatarEmotion,
  avatarReaction,
  visual,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
  onToggleSettings,
  voiceInput,
}: ChatPanelProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
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
      ref={surfaceRef}
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
        surfaceRef={surfaceRef}
        uploads={avatarUploads}
        emotion={avatarEmotion}
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
      {shouldShowInput && (
        <ChatInput onSend={onSend} disabled={isProcessing} voice={voiceInput} />
      )}
    </div>
  );
}
