import { useEffect, useState } from 'react';

const SYNTHETIC_LIPSYNC_INTERVAL_MS = 75;
const MAX_MOUTH_LEVEL = 0.115;

export const getSyntheticMouthLevel = (elapsedMs: number): number => {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 0;

  const primaryWave = (Math.sin(elapsedMs / 92) + 1) / 2;
  const secondaryWave = (Math.sin(elapsedMs / 37 + 1.4) + 1) / 2;
  const level = 0.018 + primaryWave * 0.068 + secondaryWave * 0.029;
  return Math.min(MAX_MOUTH_LEVEL, Math.max(0, level));
};

export function useSyntheticLipsync(isSpeechActive: boolean): number {
  const [mouthLevel, setMouthLevel] = useState(0);

  useEffect(() => {
    if (!isSpeechActive) return;

    const startedAt = performance.now();
    const updateMouth = () => {
      setMouthLevel(getSyntheticMouthLevel(performance.now() - startedAt));
    };
    const intervalId = window.setInterval(
      updateMouth,
      SYNTHETIC_LIPSYNC_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isSpeechActive]);

  return isSpeechActive ? mouthLevel : 0;
}
