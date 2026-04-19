import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/chat';

interface ChatLogProps {
  messages: ChatMessage[];
  partialResponse: string;
}

export function ChatLog({ messages, partialResponse }: ChatLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partialResponse]);

  return (
    <div className="chat-log">
      {messages.length === 0 && !partialResponse && (
        <div className="chat-empty">メッセージを送信してください</div>
      )}
      {messages.map((msg) => (
        <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
          <div className="chat-role">
            {msg.role === 'user' ? 'You' : 'AI'}
          </div>
          <div className="chat-content">{msg.content}</div>
        </div>
      ))}
      {partialResponse && (
        <div className="chat-message chat-message-assistant">
          <div className="chat-role">AI</div>
          <div className="chat-content chat-content-partial">
            {partialResponse}
            <span className="typing-cursor">▍</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
