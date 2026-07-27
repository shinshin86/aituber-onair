import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Language } from './i18n';
import {
  buildSupportSystemPrompt,
  getGeminiNanoLanguageOptions,
} from './support';

export type GeminiNanoStatus =
  | 'checking'
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'promptTooLarge'
  | 'error';

interface LanguageModelMonitor {
  addEventListener(
    event: 'downloadprogress',
    handler: (event: { loaded: number }) => void,
  ): void;
}

interface LanguageModelSession {
  destroy(): void;
}

interface LanguageModelAPI {
  availability(options: Record<string, unknown>): Promise<string>;
  create(
    options: Record<string, unknown> & {
      monitor?: (monitor: LanguageModelMonitor) => void;
    },
  ): Promise<LanguageModelSession>;
}

const getLanguageModel = (): LanguageModelAPI | undefined =>
  (globalThis as Record<string, unknown>).LanguageModel as
    | LanguageModelAPI
    | undefined;

const isQuotaExceededError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  error.name === 'QuotaExceededError';

export const useGeminiNanoStatus = (language: Language) => {
  const [status, setStatus] = useState<GeminiNanoStatus>('checking');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const requestSequence = useRef(0);
  const options = useMemo(
    () => getGeminiNanoLanguageOptions(language),
    [language],
  );

  const checkAvailability = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setStatus('checking');
    setDownloadProgress(null);

    const languageModel = getLanguageModel();
    if (!languageModel) {
      setStatus('unavailable');
      return;
    }

    try {
      const result = await languageModel.availability({
        expectedInputs: [
          { type: 'text', languages: options.expectedInputLanguages },
        ],
        expectedOutputs: [
          { type: 'text', languages: options.expectedOutputLanguages },
        ],
      });
      if (requestId !== requestSequence.current) return;

      if (
        result === 'available' ||
        result === 'downloadable' ||
        result === 'downloading'
      ) {
        setStatus(result);
      } else {
        setStatus('unavailable');
      }
    } catch {
      if (requestId === requestSequence.current) setStatus('error');
    }
  }, [options]);

  useEffect(() => {
    void checkAvailability();
    return () => {
      requestSequence.current += 1;
    };
  }, [checkAvailability]);

  const prepareModel = useCallback(() => {
    if (isPreparing) return;

    const languageModel = getLanguageModel();
    if (!languageModel) {
      setStatus('unavailable');
      return;
    }

    const requestId = ++requestSequence.current;
    setIsPreparing(true);
    setStatus('downloading');
    setDownloadProgress(0);

    void languageModel
      .create({
        expectedInputs: [
          { type: 'text', languages: options.expectedInputLanguages },
        ],
        expectedOutputs: [
          { type: 'text', languages: options.expectedOutputLanguages },
        ],
        initialPrompts: [
          { role: 'system', content: buildSupportSystemPrompt(language) },
        ],
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', (event) => {
            if (requestId !== requestSequence.current) return;
            setDownloadProgress(Math.round((event.loaded || 0) * 100));
          });
        },
      })
      .then((session) => {
        try {
          session.destroy();
        } catch {
          // Ignore cleanup failures from an already-closed session.
        }
        if (requestId !== requestSequence.current) return;
        setStatus('available');
        setDownloadProgress(null);
      })
      .catch((error: unknown) => {
        if (requestId !== requestSequence.current) return;
        setStatus(isQuotaExceededError(error) ? 'promptTooLarge' : 'error');
        setDownloadProgress(null);
      })
      .finally(() => {
        if (requestId === requestSequence.current) setIsPreparing(false);
      });
  }, [isPreparing, language, options]);

  return {
    status,
    downloadProgress,
    isPreparing,
    prepareModel,
    checkAvailability,
  };
};
