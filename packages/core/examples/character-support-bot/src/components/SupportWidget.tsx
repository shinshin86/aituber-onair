import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { getSupportStatus } from '../api';
import { useAudioLipsync } from '../hooks/useAudioLipsync';
import { useCharacterSupportCore } from '../hooks/useCharacterSupportCore';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { appendTranscript } from '../lib/speechRecognition';
import AvatarCanvas from './AvatarCanvas';

const MAX_MESSAGE_LENGTH = 2000;

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m4 4 17 8-17 8 3-8-3-8Z" />
    <path d="M7 12h14" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2c.7 5.8 4.2 9.3 10 10-5.8.7-9.3 4.2-10 10-.7-5.8-4.2-9.3-10-10 5.8-.7 9.3-4.2 10-10Z" />
  </svg>
);

const MicrophoneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6" />
  </svg>
);

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [draft, setDraft] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const committedDraftRef = useRef('');
  const { isSpeaking, mouthLevel, smoothedValue, play, unlock } =
    useAudioLipsync();
  const {
    messages,
    isReady,
    isProcessing,
    isSpeechActive,
    reaction,
    sendMessage,
  } = useCharacterSupportCore({
    enabled: hasOpened,
    onAudioPlay: play,
  });
  const handleFinalTranscript = useCallback((transcript: string) => {
    const nextDraft = appendTranscript(
      committedDraftRef.current,
      transcript,
      MAX_MESSAGE_LENGTH,
    );
    committedDraftRef.current = nextDraft;
    setDraft(nextDraft);
  }, []);
  const {
    supported: speechRecognitionSupported,
    active: voiceInputActive,
    listening: voiceInputListening,
    paused: voiceInputPaused,
    interimTranscript,
    errorMessage: voiceInputError,
    statusMessage: voiceInputStatus,
    start: startVoiceInput,
    stop: stopVoiceInput,
    resetInterim,
  } = useSpeechRecognition({
    language: typeof navigator === 'undefined' ? undefined : navigator.language,
    suspended: isSpeechActive,
    onFinalTranscript: handleFinalTranscript,
  });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void getSupportStatus()
      .then((status) => {
        if (!cancelled) setConfigured(status.configured);
      })
      .catch(() => {
        if (!cancelled) {
          setConfigured(false);
          setStatusError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    const element = messageListRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!voiceInputActive) return;
    setDraft(
      appendTranscript(
        committedDraftRef.current,
        interimTranscript,
        MAX_MESSAGE_LENGTH,
      ),
    );
  }, [interimTranscript, voiceInputActive]);

  useEffect(() => {
    if (!voiceInputError) return;
    setDraft(committedDraftRef.current);
  }, [voiceInputError]);

  useEffect(() => {
    if (!isOpen && voiceInputActive) {
      stopVoiceInput();
    }
  }, [isOpen, stopVoiceInput, voiceInputActive]);

  const toggleWidget = () => {
    void unlock().catch((error) => {
      console.warn('Audio context could not be unlocked yet:', error);
    });
    setHasOpened(true);
    if (!isOpen) {
      setConfigured(null);
      setStatusError(false);
    }
    setIsOpen((current) => !current);
  };

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !isReady || configured !== true || isProcessing) {
      return;
    }
    setDraft('');
    committedDraftRef.current = '';
    resetInterim();
    await unlock();
    await sendMessage(content);
  };

  const toggleVoiceInput = () => {
    if (voiceInputActive) {
      stopVoiceInput();
      committedDraftRef.current = draft;
      return;
    }
    committedDraftRef.current = draft;
    startVoiceInput();
  };

  const voiceInputState = voiceInputError
    ? 'error'
    : voiceInputPaused
      ? 'paused'
      : voiceInputListening
        ? 'listening'
        : voiceInputActive
          ? 'starting'
          : 'idle';
  const voiceInputLabel = voiceInputPaused
    ? 'Voice input paused while Miko speaks'
    : voiceInputActive
      ? 'Stop voice input'
      : 'Start voice input';
  const canSend =
    configured === true &&
    isReady &&
    !isProcessing &&
    !interimTranscript &&
    draft.trim().length > 0;

  return (
    <aside className="support-widget" aria-label="Character support">
      {isOpen && (
        <section className="support-panel" aria-label="Chat with Miko">
          <header className="support-header">
            <div>
              <span className="support-kicker">CHARACTER SUPPORT</span>
              <strong>Miko</strong>
              <span className="support-presence">
                <i /> {isSpeaking ? 'Speaking now' : 'Online'}
              </span>
            </div>
            <div className="support-header-actions">
              <a href="/admin" target="_blank" rel="noreferrer">
                Settings
              </a>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close support"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </header>

          <AvatarCanvas
            voiceLevel={Math.max(smoothedValue, (mouthLevel / 4) * 0.12)}
            isSpeaking={isSpeaking}
            reaction={reaction}
          />

          <div className="conversation" ref={messageListRef} aria-live="polite">
            <div className="message-row message-row--assistant">
              <div className="message-bubble">
                Hi! I’m Miko. Ask me anything about AITuber OnAir Core.
              </div>
            </div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-row message-row--${message.role}`}
              >
                <div
                  className={`message-bubble${
                    message.state === 'error' ? ' is-error' : ''
                  }`}
                >
                  {message.content ||
                    (message.state === 'streaming' ? (
                      <span className="typing-dots" aria-label="Miko is typing">
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : null)}
                </div>
              </div>
            ))}
          </div>

          {configured !== true && (
            <div
              className={`configuration-notice${
                statusError ? ' is-error' : ''
              }`}
            >
              <div>
                <strong>
                  {configured === null
                    ? 'Checking server configuration…'
                    : statusError
                      ? 'Support server unavailable'
                      : 'Configuration required'}
                </strong>
                {configured === false && (
                  <span>
                    {statusError
                      ? 'Start the example server and try again.'
                      : 'Add the server-side LLM and TTS settings to begin.'}
                  </span>
                )}
              </div>
              {configured === false && !statusError && (
                <a href="/admin" target="_blank" rel="noreferrer">
                  Open admin
                </a>
              )}
            </div>
          )}

          <form className="message-composer" onSubmit={submitMessage}>
            <label htmlFor="support-message">Message Miko</label>
            <div>
              <textarea
                id="support-message"
                value={draft}
                onChange={(event) => {
                  if (voiceInputActive) stopVoiceInput();
                  committedDraftRef.current = event.target.value;
                  setDraft(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Ask about setup, chat, voice, or events…"
                disabled={configured !== true || !isReady || isProcessing}
                aria-describedby={
                  voiceInputStatus ? 'voice-input-status' : undefined
                }
              />
              <span className="composer-actions">
                {speechRecognitionSupported && (
                  <button
                    type="button"
                    className={`microphone-button is-${voiceInputState}`}
                    onClick={toggleVoiceInput}
                    disabled={configured !== true || !isReady}
                    aria-label={voiceInputLabel}
                    aria-pressed={voiceInputActive}
                    data-testid="voice-input-toggle"
                    data-voice-state={voiceInputState}
                    title={voiceInputStatus ?? voiceInputLabel}
                  >
                    <MicrophoneIcon />
                  </button>
                )}
                <button type="submit" disabled={!canSend} aria-label="Send">
                  <SendIcon />
                </button>
              </span>
            </div>
            {voiceInputStatus && (
              <span
                id="voice-input-status"
                className={`voice-input-status is-${voiceInputState}`}
                role="status"
                data-testid="voice-input-status"
              >
                <i aria-hidden="true" />
                {voiceInputStatus}
              </span>
            )}
          </form>
          <footer className="support-footer">
            Powered by <strong>@aituber-onair/core</strong>
          </footer>
        </section>
      )}

      <button
        type="button"
        className={`support-launcher${isOpen ? ' is-open' : ''}`}
        onClick={toggleWidget}
        aria-expanded={isOpen}
        aria-label={
          isOpen ? 'Close character support' : 'Open character support'
        }
      >
        {isOpen ? (
          <span className="launcher-close" aria-hidden="true">
            ×
          </span>
        ) : (
          <>
            <span className="launcher-icon">
              <SparkIcon />
            </span>
            <span>
              <small>NEED A HAND?</small>
              Ask Miko
            </span>
          </>
        )}
      </button>
    </aside>
  );
}
