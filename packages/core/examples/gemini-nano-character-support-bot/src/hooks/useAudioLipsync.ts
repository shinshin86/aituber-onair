import { useCallback, useEffect, useRef, useState } from 'react';

const MOUTH_LEVELS = 5;
const SMOOTH_FACTOR = 0.5;
const RMS_CEILING = 0.12;

export const calculateRms = (samples: Float32Array): number => {
  if (samples.length === 0) return 0;

  let squareSum = 0;
  for (const sample of samples) {
    squareSum += sample * sample;
  }
  return Math.sqrt(squareSum / samples.length);
};

export const smoothRms = (previous: number, current: number): number =>
  previous * SMOOTH_FACTOR + current * (1 - SMOOTH_FACTOR);

export const getRmsMouthLevel = (smoothedRms: number): number => {
  const normalized = Math.min(Math.max(smoothedRms / RMS_CEILING, 0), 1);
  return Math.min(
    Math.round(normalized * (MOUTH_LEVELS - 1)),
    MOUTH_LEVELS - 1,
  );
};

export function useAudioLipsync() {
  const [mouthLevel, setMouthLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [smoothedValue, setSmoothedValue] = useState(0);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef(0);
  const smoothedRef = useRef(0);

  const getAudioContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === 'closed') {
      contextRef.current = new AudioContext();
    }
    return contextRef.current;
  }, []);

  const unlock = useCallback(async (): Promise<void> => {
    const context = getAudioContext();
    if (context.state === 'suspended') {
      await context.resume();
    }
  }, [getAudioContext]);

  const stop = useCallback(() => {
    const source = sourceRef.current;
    sourceRef.current = null;
    analyserRef.current = null;

    if (source) {
      try {
        source.stop();
      } catch {
        // The source has already stopped.
      }
      source.disconnect();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    smoothedRef.current = 0;
    setMouthLevel(0);
    setSmoothedValue(0);
    setIsSpeaking(false);
  }, []);

  const play = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<void> => {
      stop();

      const context = getAudioContext();
      if (context.state === 'suspended') {
        await context.resume();
      }

      const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
      const source = context.createBufferSource();
      const gain = context.createGain();
      const analyser = context.createAnalyser();
      const samples = new Float32Array(2048);

      source.buffer = audioBuffer;
      gain.gain.value = 1;
      analyser.fftSize = samples.length;
      source.connect(gain);
      gain.connect(analyser);
      analyser.connect(context.destination);

      sourceRef.current = source;
      analyserRef.current = analyser;
      setIsSpeaking(true);

      const updateMouth = () => {
        if (analyserRef.current !== analyser) return;

        analyser.getFloatTimeDomainData(samples);
        smoothedRef.current = smoothRms(
          smoothedRef.current,
          calculateRms(samples),
        );
        setMouthLevel(getRmsMouthLevel(smoothedRef.current));
        setSmoothedValue(smoothedRef.current);
        animationFrameRef.current = requestAnimationFrame(updateMouth);
      };

      animationFrameRef.current = requestAnimationFrame(updateMouth);

      await new Promise<void>((resolve) => {
        source.onended = () => {
          if (sourceRef.current === source) {
            sourceRef.current = null;
            analyserRef.current = null;
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = 0;
            }
            smoothedRef.current = 0;
            setMouthLevel(0);
            setSmoothedValue(0);
            setIsSpeaking(false);
          }
          resolve();
        };
        source.start();
      });
    },
    [getAudioContext, stop],
  );

  useEffect(() => {
    return () => {
      stop();
      if (contextRef.current && contextRef.current.state !== 'closed') {
        void contextRef.current.close();
      }
    };
  }, [stop]);

  return {
    mouthLevel,
    isSpeaking,
    smoothedValue,
    unlock,
    play,
    stop,
  };
}
