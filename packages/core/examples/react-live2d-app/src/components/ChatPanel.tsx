import type { ChatMessage } from '../types/chat';
import type { VisualSettings } from '../types/settings';
import { ChatInput } from './ChatInput';
import { ChatLog } from './ChatLog';
import { Live2DStage } from './Live2DStage';
import type { Live2DModelSource } from '../lib/live2dModel';
import type { Live2DAudioBinding } from '../hooks/useAudioLipsync';
import type { Live2DReaction } from '../lib/live2dReactions';
import type { EmotionEffectAnchor } from '../lib/emotionEffectAnchor';

interface ChatPanelProps {
  messages: ChatMessage[];
  partialResponse: string;
  isProcessing: boolean;
  onSend: (text: string) => void;
  onToggleSettings: () => void;
  backgroundImageUrl?: string | null;
  modelSource: Live2DModelSource | null;
  modelPickerError: string;
  audioBinding: Live2DAudioBinding;
  avatarReaction?: Live2DReaction | null;
  visual: VisualSettings;
  effectAnchor: EmotionEffectAnchor;
  onEffectAnchorChange: (anchor: EmotionEffectAnchor) => void;
  onEffectAnchorReset: () => void;
}

export function ChatPanel({
  messages,
  partialResponse,
  isProcessing,
  onSend,
  onToggleSettings,
  backgroundImageUrl,
  modelSource,
  modelPickerError,
  audioBinding,
  avatarReaction,
  visual,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
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
        aria-label="設定"
      >
        ⚙
      </button>
      <Live2DStage
        modelSource={modelSource}
        modelPickerError={modelPickerError}
        audioBinding={audioBinding}
        reaction={avatarReaction}
        reactionControlMode={visual.live2dReactionControlMode}
        emotionEffectMap={visual.live2dEmotionEffectMap}
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
