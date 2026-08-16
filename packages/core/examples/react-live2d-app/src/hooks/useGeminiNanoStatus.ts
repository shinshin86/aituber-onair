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
  const [status, setStatus] = useState<GeminiNanoStatus>(
    enabled ? 'checking' : 'checking',
  );
  const [statusText, setStatusText] = useState(enabled ? '' : '');
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
      return;
    }

    let cancelled = false;

    async function check() {
      const lm = getLanguageModel();
      if (!lm) {
        if (!cancelled) {
          setStatus('unavailable');
          setStatusText(
            'Habilita el flag de IA integrada en Chrome 138+.',
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
          setStatusText('Gemini Nano está disponible.');
        } else if (result === 'downloading') {
          setStatus('downloading');
          setStatusText('Descargando modelo Gemini Nano...');
        } else if (result === 'downloadable') {
          setStatus('downloadable');
          setStatusText(
            'Se requiere preparar el modelo Gemini Nano. Presiona «Prepare Model».',
          );
        } else {
          setStatus('unavailable');
          setStatusText(
            'Habilita el flag de IA integrada en Chrome 138+.',
          );
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setStatusText('Error al verificar estado de IA integrada.');
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
    setStatusText('Descargando modelo Gemini Nano...');
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
              `Descargando modelo Gemini Nano: ${progress}%`,
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
        setStatusText('Gemini Nano está disponible.');
        setDownloadProgress(null);
      })
      .catch(() => {
        if (!mountedRef.current) {
          return;
        }
        setStatus('error');
        setStatusText('Error preparando modelo Gemini Nano.');
        setDownloadProgress(null);
      })
      .finally(() => {
        preparingRef.current = false;
        if (mountedRef.current) {
          setIsPreparing(false);
        }
      });
  }, []);

  return {
    status: enabled ? status : 'checking',
    statusText: enabled ? statusText : '',
    downloadProgress: enabled ? downloadProgress : null,
    isPreparing: enabled ? isPreparing : false,
    prepareModel,
  };
}
