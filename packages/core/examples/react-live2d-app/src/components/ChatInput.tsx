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
              ? 'Reconociendo voz...'
              : 'Escribe mensaje (Enter para enviar)'
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
              ? 'Tu navegador no soporta reconocimiento de voz (Chrome recomendado)'
              : speech.listening
                ? 'Detener reconocimiento'
                : 'Iniciar reconocimiento'
          }
        >
          🎤
        </button>
        <button
          onClick={handleSend}
          className="send-button"
          disabled={disabled || !text.trim()}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
