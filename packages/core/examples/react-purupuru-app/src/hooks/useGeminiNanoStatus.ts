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

interface GeminiNanoState {
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
      queueMicrotask(() => {
        setStatus('checking');
        setStatusText('');
        setDownloadProgress(null);
      });
      return;
    }

    let cancelled = false;

    async function check() {
      const lm = getLanguageModel();
      if (!lm) {
        if (!cancelled) {
          setStatus('unavailable');
          setStatusText(
            'Chrome 138+ で Built-in AI のフラグを有効にしてください。',
          );
        }
        return;
      }

      try {
        const result = await lm.availability(MODEL_IO);
        if (cancelled) {
          return;
        }

        if (result === 'available') {
          setStatus('available');
          setStatusText('Gemini Nano は利用可能です。');
        } else if (result === 'downloading') {
          setStatus('downloading');
          setStatusText('Gemini Nano モデルをダウンロード中です。');
        } else if (result === 'downloadable') {
          setStatus('downloadable');
          setStatusText(
            'Gemini Nano モデルの準備が必要です。「Prepare Model」を押してください。',
          );
        } else {
          setStatus('unavailable');
          setStatusText(
            'Chrome 138+ で Built-in AI のフラグを有効にしてください。',
          );
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setStatusText('Built-in AI の状態確認に失敗しました。');
        }
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const prepareModel = useCallback(() => {
    if (preparingRef.current) {
      return;
    }

    const lm = getLanguageModel();
    if (!lm) {
      return;
    }

    preparingRef.current = true;
    setIsPreparing(true);
    setStatus('downloading');
    setStatusText('Gemini Nano モデルをダウンロード中です。');
    setDownloadProgress(0);

    lm.create({
      ...MODEL_IO,
      systemPrompt: 'You are a helpful assistant.',
      monitor: (monitor: {
        addEventListener(
          event: string,
          handler: (event: { loaded: number }) => void,
        ): void;
      }) => {
        monitor.addEventListener(
          'downloadprogress',
          (event: { loaded: number }) => {
            if (!mountedRef.current) {
              return;
            }
            const progress = Math.round((event.loaded || 0) * 100);
            setDownloadProgress(progress);
            setStatusText(
              `Gemini Nano モデルをダウンロード中です。${progress}%`,
            );
          },
        );
      },
    })
      .then((session) => {
        try {
          session.destroy();
        } catch {
          // ignore
        }
        if (!mountedRef.current) {
          return;
        }
        setStatus('available');
        setStatusText('Gemini Nano は利用可能です。');
        setDownloadProgress(null);
      })
      .catch(() => {
        if (!mountedRef.current) {
          return;
        }
        setStatus('error');
        setStatusText('Gemini Nano モデルの準備に失敗しました。');
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
