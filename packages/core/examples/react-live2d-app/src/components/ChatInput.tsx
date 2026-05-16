import { useState, useCallback, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const composingRef = useRef(false);
  const appendRecognizedText = useCallback((recognizedText: string) => {
    setText((prev) => prev + recognizedText);
  }, []);
  const speech = useSpeechRecognition({
    onFinalTranscript: appendRecognizedText,
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (speech.listening) {
      speech.stop();
    }
  }, [text, disabled, onSend, speech]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (speech.listening) {
      speech.stop();
    } else {
      speech.start();
    }
  };

  return (
    <div className="chat-input">
      <div className="input-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            speech.listening
              ? '音声認識中...'
              : 'メッセージを入力 (Enter で送信)'
          }
          disabled={disabled}
          rows={2}
        />
        {speech.interimTranscript && (
          <div className="interim-transcript">{speech.interimTranscript}</div>
        )}
      </div>
      <div className="input-actions">
        <button
          onClick={toggleMic}
          className={`mic-button ${speech.listening ? 'mic-active' : ''}`}
          disabled={!speech.supported}
          title={
            !speech.supported
              ? 'お使いのブラウザは音声認識に対応していません（Chrome推奨）'
              : speech.listening
                ? '音声認識を停止'
                : '音声認識を開始'
          }
        >
          🎤
        </button>
        <button
          onClick={handleSend}
          className="send-button"
          disabled={disabled || !text.trim()}
        >
          送信
        </button>
      </div>
    </div>
  );
}
