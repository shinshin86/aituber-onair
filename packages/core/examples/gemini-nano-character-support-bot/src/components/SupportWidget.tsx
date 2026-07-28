import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useAudioLipsync } from '../hooks/useAudioLipsync';
import { useCharacterSupportCore } from '../hooks/useCharacterSupportCore';
import type { GeminiNanoStatus } from '../hooks/useGeminiNanoStatus';
import { usePiperPlusAssets } from '../hooks/usePiperPlusAssets';
import { useSyntheticLipsync } from '../hooks/useSyntheticLipsync';
import { type Language, translations, TSUKUYOMI_CORPUS_URL } from '../i18n';
import {
  isModelNoticeDismissible,
  isVoiceNoticeDismissible,
  type VoiceNoticeKind,
} from '../noticeDismissal';
import AvatarCanvas from './AvatarCanvas';
import LanguageSwitch from './LanguageSwitch';

const MAX_MESSAGE_LENGTH = 1200;

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

interface StatusNoticeProps {
  className: string;
  dismissible: boolean;
  dismissLabel: string;
  children: ReactNode;
}

const StatusNotice = ({
  className,
  dismissible,
  dismissLabel,
  children,
}: StatusNoticeProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div
      className={`${className}${dismissible ? ' is-dismissible' : ''}`}
      role="status"
    >
      {children}
      {dismissible && (
        <button
          type="button"
          className="widget-status-dismiss"
          onClick={() => setIsDismissed(true)}
          aria-label={dismissLabel}
          title={dismissLabel}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
};

interface SupportWidgetProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  status: GeminiNanoStatus;
  onPrepare: () => void;
  isPreparing: boolean;
  onBusyChange: (busy: boolean) => void;
}

export default function SupportWidget({
  language,
  onLanguageChange,
  status,
  onPrepare,
  isPreparing,
  onBusyChange,
}: SupportWidgetProps) {
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [draft, setDraft] = useState('');
  const [piperInitialized, setPiperInitialized] = useState(false);
  const [piperRuntimeError, setPiperRuntimeError] = useState(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const modelAvailable = status === 'available';
  const canPrepare = status === 'downloadable' || status === 'downloading';
  const piperAssets = usePiperPlusAssets(language === 'ja');
  const {
    mouthLevel: rmsMouthLevel,
    isSpeaking: isAudioSpeaking,
    smoothedValue,
    unlock,
    play,
    stop,
  } = useAudioLipsync();
  const handleAudioPlay = useCallback(
    async (audioBuffer: ArrayBuffer) => {
      setPiperInitialized(true);
      setPiperRuntimeError(false);
      try {
        await play(audioBuffer);
      } catch (error) {
        setPiperInitialized(false);
        setPiperRuntimeError(true);
        throw error;
      }
    },
    [play],
  );
  const handleSpeechError = useCallback(() => {
    setPiperRuntimeError(true);
  }, []);
  const voiceAvailable =
    language === 'en' || piperAssets.status === 'available';
  const {
    messages,
    isReady,
    isProcessing,
    isSpeechActive,
    reaction,
    sendMessage,
    resetConversation,
  } = useCharacterSupportCore({
    enabled: hasOpened && modelAvailable && voiceAvailable,
    language,
    errorMessage: t.chat.coreError,
    onAudioPlay: handleAudioPlay,
    onAudioStop: stop,
    onSpeechError: handleSpeechError,
  });
  const isBusy = isProcessing || isSpeechActive;
  const syntheticMouthLevel = useSyntheticLipsync(
    language === 'en' && isSpeechActive,
  );
  const mouthLevel =
    language === 'ja'
      ? Math.max(smoothedValue, (rmsMouthLevel / 4) * 0.12)
      : syntheticMouthLevel;
  const avatarIsSpeaking = language === 'ja' ? isAudioSpeaking : isSpeechActive;
  const piperIsInitializing =
    language === 'ja' && isSpeechActive && !piperInitialized;
  const piperAssetState =
    piperAssets.status === 'idle' ? 'checking' : piperAssets.status;
  const piperProgress =
    piperAssets.total === 0
      ? 0
      : Math.round((piperAssets.checked / piperAssets.total) * 100);
  const voiceState =
    language === 'en'
      ? 'available'
      : piperRuntimeError
        ? 'error'
        : piperIsInitializing
          ? 'initializing'
          : piperAssetState;
  const voiceNoticeKind: VoiceNoticeKind =
    language === 'en'
      ? 'webSpeechReady'
      : piperRuntimeError
        ? 'runtimeError'
        : piperIsInitializing
          ? 'initializing'
          : piperAssetState === 'checking'
            ? 'checkingAssets'
            : piperAssetState === 'available'
              ? piperInitialized
                ? 'ready'
                : 'assetsReady'
              : piperAssetState === 'missing'
                ? 'missing'
                : 'error';
  const voiceStatusText = t.voice[voiceNoticeKind];

  useEffect(() => {
    const element = messageListRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    onBusyChange(isBusy);
    return () => onBusyChange(false);
  }, [isBusy, onBusyChange]);

  const toggleWidget = () => {
    if (language === 'ja') {
      void unlock().catch((error) => {
        console.warn('Audio context could not be unlocked yet:', error);
      });
    }
    setHasOpened(true);
    setIsOpen((current) => !current);
  };

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !isReady || isBusy) return;

    if (language === 'ja') {
      try {
        await unlock();
      } catch (error) {
        console.error('Audio context could not be unlocked:', error);
        setPiperRuntimeError(true);
        return;
      }
    }
    setDraft('');
    await sendMessage(content);
  };

  const changeLanguage = (nextLanguage: Language) => {
    stop();
    setPiperInitialized(false);
    setPiperRuntimeError(false);
    onLanguageChange(nextLanguage);
  };

  const reset = () => {
    stop();
    setPiperRuntimeError(false);
    resetConversation();
  };

  const canSend =
    isReady &&
    !isBusy &&
    draft.trim().length > 0 &&
    modelAvailable &&
    voiceAvailable;

  return (
    <aside className="support-widget" aria-label={t.chat.widgetLabel}>
      {isOpen && (
        <section className="support-panel" aria-label={t.chat.panelLabel}>
          <header className="support-header">
            <div>
              <span className="support-kicker">{t.chat.kicker}</span>
              <strong>Miko</strong>
              <span className="support-presence">
                <i /> {isSpeechActive ? t.chat.speaking : t.chat.local}
              </span>
            </div>
            <div className="support-header-actions">
              <LanguageSwitch
                language={language}
                onChange={changeLanguage}
                disabled={isBusy || isPreparing}
              />
              <button
                type="button"
                onClick={reset}
                disabled={isBusy}
                aria-label={t.chat.reset}
                title={t.chat.reset}
              >
                <span aria-hidden="true">↻</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t.chat.close}
                title={t.chat.close}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </header>

          <AvatarCanvas
            voiceLevel={mouthLevel}
            isSpeaking={avatarIsSpeaking}
            reaction={reaction}
          />

          <StatusNotice
            key={`model-${status}`}
            className={`widget-model-state widget-model-state--${status}`}
            dismissible={isModelNoticeDismissible(status)}
            dismissLabel={t.chat.dismissModelStatus}
          >
            <span>{t.model[status]}</span>
            {canPrepare && (
              <button type="button" onClick={onPrepare} disabled={isPreparing}>
                {isPreparing ? t.model.preparing : t.model.prepare}
              </button>
            )}
          </StatusNotice>

          <StatusNotice
            key={`voice-${voiceNoticeKind}`}
            className={`widget-voice-state widget-voice-state--${voiceState}`}
            dismissible={isVoiceNoticeDismissible(voiceNoticeKind)}
            dismissLabel={t.chat.dismissVoiceStatus}
          >
            <span>{voiceStatusText}</span>
            {language === 'ja' &&
              (piperAssetState === 'checking' || piperIsInitializing) && (
                <div
                  className={`voice-progress${
                    piperIsInitializing ? ' is-indeterminate' : ''
                  }`}
                  role="progressbar"
                  aria-label={t.voice.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    piperIsInitializing ? undefined : piperProgress
                  }
                >
                  <i
                    style={
                      piperIsInitializing
                        ? undefined
                        : { width: `${piperProgress}%` }
                    }
                  />
                </div>
              )}
          </StatusNotice>

          <div className="conversation" ref={messageListRef} aria-live="polite">
            <div className="message-row message-row--assistant">
              <div className="message-bubble">{t.chat.welcome}</div>
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
                      <span className="typing-dots" aria-label={t.chat.typing}>
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : null)}
                </div>
              </div>
            ))}
          </div>

          <form className="message-composer" onSubmit={submitMessage}>
            <label htmlFor="support-message">{t.chat.messageLabel}</label>
            <div>
              <textarea
                id="support-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing &&
                    event.keyCode !== 229
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={
                  !modelAvailable
                    ? t.chat.inputDisabled
                    : !voiceAvailable
                      ? t.voice.missing
                      : t.chat.inputPlaceholder
                }
                disabled={!isReady || isBusy}
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={t.chat.send}
              >
                <SendIcon />
              </button>
            </div>
          </form>
          <footer className="support-footer">
            <span>
              {t.chat.poweredBy} <strong>@aituber-onair/core</strong>
            </span>
            <a
              href={TSUKUYOMI_CORPUS_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t.voice.creditLinkLabel}
            >
              <span>{t.voice.credit}</span>
              <span>{t.voice.creditCorpus}</span>
              <span>{TSUKUYOMI_CORPUS_URL}</span>
            </a>
          </footer>
        </section>
      )}

      <button
        type="button"
        className={`support-launcher${isOpen ? ' is-open' : ''}`}
        onClick={toggleWidget}
        aria-expanded={isOpen}
        aria-label={isOpen ? t.chat.closeWidget : t.chat.openWidget}
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
              <small>{t.chat.launcherKicker}</small>
              {t.chat.launcherTitle}
            </span>
          </>
        )}
      </button>
    </aside>
  );
}
