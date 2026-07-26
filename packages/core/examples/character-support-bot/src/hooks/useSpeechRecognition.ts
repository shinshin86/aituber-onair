import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SPEECH_RECOGNITION_MESSAGES,
  getSpeechRecognitionErrorMessage,
  resolveSpeechLanguage,
  type SpeechRecognitionMessages,
} from '../lib/speechRecognition';

interface UseSpeechRecognitionOptions {
  language?: string;
  messages?: SpeechRecognitionMessages;
  suspended?: boolean;
  onFinalTranscript?: (text: string) => void;
}

const RESTART_DELAY_MS = 160;

export function useSpeechRecognition({
  language,
  messages = DEFAULT_SPEECH_RECOGNITION_MESSAGES,
  suspended = false,
  onFinalTranscript,
}: UseSpeechRecognitionOptions = {}) {
  const SpeechRecognitionCtor =
    typeof window === 'undefined'
      ? undefined
      : (window.SpeechRecognition ?? window.webkitSpeechRecognition);
  const supported = SpeechRecognitionCtor !== undefined;
  const recognitionLanguage = resolveSpeechLanguage(language);
  const [active, setActive] = useState(false);
  const [listeningLanguage, setListeningLanguage] = useState<string | null>(
    null,
  );
  const [interimState, setInterimState] = useState({
    language: recognitionLanguage,
    transcript: '',
  });
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(false);
  const suspendedRef = useRef(suspended);
  const ignoreResultsRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const scheduleStartRef = useRef<() => void>(() => undefined);
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(
    () => () => {
      activeRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = recognitionLanguage;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    const clearRestartTimer = () => {
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    };

    const startRecognition = () => {
      restartTimerRef.current = null;
      if (
        !activeRef.current ||
        suspendedRef.current ||
        !recognitionRef.current
      ) {
        return;
      }
      ignoreResultsRef.current = false;
      try {
        recognition.start();
      } catch (error) {
        if (
          !(error instanceof DOMException) ||
          error.name !== 'InvalidStateError'
        ) {
          activeRef.current = false;
          setActive(false);
          setListeningLanguage(null);
          setErrorCode('start-failed');
        }
      }
    };

    const scheduleStart = () => {
      clearRestartTimer();
      restartTimerRef.current = window.setTimeout(
        startRecognition,
        RESTART_DELAY_MS,
      );
    };
    scheduleStartRef.current = scheduleStart;

    recognition.onstart = () => {
      if (!activeRef.current || suspendedRef.current) {
        ignoreResultsRef.current = true;
        recognition.abort();
        return;
      }
      setListeningLanguage(recognitionLanguage);
      setErrorCode(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (ignoreResultsRef.current || suspendedRef.current) return;

      let interim = '';
      let final = '';
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index++
      ) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimState({
        language: recognitionLanguage,
        transcript: interim,
      });
      if (final.trim()) {
        onFinalTranscriptRef.current?.(final.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setListeningLanguage(null);
      if (event.error === 'aborted') return;

      activeRef.current = false;
      setActive(false);
      setInterimState({
        language: recognitionLanguage,
        transcript: '',
      });
      setErrorCode(event.error);
    };

    recognition.onend = () => {
      setListeningLanguage(null);
      if (activeRef.current && !suspendedRef.current) {
        scheduleStart();
      }
    };

    if (activeRef.current && !suspendedRef.current) {
      scheduleStart();
    }

    return () => {
      clearRestartTimer();
      ignoreResultsRef.current = true;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
      scheduleStartRef.current = () => undefined;
    };
  }, [recognitionLanguage, SpeechRecognitionCtor]);

  useEffect(() => {
    const wasSuspended = suspendedRef.current;
    suspendedRef.current = suspended;
    if (!supported || wasSuspended === suspended) return;

    if (suspended) {
      if (activeRef.current) {
        ignoreResultsRef.current = true;
        recognitionRef.current?.abort();
        setListeningLanguage(null);
      }
      return;
    }

    if (activeRef.current) {
      ignoreResultsRef.current = false;
      scheduleStartRef.current();
    }
  }, [supported, suspended]);

  const start = useCallback(() => {
    if (!supported || activeRef.current) return;
    activeRef.current = true;
    setActive(true);
    setInterimState({
      language: recognitionLanguage,
      transcript: '',
    });
    setErrorCode(null);
    if (!suspendedRef.current) {
      scheduleStartRef.current();
    }
  }, [recognitionLanguage, supported]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setListeningLanguage(null);
    setInterimState({
      language: recognitionLanguage,
      transcript: '',
    });
    setErrorCode(null);
    ignoreResultsRef.current = true;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.stop();
  }, [recognitionLanguage]);

  const resetInterim = useCallback(() => {
    setInterimState({
      language: recognitionLanguage,
      transcript: '',
    });
  }, [recognitionLanguage]);

  const listening = listeningLanguage === recognitionLanguage;
  const interimTranscript =
    interimState.language === recognitionLanguage
      ? interimState.transcript
      : '';
  const paused = active && suspended;
  const errorMessage = errorCode
    ? getSpeechRecognitionErrorMessage(errorCode, messages)
    : null;
  const statusMessage = errorMessage
    ? errorMessage
    : paused
      ? messages.paused
      : listening
        ? messages.listening.replace('{language}', recognitionLanguage)
        : active
          ? messages.starting
          : null;

  return {
    supported,
    active,
    listening,
    paused,
    interimTranscript,
    errorMessage,
    statusMessage,
    language: recognitionLanguage,
    start,
    stop,
    resetInterim,
  };
}
