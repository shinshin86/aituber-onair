import { useCallback, useEffect, useState } from 'react';
import {
  getVoiceEngineVoiceList,
  type VoiceEngineVoice,
} from '@aituber-onair/core';

export function useDeepgramVoices(enabled: boolean, voiceListApiUrl: string) {
  const [voices, setVoices] = useState<VoiceEngineVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const catalog = await getVoiceEngineVoiceList('deepgram', {
          voiceListApiUrl,
        });
        if (!active) return;
        if (catalog.length > 0) setVoices(catalog);
        setError(
          catalog.length === 0
            ? 'No English Flux voices returned; keeping the current list.'
            : '',
        );
      } catch (error) {
        if (!active) return;
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [enabled, voiceListApiUrl, revision]);

  return { voices, loading, error, refresh };
}
