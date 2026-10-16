import { useCallback, useEffect, useRef, useState } from 'react';

export type GeminiNanoStatus =
  | 'checking'
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'error';

interface LanguageModelAPI {
  availability(options?: Record<string, unknown>): Promise<string>;
  create(options?: Record<string, unknown>): Promise<{ destroy(): void }>;
}

const MODEL_IO = {
  expectedInputs: [{ type: 'text', languages: ['ja'] }],
  expectedOutputs: [{ type: 'text', languages: ['ja'] }],
};

function getLanguageModel(): LanguageModelAPI | undefined {
  return (globalThis as Record<string, unknown>).LanguageModel as
    | LanguageModelAPI
    | undefined;
}

/** Availability of Chrome's built-in Gemini Nano, plus a user-triggered download. */
export function useGeminiNano() {
  const [status, setStatus] = useState<GeminiNanoStatus>('checking');
  const [progress, setProgress] = useState<number | null>(null);
  const preparingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    (async () => {
      const lm = getLanguageModel();
      if (!lm) {
        if (!cancelled) setStatus('unavailable');
        return;
      }
      try {
        const result = await lm.availability(MODEL_IO);
        if (cancelled) return;
        if (
          result === 'available' ||
          result === 'downloading' ||
          result === 'downloadable'
        ) {
          setStatus(result);
        } else {
          setStatus('unavailable');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  /** Must be called from a user gesture: Chrome only starts the download then. */
  const prepare = useCallback(() => {
    const lm = getLanguageModel();
    if (!lm || preparingRef.current) return;
    preparingRef.current = true;
    setStatus('downloading');
    setProgress(0);
    lm.create({
      ...MODEL_IO,
      monitor: (monitor: {
        addEventListener(
          event: string,
          handler: (event: { loaded: number }) => void,
        ): void;
      }) => {
        monitor.addEventListener('downloadprogress', (event) => {
          if (mountedRef.current) {
            setProgress(Math.round((event.loaded || 0) * 100));
          }
        });
      },
    })
      .then((session) => {
        try {
          session.destroy();
        } catch {
          // ignore
        }
        if (mountedRef.current) {
          setStatus('available');
          setProgress(null);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setStatus('error');
          setProgress(null);
        }
      })
      .finally(() => {
        preparingRef.current = false;
      });
  }, []);

  /** Loads the model into memory ahead of the first reply (fire and forget). */
  const warmUp = useCallback(() => {
    const lm = getLanguageModel();
    if (!lm) return;
    lm.create(MODEL_IO)
      .then((session) => {
        try {
          session.destroy();
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // availability() already reported the state; nothing to do here
      });
  }, []);

  return { status, progress, prepare, warmUp };
}
