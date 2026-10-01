import { useCallback, useRef, useState } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import {
  type CloudVoiceInputService,
  type VoiceInputMode,
  type VoiceInputService,
  voiceInputNoticeText,
} from '../lib/voiceInput';
import {
  VoiceInputControl,
  VoiceLevelBars,
  VoiceSpinner,
} from './VoiceInputControl';

export interface ChatVoiceInputProps {
  mode: VoiceInputMode;
  service: VoiceInputService;
  onModeChange: (mode: VoiceInputMode) => void;
  onServiceChange: (service: VoiceInputService) => void;
  apiKeys: Record<CloudVoiceInputService, string>;
  onApiKeyChange: (service: CloudVoiceInputService, key: string) => void;
  /** True while the avatar is speaking the reply. */
  isSpeaking: boolean;
}

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  voice: ChatVoiceInputProps;
}

export function ChatInput({ onSend, disabled, voice }: ChatInputProps) {
  const [text, setText] = useState('');
  const composingRef = useRef(false);
  const { apiKeys } = voice;

  const handleFinalTranscript = useCallback(
    (recognizedText: string) => {
      setText('');
      onSend(recognizedText);
    },
    [onSend],
  );
  const getApiKey = useCallback(
    (service: VoiceInputService) =>
      service === 'browser' ? '' : apiKeys[service],
    [apiKeys],
  );

  const speech = useVoiceInput({
    mode: voice.mode,
    service: voice.service,
    getApiKey,
    busy: disabled || voice.isSpeaking,
    onInterimTranscript: setText,
    onFinalTranscript: handleFinalTranscript,
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    speech.stop();
  }, [text, disabled, onSend, speech]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusText =
    speech.phase === 'connecting'
      ? '接続しています。少し待ってから話してください'
      : speech.phase === 'listening'
        ? '聞き取り中です。どうぞ話してください'
        : speech.continuousActive
          ? '返答が終わったら、また聞き取ります'
          : null;

  return (
    <div className="chat-input">
      {speech.notice && (
        <div className="voice-input-notice" role="alert">
          {voiceInputNoticeText(speech.notice)}
        </div>
      )}
      {statusText && (
        <output
          className="voice-input-status"
          data-phase={speech.phase}
          aria-live="polite"
        >
          <span className="voice-input-status-icon">
            {speech.phase === 'connecting' ? (
              <VoiceSpinner />
            ) : speech.phase === 'listening' ? (
              <VoiceLevelBars />
            ) : (
              <span className="voice-input-status-dot" aria-hidden="true" />
            )}
          </span>
          <span>{statusText}</span>
        </output>
      )}
      <div className="input-row">
        <VoiceInputControl
          phase={speech.phase}
          standby={speech.continuousActive && speech.phase === 'idle'}
          micDisabled={disabled && !speech.continuousActive}
          onMicClick={speech.toggle}
          mode={voice.mode}
          onModeChange={(mode) => {
            if (mode === voice.mode) return;
            speech.reset();
            voice.onModeChange(mode);
          }}
          service={voice.service}
          onServiceChange={(service) => {
            if (service === voice.service) return;
            speech.reset();
            voice.onServiceChange(service);
          }}
          apiKeys={apiKeys}
          onApiKeyChange={voice.onApiKeyChange}
        />
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
            speech.phase === 'listening'
              ? '話した内容がここに表示されます'
              : 'メッセージを入力 (Enter で送信)'
          }
          disabled={disabled}
          rows={2}
        />
        <button
          type="button"
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
