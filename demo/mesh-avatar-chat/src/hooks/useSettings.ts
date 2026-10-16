import { useCallback, useEffect, useState } from 'react';

export type Provider = 'gemini-nano' | 'openai' | 'gemini' | 'claude';
export type KeyedProvider = Exclude<Provider, 'gemini-nano'>;
export type VoiceKind = 'webSpeech' | 'piperPlus';

export interface DemoSettings {
  provider: Provider;
  apiKeys: Record<KeyedProvider, string>;
  voice: VoiceKind;
  /** Web Speech voice name; empty picks the best Japanese voice automatically */
  webSpeechVoice: string;
  /** Speaking speed of the Miko voice (piper-plus length scale inverse) */
  piperSpeed: number;
}

export const DEFAULT_PIPER_SPEED = 0.9;
export const PIPER_SPEED_RANGE = { min: 0.7, max: 1.2, step: 0.05 };

const STORAGE_KEY = 'aituber-onair-mesh-avatar-chat';

export const DEFAULT_SETTINGS: DemoSettings = {
  provider: 'gemini-nano',
  apiKeys: { openai: '', gemini: '', claude: '' },
  voice: 'webSpeech',
  webSpeechVoice: '',
  piperSpeed: DEFAULT_PIPER_SPEED,
};

function load(): DemoSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DemoSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...(parsed.apiKeys ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Settings persisted in this browser only (API keys included). */
export function useSettings() {
  const [settings, setSettings] = useState<DemoSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage may be unavailable (private mode); keep in memory
    }
  }, [settings]);

  const update = useCallback((patch: Partial<DemoSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const setApiKey = useCallback((provider: KeyedProvider, key: string) => {
    setSettings((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: key },
    }));
  }, []);

  const apiKey =
    settings.provider === 'gemini-nano'
      ? ''
      : settings.apiKeys[settings.provider].trim();

  return { settings, update, setApiKey, apiKey };
}
