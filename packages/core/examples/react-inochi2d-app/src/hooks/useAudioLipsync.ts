import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Inochi2DLipSyncController,
  resetInochi2DMouthToIdle,
  startInochi2DLipSync,
} from '../lib/inochi2dLipSync';
import { applyInochi2DExpression } from '../lib/inochi2dExpression';

export function useAudioLipsync({
  preserveExpression = false,
}: { preserveExpression?: boolean } = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const lipSyncRef = useRef<Inochi2DLipSyncController | null>(null);
  const playbackGenerationRef = useRef(0);
  const settlePlaybackRef = useRef<(() => void) | null>(null);
  const preserveExpressionRef = useRef(preserveExpression);

  useEffect(() => {
    preserveExpressionRef.current = preserveExpression;
  }, [preserveExpression]);

  const finalizePlayback = useCallback(() => {
    settlePlaybackRef.current?.();
    settlePlaybackRef.current = null;
  }, []);

  const clearPlayback = useCallback(
    (shouldResolve = false) => {
      lipSyncRef.current?.stop();
      lipSyncRef.current = null;
      resetInochi2DMouthToIdle();
      if (!preserveExpressionRef.current) {
        void applyInochi2DExpression('neutral');
      }

      const audio = audioRef.current;
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      audioRef.current = null;
      setIsSpeaking(false);

      if (shouldResolve) {
        finalizePlayback();
      }
    },
    [finalizePlayback],
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

      const objectUrl = URL.createObjectURL(new Blob([arrayBuffer]));
      const audio = new Audio(objectUrl);
      audio.preload = 'auto';

      objectUrlRef.current = objectUrl;
      audioRef.current = audio;
      lipSyncRef.current = startInochi2DLipSync(audio);
      setIsSpeaking(true);
      if (!preserveExpressionRef.current) {
        void applyInochi2DExpression('speaking', { weight: 0.72 });
      }

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
              : new Error('音声を再生できませんでした。'),
          );
        });
      });
    },
    [clearPlayback],
  );

  useEffect(() => {
    return () => {
      stopCurrent();
    };
  }, [stopCurrent]);

  return {
    isSpeaking,
    play,
    stop: stopCurrent,
  };
}
