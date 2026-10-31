import { useCallback, useEffect, useState } from 'react';
import {
  getVoiceEngineVoiceList,
  type VoiceEngineVoice,
} from '@aituber-onair/core';

export const DEEPGRAM_PRESET_VOICES: VoiceEngineVoice[] = [
  { id: 'flux-haley-en', label: 'Haley (English)' },
  { id: 'flux-ayumi-ja', label: 'Ayumi (Japanese)' },
  { id: 'flux-hayato-ja', label: 'Hayato (Japanese)' },
  { id: 'flux-nozomi-ja', label: 'Nozomi (Japanese)' },
  { id: 'flux-sayaka-ja', label: 'Sayaka (Japanese)' },
];

export function getDeepgramVoiceOptions(
  catalog: VoiceEngineVoice[],
  savedVoice: string,
): VoiceEngineVoice[] {
  const voices = [...DEEPGRAM_PRESET_VOICES];
  const seen = new Set(voices.map((voice) => voice.id));
  for (const voice of catalog) {
    if (/^flux-[a-z0-9-]+-(en|ja)$/.test(voice.id) && !seen.has(voice.id)) {
      voices.push(voice);
      seen.add(voice.id);
    }
  }
  if (savedVoice && !seen.has(savedVoice)) {
    voices.push({ id: savedVoice, label: `${savedVoice} (saved voice)` });
  }
  return voices;
}

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
            ? 'No English or Japanese Flux voices returned; keeping the current list.'
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
