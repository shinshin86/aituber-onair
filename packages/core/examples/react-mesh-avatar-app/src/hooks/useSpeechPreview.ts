import { useCallback, useEffect, useRef, useState } from 'react';

const PREVIEW_SECONDS = 3.2;

/**
 * Fake "speaking" signal for previewing the avatar without TTS: syllable-like loudness
 * bursts with short pauses between phrases.
 */
export function useSpeechPreview() {
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(false);
  const rafRef = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setLevel(0);
    setActive(false);
  }, []);

  const start = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const startedAt = performance.now();
    setActive(true);
    const tick = (now: number) => {
      const t = (now - startedAt) / 1000;
      if (t >= PREVIEW_SECONDS) {
        stop();
        return;
      }
      const syllable = Math.floor(t * 6.5);
      const phase = (t * 6.5) % 1;
      const loud = Math.abs(Math.sin(syllable * 12.9898) * 43758.5453) % 1;
      const pause = t % 1.6 > 1.35 ? 0 : 1;
      setLevel(Math.sin(phase * Math.PI) * (0.35 + loud * 0.65) * pause);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { level, active, start };
}
