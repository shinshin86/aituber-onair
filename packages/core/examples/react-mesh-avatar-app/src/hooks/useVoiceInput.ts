import type { RealtimeTranscriptionSession } from '@aituber-onair/transcription';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  VOICE_INPUT_RESTART_DELAY_MS,
  type VoiceInputMode,
  type VoiceInputNotice,
  type VoiceInputPhase,
  type VoiceInputService,
  createVoiceInputSession,
  isCloudVoiceInputService,
  shouldRetryVoiceInput,
  voiceInputNoticeForError,
} from '../lib/voiceInput';

interface UseVoiceInputOptions {
  mode: VoiceInputMode;
  service: VoiceInputService;
  /** Returns the API key for a cloud service, or an empty string. */
  getApiKey: (service: VoiceInputService) => string;
  /** True while the reply is generated or spoken. */
  busy: boolean;
  onInterimTranscript: (text: string) => void;
  onFinalTranscript: (text: string) => void;
}

/**
 * Microphone input for the chat form.
 *
 * Each confirmed utterance is passed to `onFinalTranscript` and listening
 * stops, so the avatar's own voice is not transcribed. In continuous mode the
 * microphone opens again after the reply has finished.
 */
export function useVoiceInput({
  mode,
  service,
  getApiKey,
  busy,
  onInterimTranscript,
  onFinalTranscript,
}: UseVoiceInputOptions) {
  const [phase, setPhase] = useState<VoiceInputPhase>('idle');
  const [continuousActive, setContinuousActive] = useState(false);
  const [notice, setNotice] = useState<VoiceInputNotice | null>(null);

  // Session callbacks outlive renders, so they read the latest values here.
  const modeRef = useRef(mode);
  const serviceRef = useRef(service);
  const getApiKeyRef = useRef(getApiKey);
  const busyRef = useRef(busy);
  const onInterimRef = useRef(onInterimTranscript);
  const onFinalRef = useRef(onFinalTranscript);
  useLayoutEffect(() => {
    modeRef.current = mode;
    serviceRef.current = service;
    getApiKeyRef.current = getApiKey;
    busyRef.current = busy;
    onInterimRef.current = onInterimTranscript;
    onFinalRef.current = onFinalTranscript;
  });

  const sessionRef = useRef<RealtimeTranscriptionSession | null>(null);
  const sessionServiceRef = useRef<VoiceInputService | null>(null);
  const generationRef = useRef(0);
  // True from pressing the mic until an utterance is confirmed or stopped.
  const acceptingRef = useRef(false);
  const continuousRef = useRef(false);
  const awaitingReplyRef = useRef(false);
  const retryCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const listenRef = useRef<() => void>(() => undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const endContinuous = useCallback(() => {
    continuousRef.current = false;
    awaitingReplyRef.current = false;
    setContinuousActive(false);
  }, []);

  const stopSession = useCallback(() => {
    generationRef.current += 1;
    acceptingRef.current = false;
    setPhase('idle');
    void sessionRef.current?.stop().catch(() => undefined);
  }, []);

  const stopAll = useCallback(() => {
    clearTimer();
    endContinuous();
    stopSession();
  }, [clearTimer, endContinuous, stopSession]);

  /** Listens again after a pause, unless the conversation moved on. */
  const scheduleListen = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!continuousRef.current || acceptingRef.current || busyRef.current) {
        return;
      }
      if (awaitingReplyRef.current) {
        awaitingReplyRef.current = false;
      }
      listenRef.current();
    }, VOICE_INPUT_RESTART_DELAY_MS);
  }, [clearTimer]);

  const handleError = useCallback(
    (code: string) => {
      if (!acceptingRef.current) return;
      acceptingRef.current = false;
      setPhase('idle');

      if (code === 'no-speech') {
        // Silence is normal while waiting; keep the continuous loop going.
        if (continuousRef.current && !awaitingReplyRef.current) {
          scheduleListen();
        } else {
          endContinuous();
        }
        return;
      }

      if (
        shouldRetryVoiceInput({
          code,
          mode: modeRef.current,
          sessionActive: continuousRef.current,
          awaitingReply: awaitingReplyRef.current,
          retryCount: retryCountRef.current,
        })
      ) {
        retryCountRef.current += 1;
        void sessionRef.current?.stop().catch(() => undefined);
        scheduleListen();
        return;
      }

      clearTimer();
      endContinuous();
      setNotice(voiceInputNoticeForError(code, serviceRef.current));
      void sessionRef.current?.stop().catch(() => undefined);
    },
    [clearTimer, endContinuous, scheduleListen],
  );

  const ensureSession = useCallback(
    async (target: VoiceInputService) => {
      if (sessionRef.current && sessionServiceRef.current === target) {
        return sessionRef.current;
      }

      const previous = sessionRef.current;
      sessionRef.current = null;
      sessionServiceRef.current = null;
      if (previous) {
        await previous.dispose().catch(() => undefined);
      }

      const session = createVoiceInputSession(target, async () => {
        const key = getApiKeyRef.current(target).trim();
        if (!key) throw new Error('Missing API key');
        return key;
      });

      session.onTranscript((update) => {
        if (!acceptingRef.current) return;
        const text = update.text.trim();
        if (!update.isFinal) {
          onInterimRef.current(update.text);
          return;
        }
        if (!text) return;

        acceptingRef.current = false;
        retryCountRef.current = 0;
        setPhase('idle');
        void session.stop().catch(() => undefined);

        if (modeRef.current === 'continuous' && continuousRef.current) {
          awaitingReplyRef.current = true;
        } else {
          endContinuous();
        }
        onFinalRef.current(text);
        if (awaitingReplyRef.current) {
          // Covers replies that fail before the busy flag ever turns on.
          scheduleListen();
        }
      });

      session.onStateChange((state) => {
        if (state === 'connecting' || state === 'listening') {
          if (acceptingRef.current) setPhase(state);
          return;
        }
        if (state === 'idle' && acceptingRef.current) {
          // The service closed without a confirmed utterance (silence).
          acceptingRef.current = false;
          setPhase('idle');
          if (continuousRef.current && !awaitingReplyRef.current) {
            scheduleListen();
          } else {
            endContinuous();
          }
          return;
        }
        if (state !== 'stopping' && !acceptingRef.current) {
          setPhase('idle');
        }
      });

      session.onError((error) => handleError(error.code));

      sessionRef.current = session;
      sessionServiceRef.current = target;
      return session;
    },
    [endContinuous, handleError, scheduleListen],
  );

  const listen = useCallback(() => {
    const target = serviceRef.current;
    if (
      isCloudVoiceInputService(target) &&
      !getApiKeyRef.current(target).trim()
    ) {
      clearTimer();
      endContinuous();
      setNotice({ type: 'missing-key', service: target });
      return;
    }

    const generation = ++generationRef.current;
    acceptingRef.current = true;
    setPhase('connecting');

    void (async () => {
      try {
        const session = await ensureSession(target);
        if (generation !== generationRef.current) return;
        await session.start();
        if (generation !== generationRef.current) {
          await session.stop().catch(() => undefined);
          return;
        }
        if (acceptingRef.current) setPhase('listening');
      } catch {
        // Errors reach the onError listener; this only guards the promise.
        if (generation === generationRef.current && acceptingRef.current) {
          acceptingRef.current = false;
          setPhase('idle');
        }
      }
    })();
  }, [clearTimer, endContinuous, ensureSession]);
  useLayoutEffect(() => {
    listenRef.current = listen;
  }, [listen]);

  const toggle = useCallback(() => {
    if (acceptingRef.current || continuousRef.current) {
      stopAll();
      return;
    }
    if (busyRef.current) return;

    setNotice(null);
    retryCountRef.current = 0;
    if (modeRef.current === 'continuous') {
      continuousRef.current = true;
      setContinuousActive(true);
    }
    listen();
  }, [listen, stopAll]);

  // Continuous mode: open the microphone again once the reply is done.
  useEffect(() => {
    if (!busy && continuousRef.current && awaitingReplyRef.current) {
      scheduleListen();
    }
  }, [busy, scheduleListen]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      acceptingRef.current = false;
      continuousRef.current = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      const session = sessionRef.current;
      sessionRef.current = null;
      void session?.dispose().catch(() => undefined);
    };
  }, []);

  /** Call before switching mode or service so the old session ends. */
  const reset = useCallback(() => {
    stopAll();
    setNotice(null);
  }, [stopAll]);

  return {
    phase,
    continuousActive,
    notice,
    toggle,
    stop: stopAll,
    reset,
  };
}
