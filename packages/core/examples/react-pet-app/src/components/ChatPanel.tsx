import type { ChatMessage } from '../types/chat';
import { ChatLog } from './ChatLog';
import { ChatInput } from './ChatInput';
import { PetStage } from './PetStage';

interface ChatPanelProps {
  messages: ChatMessage[];
  partialResponse: string;
  isProcessing: boolean;
  onSend: (text: string) => void;
  mouthLevel: number;
  isSpeaking: boolean;
  backgroundImageUrl?: string | null;
}

export function ChatPanel({
  messages,
  partialResponse,
  isProcessing,
  onSend,
  mouthLevel,
  isSpeaking,
  backgroundImageUrl,
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
      <PetStage
        messages={messages}
        partialResponse={partialResponse}
        isProcessing={isProcessing}
        mouthLevel={mouthLevel}
        isSpeaking={isSpeaking}
      />
      <ChatLog messages={messages} partialResponse={partialResponse} />
      <ChatInput onSend={onSend} disabled={isProcessing} />
    </div>
  );
}
