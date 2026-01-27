import { RefObject } from 'react';
import type { Message, MessageWithVision } from '@aituber-onair/chat';

interface ChatMessage extends Omit<Message, 'timestamp' | 'content'> {
  id: string;
  timestamp: Date;
  content: Message['content'] | MessageWithVision['content'];
  isStreaming?: boolean;
}

interface MessageListProps {
  messages: ChatMessage[];
  messagesEndRef: RefObject<HTMLDivElement>;
}

export default function MessageList({
  messages,
  messagesEndRef,
}: MessageListProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderContent = (content: string | any[]) => {
    if (typeof content === 'string') {
      return <div className="message-text">{content}</div>;
    }

    // Handle array content (text + images)
    return (
      <div className="message-content-complex">
        {content.map((item, index) => {
          if (item.type === 'text') {
            return (
              <div
                key={`text-${index}-${item.text.slice(0, 10)}`}
                className="message-text"
              >
                {item.text}
              </div>
            );
          }
          if (item.type === 'image_url') {
            return (
              <img
                key={`image-${index}-${item.image_url.url.slice(-10)}`}
                src={item.image_url.url}
                alt="User uploaded"
                className="message-image"
              />
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">No messages yet</div>
          <p>Start a conversation by typing a message below.</p>
        </div>
      )}

      {messages.map((message) => (
        <div key={message.id} className={`message ${message.role}`}>
          <div className="message-header">
            <span className="message-role">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <span className="message-time">
              {formatTime(message.timestamp)}
            </span>
          </div>
          <div className="message-body">
            {renderContent(message.content)}
            {message.isStreaming && (
              <span className="streaming-indicator">●●●</span>
            )}
          </div>
        </div>
      ))}

      <div ref={messagesEndRef} />

      <style>{`
        .message-list {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--muted);
          text-align: center;
        }

        .empty-icon {
          font-size: 1.1rem;
          margin-bottom: 0.35rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text);
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9rem;
        }

        .message {
          display: flex;
          flex-direction: column;
          animation: messageSlide 0.3s ease-out;
        }

        @keyframes messageSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message.user {
          align-items: flex-end;
        }

        .message.assistant {
          align-items: flex-start;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
          font-size: 0.85rem;
        }

        .message-role {
          font-weight: 600;
          color: var(--text);
        }

        .message-time {
          color: var(--muted);
          font-size: 0.8rem;
        }

        .message-body {
          max-width: 70%;
          padding: 0.8rem 1rem;
          border-radius: 18px;
          position: relative;
          border: 1px solid transparent;
        }

        .user .message-body {
          background: #0f0f0f;
          color: white;
          border-bottom-right-radius: 6px;
        }

        .assistant .message-body {
          background: #f6f6f6;
          color: var(--text);
          border-bottom-left-radius: 6px;
          border-color: #ececec;
        }

        .message-text {
          white-space: pre-wrap;
          word-wrap: break-word;
          line-height: 1.5;
        }

        .message-content-complex {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .message-image {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          margin-top: 0.5rem;
          border: 1px solid var(--border);
        }

        .streaming-indicator {
          display: inline-block;
          font-size: 0.8rem;
          animation: pulse 1.5s infinite;
          margin-left: 0.5rem;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        /* Scrollbar styling */
        .message-list::-webkit-scrollbar {
          width: 8px;
        }

        .message-list::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .message-list::-webkit-scrollbar-thumb {
          background: #bdbdbd;
          border-radius: 4px;
        }

        .message-list::-webkit-scrollbar-thumb:hover {
          background: #9a9a9a;
        }

        @media (max-width: 768px) {
          .message-body {
            max-width: 85%;
          }
        }
      `}</style>
    </div>
  );
}
