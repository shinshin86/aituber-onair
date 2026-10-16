import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type KeyedProvider,
  PROVIDERS,
  type Provider,
  getProvider,
} from '../lib/providers';

export type VoiceKind = 'webSpeech' | 'piperPlus';

/**
 * Settings persisted in this browser only. API keys are included so a visitor
 * does not have to re-enter them; they never leave the browser except in the
 * requests to the provider the visitor chose.
 *
 * Grouped by concern so new areas (another TTS engine, avatar options) can be
 * added as new top-level groups without touching the others. Bump `version`
 * and extend `migrate()` when a stored shape changes; anything else stored
 * under this key is ignored.
 */
export interface DemoSettings {
  version: 1;
  llm: {
    provider: Provider;
    apiKeys: Partial<Record<KeyedProvider, string>>;
    openaiCompatible: {
      /** Origin, `/v1` base, or full chat completions URL */
      endpoint: string;
      model: string;
    };
  };
  voice: {
    engine: VoiceKind;
    /** Web Speech voice name; empty picks the best Japanese voice automatically */
    webSpeechVoice: string;
    /** Speaking speed of the Miko voice (piper-plus length scale inverse) */
    piperSpeed: number;
  };
}

const STORAGE_KEY = 'aituber-onair-mesh-avatar-chat';

export const DEFAULT_PIPER_SPEED = 0.9;
export const PIPER_SPEED_RANGE = { min: 0.7, max: 1.2, step: 0.05 };

export const DEFAULT_SETTINGS: DemoSettings = {
  version: 1,
  llm: {
    provider: 'gemini-nano',
    apiKeys: {},
    openaiCompatible: { endpoint: '', model: '' },
  },
  voice: {
    engine: 'webSpeech',
    webSpeechVoice: '',
    piperSpeed: DEFAULT_PIPER_SPEED,
  },
};

function migrate(raw: unknown): DemoSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const stored = raw as Partial<DemoSettings>;
  if (stored.version !== 1) return DEFAULT_SETTINGS;
  return {
    version: 1,
    llm: {
      ...DEFAULT_SETTINGS.llm,
      ...stored.llm,
      apiKeys: { ...stored.llm?.apiKeys },
      openaiCompatible: {
        ...DEFAULT_SETTINGS.llm.openaiCompatible,
        ...stored.llm?.openaiCompatible,
      },
    },
    voice: { ...DEFAULT_SETTINGS.voice, ...stored.voice },
  };
}

function load(): DemoSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const settings = migrate(raw ? JSON.parse(raw) : null);
    // A provider this build no longer offers falls back to the default.
    if (!PROVIDERS.some((provider) => provider.id === settings.llm.provider)) {
      settings.llm.provider = DEFAULT_SETTINGS.llm.provider;
    }
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<DemoSettings>(load);
  const skipPersistRef = useRef(false);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage may be unavailable (private mode); keep in memory
    }
  }, [settings]);

  /** Removes everything this page saved in localStorage and returns to defaults. */
  const clearStored = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing to remove
    }
    skipPersistRef.current = true;
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const updateLlm = useCallback((patch: Partial<DemoSettings['llm']>) => {
    setSettings((prev) => ({ ...prev, llm: { ...prev.llm, ...patch } }));
  }, []);

  const updateVoice = useCallback((patch: Partial<DemoSettings['voice']>) => {
    setSettings((prev) => ({ ...prev, voice: { ...prev.voice, ...patch } }));
  }, []);

  const setApiKey = useCallback((provider: KeyedProvider, key: string) => {
    setSettings((prev) => ({
      ...prev,
      llm: { ...prev.llm, apiKeys: { ...prev.llm.apiKeys, [provider]: key } },
    }));
  }, []);

  const setOpenaiCompatible = useCallback(
    (patch: Partial<DemoSettings['llm']['openaiCompatible']>) => {
      setSettings((prev) => ({
        ...prev,
        llm: {
          ...prev.llm,
          openaiCompatible: { ...prev.llm.openaiCompatible, ...patch },
        },
      }));
    },
    [],
  );

  const provider = getProvider(settings.llm.provider);
  const apiKey =
    provider.auth === 'apiKey'
      ? (
          settings.llm.apiKeys[settings.llm.provider as KeyedProvider] ?? ''
        ).trim()
      : '';

  return {
    settings,
    updateLlm,
    updateVoice,
    setApiKey,
    setOpenaiCompatible,
    clearStored,
    apiKey,
  };
}
