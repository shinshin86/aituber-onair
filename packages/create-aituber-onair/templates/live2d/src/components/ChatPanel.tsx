import type { ChatMessage } from '../types/chat';
import { ChatInput } from './ChatInput';
import { ChatLog } from './ChatLog';
import { Live2DStage } from './Live2DStage';
import type { Live2DModelSource } from '../lib/live2dModel';
import type { Live2DAudioBinding } from '../hooks/useAudioLipsync';

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
}: ChatPanelProps) {
  const panelStyle = backgroundImageUrl
    ? {
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <div className="chat-panel" style={panelStyle}>
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
      />
      <ChatLog messages={messages} partialResponse={partialResponse} />
      <ChatInput onSend={onSend} disabled={isProcessing} />
    </div>
  );
}
