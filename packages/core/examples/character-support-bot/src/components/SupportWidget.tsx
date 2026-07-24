import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getSupportStatus } from '../api';
import { useAudioLipsync } from '../hooks/useAudioLipsync';
import { useCharacterSupportCore } from '../hooks/useCharacterSupportCore';
import AvatarCanvas from './AvatarCanvas';

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

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [draft, setDraft] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const { isSpeaking, mouthLevel, smoothedValue, play, unlock } =
    useAudioLipsync();
  const { messages, isReady, isProcessing, reaction, sendMessage } =
    useCharacterSupportCore({
      enabled: hasOpened,
      onAudioPlay: play,
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
    await unlock();
    await sendMessage(content);
  };

  const canSend =
    configured === true && isReady && !isProcessing && draft.trim().length > 0;

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
                onChange={(event) => setDraft(event.target.value)}
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
                maxLength={2000}
                placeholder="Ask about setup, chat, voice, or events…"
                disabled={configured !== true || !isReady || isProcessing}
              />
              <button type="submit" disabled={!canSend} aria-label="Send">
                <SendIcon />
              </button>
            </div>
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
