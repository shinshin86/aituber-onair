import type { ChatMessage } from '../types/chat';
import type { VisualSettings } from '../types/settings';
import type { ResolvedInochiModelDefinition } from '../types/inochi2d';
import type { Inochi2DReaction } from '../lib/inochi2dReactions';
import { ChatInput } from './ChatInput';
import { ChatLog } from './ChatLog';
import { Inochi2DStage } from './Inochi2DStage';

interface ChatPanelProps {
  messages: ChatMessage[];
  partialResponse: string;
  isProcessing: boolean;
  onSend: (text: string) => void;
  onToggleSettings: () => void;
  backgroundImageUrl?: string | null;
  selectedModelId?: string;
  customModel?: ResolvedInochiModelDefinition | null;
  modelPickerError: string;
  onModelResolved: (modelId: string) => void;
  avatarReaction?: Inochi2DReaction | null;
  visual: VisualSettings;
}

export function ChatPanel({
  messages,
  partialResponse,
  isProcessing,
  onSend,
  onToggleSettings,
  backgroundImageUrl,
  selectedModelId,
  customModel,
  modelPickerError,
  onModelResolved,
  avatarReaction,
  visual,
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
      <Inochi2DStage
        selectedModelId={selectedModelId}
        customModel={customModel}
        modelPickerError={modelPickerError}
        onModelResolved={onModelResolved}
        reaction={avatarReaction}
        reactionControlMode={visual.inochi2dReactionControlMode}
        emotionEffectMap={visual.inochi2dEmotionEffectMap}
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
