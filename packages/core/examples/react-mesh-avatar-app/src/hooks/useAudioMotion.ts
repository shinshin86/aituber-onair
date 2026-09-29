import { useCallback, useEffect, useRef, useState } from 'react';

/** Smoothing factor (higher means smoother); kept low so the dip between morae survives */
const SMOOTH_FACTOR = 0.3;
/**
 * The level that maps to 1.0 follows the voice's own recent peak (decaying over a few
 * seconds) instead of a fixed RMS ceiling: loud TTS voices sat at a fixed ceiling for
 * whole phrases, which kept the mouth open. MIN_CEILING stops silence from being boosted.
 */
const PEAK_DECAY_PER_FRAME = 0.995;
const MIN_CEILING = 0.04;

export function useAudioMotion() {
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef(0);
  const peakRef = useRef(0);

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
    peakRef.current = 0;
    setVoiceLevel(0);
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
      // ~21 ms window at 48 kHz: short enough to see each mora
      analyser.fftSize = 1024;

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

        // Normalize (0-1) against the recent peak
        peakRef.current = Math.max(
          smoothedRef.current,
          peakRef.current * PEAK_DECAY_PER_FRAME,
        );
        const ceiling = Math.max(MIN_CEILING, peakRef.current * 0.85);
        const normalized = Math.min(smoothedRef.current / ceiling, 1);

        setVoiceLevel(normalized);

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
          setVoiceLevel(0);
          setIsSpeaking(false);
          sourceRef.current = null;
          resolve();
        };
        source.start(0);
      });
    },
    [stopCurrent, getAudioContext],
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
    voiceLevel,
    isSpeaking,
    play,
    stop: stopCurrent,
  };
}
