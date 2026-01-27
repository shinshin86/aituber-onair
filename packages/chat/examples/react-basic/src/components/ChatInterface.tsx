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
            Remove
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
              Image
            </label>
          </>

          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="send-button"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>

          <button
            type="button"
            onClick={onClearChat}
            className="clear-button"
            title="Clear chat"
          >
            Clear
          </button>
        </div>
      </form>

      <style>{`
        .chat-interface {
          border-top: 1px solid var(--border);
          background: var(--panel);
          padding: 1rem 1.25rem 1.25rem;
        }
        
        .selected-image-preview {
          position: relative;
          display: inline-block;
          margin-bottom: 1rem;
        }
        
        .selected-image-preview img {
          max-width: 200px;
          max-height: 150px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        
        .remove-image {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #0f0f0f;
          color: white;
          border: none;
          border-radius: 999px;
          padding: 0.2rem 0.55rem;
          font-size: 0.7rem;
          cursor: pointer;
        }
        
        .chat-form {
          display: flex;
          gap: 0.5rem;
        }
        
        .input-group {
          display: flex;
          flex: 1;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .chat-input {
          flex: 1 1 220px;
          padding: 0.75rem;
          border: 1px solid var(--input-border);
          border-radius: 999px;
          font-size: 1rem;
          outline: none;
          background: var(--input-bg);
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        
        .chat-input:focus {
          border-color: var(--input-focus);
          background: white;
        }
        
        .chat-input:disabled {
          background: #f1f1f1;
          cursor: not-allowed;
        }
        
        .image-button {
          padding: 0.75rem 1rem;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 999px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .image-button:hover:not(.disabled) {
          background: #f1f1f1;
          transform: translateY(-1px);
        }
        
        .image-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .send-button {
          padding: 0.75rem 1.5rem;
          background: #0f0f0f;
          color: white;
          border: 1px solid #0f0f0f;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .send-button:hover:not(:disabled) {
          background: #1c1c1c;
          transform: translateY(-1px);
        }
        
        .send-button:disabled {
          background: #cfcfcf;
          border-color: #cfcfcf;
          cursor: not-allowed;
        }
        
        .clear-button {
          padding: 0.75rem 1rem;
          background: transparent;
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 999px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        
        .clear-button:hover {
          background: #f1f1f1;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
