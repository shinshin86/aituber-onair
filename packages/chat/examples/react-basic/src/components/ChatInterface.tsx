import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';

interface ChatInterfaceProps {
  onSendMessage: (message: string, imageData?: string) => void;
  disabled: boolean;
  isLoading: boolean;
  onClearChat: () => void;
  supportsVision: boolean;
}

export default function ChatInterface({
  onSendMessage,
  disabled,
  isLoading,
  onClearChat,
  supportsVision,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageDisabled = disabled || !supportsVision;

  useEffect(() => {
    if (!supportsVision && selectedImage) {
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [supportsVision, selectedImage]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message, selectedImage || undefined);
      setMessage('');
      setSelectedImage(null);
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="chat-interface">
      {selectedImage && (
        <div className="selected-image-preview">
          <img src={selectedImage} alt="Selected" />
          <button type="button" onClick={removeImage} className="remove-image">
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-form">
        <div className="input-group">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              disabled
                ? 'Enter API key above to start chatting...'
                : 'Type your message...'
            }
            disabled={disabled}
            className="chat-input"
          />

          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
              id="image-upload"
              disabled={imageDisabled}
            />
            <label
              htmlFor="image-upload"
              className={`image-button ${imageDisabled ? 'disabled' : ''}`}
              title={
                supportsVision ? 'Add image' : 'Image not supported by model'
              }
              aria-disabled={imageDisabled}
            >
              📷
            </label>
          </>

          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="send-button"
          >
            {isLoading ? '⏳' : '📤'} Send
          </button>

          <button
            type="button"
            onClick={onClearChat}
            className="clear-button"
            title="Clear chat"
          >
            🗑️
          </button>
        </div>
      </form>

      <style>{`
        .chat-interface {
          border-top: 1px solid #e0e0e0;
          background: white;
          padding: 1rem;
        }
        
        .selected-image-preview {
          position: relative;
          display: inline-block;
          margin-bottom: 1rem;
        }
        
        .selected-image-preview img {
          max-width: 200px;
          max-height: 150px;
          border-radius: 8px;
          border: 2px solid #667eea;
        }
        
        .remove-image {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .chat-form {
          display: flex;
          gap: 0.5rem;
        }
        
        .input-group {
          display: flex;
          flex: 1;
          gap: 0.5rem;
        }
        
        .chat-input {
          flex: 1;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 24px;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s;
        }
        
        .chat-input:focus {
          border-color: #667eea;
        }
        
        .chat-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }
        
        .image-button {
          padding: 0.75rem;
          background: #f0f0f0;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
        }
        
        .image-button:hover:not(.disabled) {
          background: #667eea;
          transform: scale(1.05);
        }
        
        .image-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .send-button {
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .send-button:hover:not(:disabled) {
          background: #5a67d8;
          transform: translateY(-1px);
        }
        
        .send-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .clear-button {
          padding: 0.75rem;
          background: #ff6b6b;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .clear-button:hover {
          background: #ff5252;
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}
