import { useCallback, useEffect, useRef, useState } from 'react';

export interface Live2DAudioBinding {
  audioElement: HTMLAudioElement | null;
  analyserNode: AnalyserNode | null;
  audioContext: AudioContext | null;
}

const EMPTY_AUDIO_BINDING: Live2DAudioBinding = {
  audioElement: null,
  analyserNode: null,
  audioContext: null,
};

export function useAudioLipsync() {
  const [audioBinding, setAudioBinding] =
    useState<Live2DAudioBinding>(EMPTY_AUDIO_BINDING);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playbackGenerationRef = useRef(0);
  const settlePlaybackRef = useRef<(() => void) | null>(null);

  const getAudioContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const finalizePlayback = useCallback(() => {
    settlePlaybackRef.current?.();
    settlePlaybackRef.current = null;
  }, []);

  const clearPlayback = useCallback(
    (shouldResolve = false) => {
      const audio = audioRef.current;
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }

      sourceNodeRef.current?.disconnect();
      analyserRef.current?.disconnect();

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      audioRef.current = null;
      analyserRef.current = null;
      sourceNodeRef.current = null;
      setAudioBinding(EMPTY_AUDIO_BINDING);
      setIsSpeaking(false);

      if (shouldResolve) {
        finalizePlayback();
      }
    },
    [finalizePlayback]
  );

  const stopCurrent = useCallback(() => {
    playbackGenerationRef.current += 1;
    clearPlayback(true);
  }, [clearPlayback]);

  const play = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<void> => {
      const generation = playbackGenerationRef.current + 1;
      playbackGenerationRef.current = generation;
      clearPlayback(true);

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const objectUrl = URL.createObjectURL(new Blob([arrayBuffer]));
      const audio = new Audio(objectUrl);
      audio.preload = 'auto';

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;

      const sourceNode = ctx.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(ctx.destination);

      objectUrlRef.current = objectUrl;
      audioRef.current = audio;
      analyserRef.current = analyser;
      sourceNodeRef.current = sourceNode;
      setAudioBinding({
        audioElement: audio,
        analyserNode: analyser,
        audioContext: ctx,
      });
      setIsSpeaking(true);

      return new Promise<void>((resolve, reject) => {
        settlePlaybackRef.current = resolve;

        audio.onended = () => {
          if (generation !== playbackGenerationRef.current) {
            resolve();
            return;
          }
          clearPlayback(true);
        };

        audio.onerror = () => {
          if (generation !== playbackGenerationRef.current) {
            resolve();
            return;
          }

          clearPlayback(false);
          settlePlaybackRef.current = null;
          reject(new Error('音声を再生できませんでした。'));
        };

        void audio.play().catch((error: unknown) => {
          if (generation !== playbackGenerationRef.current) {
            resolve();
            return;
          }

          clearPlayback(false);
          settlePlaybackRef.current = null;
          reject(
            error instanceof Error
              ? error
              : new Error('音声を再生できませんでした。')
          );
        });
      });
    },
    [clearPlayback, getAudioContext]
  );

  useEffect(() => {
    return () => {
      stopCurrent();
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        void ctxRef.current.close();
      }
    };
  }, [stopCurrent]);

  return {
    audioBinding,
    isSpeaking,
    play,
    stop: stopCurrent,
  };
}
