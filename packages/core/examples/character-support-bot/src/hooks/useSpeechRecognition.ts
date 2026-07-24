import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionErrorMessage,
  resolveSpeechLanguage,
} from '../lib/speechRecognition';

interface UseSpeechRecognitionOptions {
  language?: string;
  suspended?: boolean;
  onFinalTranscript?: (text: string) => void;
}

const RESTART_DELAY_MS = 160;

export function useSpeechRecognition({
  language,
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
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
          setListening(false);
          setErrorMessage(
            'Voice input could not start. You can keep typing instead.',
          );
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
      setListening(true);
      setErrorMessage(null);
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

      setInterimTranscript(interim);
      if (final.trim()) {
        onFinalTranscriptRef.current?.(final.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setListening(false);
      if (event.error === 'aborted') return;

      activeRef.current = false;
      setActive(false);
      setInterimTranscript('');
      setErrorMessage(getSpeechRecognitionErrorMessage(event.error));
    };

    recognition.onend = () => {
      setListening(false);
      if (activeRef.current && !suspendedRef.current) {
        scheduleStart();
      }
    };

    return () => {
      activeRef.current = false;
      clearRestartTimer();
      ignoreResultsRef.current = true;
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
        setListening(false);
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
    setInterimTranscript('');
    setErrorMessage(null);
    if (!suspendedRef.current) {
      scheduleStartRef.current();
    }
  }, [supported]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setListening(false);
    setInterimTranscript('');
    setErrorMessage(null);
    ignoreResultsRef.current = true;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.stop();
  }, []);

  const resetInterim = useCallback(() => {
    setInterimTranscript('');
  }, []);

  const paused = active && suspended;
  const statusMessage = errorMessage
    ? errorMessage
    : paused
      ? 'Voice input paused while Miko is speaking.'
      : listening
        ? `Listening in ${recognitionLanguage}…`
        : active
          ? 'Starting voice input…'
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
