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

export interface GeminiNanoState {
  status: GeminiNanoStatus;
  statusText: string;
  downloadProgress: number | null;
  isPreparing: boolean;
  prepareModel: () => void;
}

const MODEL_IO = {
  expectedInputs: [{ type: 'text', languages: ['ja'] }],
  expectedOutputs: [{ type: 'text', languages: ['ja'] }],
};

function getLanguageModel(): LanguageModelAPI | undefined {
  return (globalThis as Record<string, unknown>)
    .LanguageModel as LanguageModelAPI;
}

export function useGeminiNanoStatus(enabled: boolean): GeminiNanoState {
  const [status, setStatus] = useState<GeminiNanoStatus>('checking');
  const [statusText, setStatusText] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const preparingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus('checking');
      setStatusText('');
      setDownloadProgress(null);
      return;
    }

    let cancelled = false;

    async function check() {
      const lm = getLanguageModel();
      if (!lm) {
        if (!cancelled) {
          setStatus('unavailable');
          setStatusText(
            'Built-in AI is not available. Chrome 138+ with flags enabled is required.',
          );
        }
        return;
      }

      try {
        const result = await lm.availability(MODEL_IO);
        if (cancelled) return;

        if (result === 'available') {
          setStatus('available');
          setStatusText('Gemini Nano is ready.');
        } else if (result === 'downloading') {
          setStatus('downloading');
          setStatusText(
            'Gemini Nano model is being downloaded. Please wait...',
          );
        } else if (result === 'downloadable') {
          setStatus('downloadable');
          setStatusText(
            'Gemini Nano model needs to be downloaded. Press "Prepare Model" to start.',
          );
        } else {
          setStatus('unavailable');
          setStatusText(
            'Built-in AI is not available. Chrome 138+ with flags enabled is required.',
          );
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setStatusText('Failed to check Built-in AI availability.');
        }
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const prepareModel = useCallback(() => {
    if (preparingRef.current) return;

    const lm = getLanguageModel();
    if (!lm) return;

    preparingRef.current = true;
    setIsPreparing(true);
    setStatus('downloading');
    setStatusText('Downloading Gemini Nano model...');
    setDownloadProgress(0);

    lm.create({
      ...MODEL_IO,
      systemPrompt: 'You are a helpful assistant.',
      monitor: (m: {
        addEventListener(
          event: string,
          handler: (e: { loaded: number }) => void,
        ): void;
      }) => {
        m.addEventListener('downloadprogress', (e: { loaded: number }) => {
          if (!mountedRef.current) return;
          const pct = Math.round((e.loaded || 0) * 100);
          setDownloadProgress(pct);
          setStatusText(`Downloading Gemini Nano model... ${pct}%`);
        });
      },
    })
      .then((session) => {
        try {
          session.destroy();
        } catch {
          // ignore
        }
        if (!mountedRef.current) return;
        setStatus('available');
        setStatusText('Gemini Nano is ready.');
        setDownloadProgress(null);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setStatus('error');
        setStatusText('Failed to prepare Gemini Nano model. Please try again.');
        setDownloadProgress(null);
      })
      .finally(() => {
        preparingRef.current = false;
        if (mountedRef.current) {
          setIsPreparing(false);
        }
      });
  }, []);

  return { status, statusText, downloadProgress, isPreparing, prepareModel };
}
