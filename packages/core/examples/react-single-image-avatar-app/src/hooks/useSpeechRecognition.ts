import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionInstance = InstanceType<typeof SpeechRecognition>;

interface UseSpeechRecognitionOptions {
  onFinalTranscript?: (text: string) => void;
}

export function useSpeechRecognition(options?: UseSpeechRecognitionOptions) {
  const onFinalTranscript = options?.onFinalTranscript;
  const supported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (!supported) return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim);
      if (final) {
        setFinalTranscript(final);
        onFinalTranscript?.(final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error !== 'no-speech') {
        setListening(false);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [supported, onFinalTranscript]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setFinalTranscript('');
    setInterimTranscript('');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // already started
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current || !listening) return;
    recognitionRef.current.stop();
    setListening(false);
  }, [listening]);

  const reset = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    supported,
    listening,
    interimTranscript,
    finalTranscript,
    start,
    stop,
    reset,
  };
}
