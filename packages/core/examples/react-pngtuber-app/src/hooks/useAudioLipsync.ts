import { useCallback, useEffect, useRef, useState } from 'react';

/** Number of mouth animation levels (0-4) */
const MOUTH_LEVELS = 5;
/** Smoothing factor (higher means smoother) */
const SMOOTH_FACTOR = 0.5;
/** RMS normalization ceiling (this value maps to 1.0) */
const RMS_CEILING = 0.12;

export function useAudioLipsync() {
  const [mouthLevel, setMouthLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [smoothedValue, setSmoothedValue] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef(0);

  const getAudioContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const stopCurrent = useCallback(() => {
    // Stop the currently playing source
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // already stopped
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    // Stop the animation loop
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    smoothedRef.current = 0;
    setMouthLevel(0);
    setSmoothedValue(0);
    setIsSpeaking(false);
  }, []);

  const play = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<void> => {
      // Stop previous playback
      stopCurrent();

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Decode audio data
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

      // Node chain: source -> gain -> analyser -> destination
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = 1.0;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;

      source.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      sourceRef.current = source;
      analyserRef.current = analyser;
      setIsSpeaking(true);

      // Analysis loop
      const dataArray = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(dataArray);

        // Compute RMS
        let sumSq = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sumSq += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSq / dataArray.length);

        // Smooth value over time
        smoothedRef.current =
          smoothedRef.current * SMOOTH_FACTOR + rms * (1 - SMOOTH_FACTOR);

        // Normalize (0-1)
        const normalized = Math.min(smoothedRef.current / RMS_CEILING, 1);

        // Mouth animation level (0-4)
        const level = Math.min(
          Math.round(normalized * (MOUTH_LEVELS - 1)),
          MOUTH_LEVELS - 1
        );

        setMouthLevel(level);
        setSmoothedValue(smoothedRef.current);

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);

      // Cleanup when playback ends
      return new Promise<void>((resolve) => {
        source.onended = () => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          }
          smoothedRef.current = 0;
          setMouthLevel(0);
          setSmoothedValue(0);
          setIsSpeaking(false);
          sourceRef.current = null;
          resolve();
        };
        source.start(0);
      });
    },
    [stopCurrent, getAudioContext]
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
    mouthLevel,
    isSpeaking,
    smoothedValue,
    play,
    stop: stopCurrent,
  };
}
