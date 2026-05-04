import type { ChatMessage } from '../types/chat';
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
      <AvatarBackground
        mouthLevel={mouthLevel}
        isSpeaking={isSpeaking}
        avatarImageUrls={avatarImageUrls}
      />
      <ChatLog messages={messages} partialResponse={partialResponse} />
      <ChatInput onSend={onSend} disabled={isProcessing} />
    </div>
  );
}
