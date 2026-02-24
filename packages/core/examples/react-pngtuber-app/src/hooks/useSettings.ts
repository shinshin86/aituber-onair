import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AITuberOnAirCore,
  refreshOpenRouterFreeModels,
  type RefreshOpenRouterFreeModelsResult,
} from '@aituber-onair/core';
import type {
  AppSettings,
  ChatProviderOption,
  TTSEngineOption,
} from '../types/settings';

const STORAGE_KEY = 'react-pngtuber-app-settings';
const DEFAULT_AIVIS_CLOUD_MODEL_UUID = '22e8ed77-94fe-4ef2-871f-a86f94e9a579';
const DEFAULT_OPENAI_COMPATIBLE_MODEL = 'local-model';
const DEFAULT_OPENAI_COMPATIBLE_ENDPOINT =
  'http://localhost:11434/v1/chat/completions';
const DEFAULT_OPENROUTER_MAX_CANDIDATES = 1;
const DEFAULT_OPENROUTER_MAX_WORKING = 10;
const EMPTY_MODEL_IDS: string[] = [];

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

function normalizeModelIds(modelIds: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const modelId of modelIds) {
    const trimmed = modelId.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function mergeModelIds(base: string[], extras: string[]): string[] {
  const merged = [...base];
  const seen = new Set(base);

  for (const modelId of extras) {
    const trimmed = modelId.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    merged.push(trimmed);
  }

  return merged;
}

function normalizeOpenRouterDynamicFreeModels(
  value:
    | AppSettings['llm']['openRouterDynamicFreeModels']
    | undefined,
): NonNullable<AppSettings['llm']['openRouterDynamicFreeModels']> {
  return {
    models: normalizeModelIds(value?.models || []),
    fetchedAt:
      typeof value?.fetchedAt === 'number' && Number.isFinite(value.fetchedAt)
        ? value.fetchedAt
        : 0,
    maxCandidates: normalizePositiveInteger(
      value?.maxCandidates,
      DEFAULT_OPENROUTER_MAX_CANDIDATES,
    ),
  };
}

function getDefaultSettings(): AppSettings {
  return {
    llm: {
      provider: 'openai',
      model: 'gpt-4.1-nano',
      endpoint: DEFAULT_OPENAI_COMPATIBLE_ENDPOINT,
      apiKeys: {
        openai: '',
        zai: '',
        'openai-compatible': '',
      },
      openRouterDynamicFreeModels: {
        models: [],
        fetchedAt: 0,
        maxCandidates: DEFAULT_OPENROUTER_MAX_CANDIDATES,
      },
    },
    tts: {
      engine: 'openai' as TTSEngineOption,
      speaker: 'alloy',
      aivisCloudApiKey: '',
      aivisCloudModelUuid: DEFAULT_AIVIS_CLOUD_MODEL_UUID,
      aivisCloudSpeakerUuid: '',
      aivisCloudStyleId: '',
      minimaxApiKey: '',
      minimaxGroupId: '',
    },
  };
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppSettings>;
      const defaults = getDefaultSettings();
      return {
        llm: {
          ...defaults.llm,
          ...saved.llm,
          apiKeys: { ...defaults.llm.apiKeys, ...saved.llm?.apiKeys },
          openRouterDynamicFreeModels: normalizeOpenRouterDynamicFreeModels(
            saved.llm?.openRouterDynamicFreeModels,
          ),
        },
        tts: { ...defaults.tts, ...saved.tts },
      };
    }
  } catch {
    // ignore parse errors
  }
  return getDefaultSettings();
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [openRouterRefreshError, setOpenRouterRefreshError] = useState('');
  const [
    isRefreshingOpenRouterFreeModels,
    setIsRefreshingOpenRouterFreeModels,
  ] = useState(false);
  const openRouterDynamicModels = useMemo(
    () =>
      settings.llm.openRouterDynamicFreeModels?.models || EMPTY_MODEL_IDS,
    [settings.llm.openRouterDynamicFreeModels?.models],
  );

  const availableModels = useMemo(() => {
    const models = AITuberOnAirCore.getSupportedModels(settings.llm.provider);
    if (settings.llm.provider === 'openrouter') {
      return mergeModelIds(models, openRouterDynamicModels);
    }
    if (settings.llm.provider !== 'openai-compatible') {
      return models;
    }
    if (settings.llm.model) {
      return [settings.llm.model];
    }
    return [DEFAULT_OPENAI_COMPATIBLE_MODEL];
  }, [settings.llm.provider, settings.llm.model, openRouterDynamicModels]);

  // Persist settings on change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateLLMProvider = useCallback(
    (provider: ChatProviderOption) => {
      const baseModels = AITuberOnAirCore.getSupportedModels(provider);
      const models =
        provider === 'openrouter'
          ? mergeModelIds(baseModels, openRouterDynamicModels)
          : baseModels;
      const nextModel =
        provider === 'openai-compatible'
          ? DEFAULT_OPENAI_COMPATIBLE_MODEL
          : models[0] || '';
      setSettings((prev) => ({
        ...prev,
        llm: {
          ...prev.llm,
          provider,
          model: nextModel,
          endpoint:
            provider === 'openai-compatible'
              ? prev.llm.endpoint || DEFAULT_OPENAI_COMPATIBLE_ENDPOINT
              : prev.llm.endpoint,
        },
      }));
    },
    [openRouterDynamicModels],
  );

  const updateLLMModel = useCallback((model: string) => {
    setSettings((prev) => ({
      ...prev,
      llm: { ...prev.llm, model },
    }));
  }, []);

  const updateLLMApiKey = useCallback(
    (provider: ChatProviderOption, key: string) => {
      setSettings((prev) => ({
        ...prev,
        llm: {
          ...prev.llm,
          apiKeys: { ...prev.llm.apiKeys, [provider]: key },
        },
      }));
    },
    [],
  );

  const updateLLMEndpoint = useCallback((endpoint: string) => {
    setSettings((prev) => ({
      ...prev,
      llm: { ...prev.llm, endpoint },
    }));
  }, []);

  const refreshOpenRouterDynamicFreeModels = useCallback(async () => {
    const apiKey = settings.llm.apiKeys.openrouter?.trim() || '';
    if (!apiKey) {
      const message = 'OpenRouter API key is required.';
      setOpenRouterRefreshError(message);
      return null;
    }

    setIsRefreshingOpenRouterFreeModels(true);
    setOpenRouterRefreshError('');

    try {
      const maxCandidates = normalizePositiveInteger(
        settings.llm.openRouterDynamicFreeModels?.maxCandidates,
        DEFAULT_OPENROUTER_MAX_CANDIDATES,
      );
      const result: RefreshOpenRouterFreeModelsResult =
        await refreshOpenRouterFreeModels({
          apiKey,
          maxCandidates,
          maxWorking: DEFAULT_OPENROUTER_MAX_WORKING,
        });

      setSettings((prev) => ({
        ...prev,
        llm: {
          ...prev.llm,
          openRouterDynamicFreeModels: {
            ...normalizeOpenRouterDynamicFreeModels(
              prev.llm.openRouterDynamicFreeModels,
            ),
            models: normalizeModelIds(result.working),
            fetchedAt: result.fetchedAt,
          },
        },
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOpenRouterRefreshError(message);
      return null;
    } finally {
      setIsRefreshingOpenRouterFreeModels(false);
    }
  }, [
    settings.llm.apiKeys.openrouter,
    settings.llm.openRouterDynamicFreeModels?.maxCandidates,
  ]);

  const updateOpenRouterMaxCandidates = useCallback((maxCandidates: number) => {
    const normalized = normalizePositiveInteger(
      maxCandidates,
      DEFAULT_OPENROUTER_MAX_CANDIDATES,
    );
    setSettings((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        openRouterDynamicFreeModels: {
          ...normalizeOpenRouterDynamicFreeModels(
            prev.llm.openRouterDynamicFreeModels,
          ),
          maxCandidates: normalized,
        },
      },
    }));
  }, []);

  const updateTTSEngine = useCallback((engine: TTSEngineOption) => {
    const defaultSpeaker: Record<string, string> = {
      openai: 'alloy',
      voicepeak: 'f1',
      voicevox: '',
      aivisSpeech: '',
      aivisCloud: DEFAULT_AIVIS_CLOUD_MODEL_UUID,
      minimax: 'male-qn-qingse',
      none: '',
    };
    setSettings((prev) => ({
      ...prev,
      tts: {
        ...prev.tts,
        engine,
        speaker: defaultSpeaker[engine] ?? '',
        aivisCloudModelUuid:
          engine === 'aivisCloud'
            ? prev.tts.aivisCloudModelUuid || DEFAULT_AIVIS_CLOUD_MODEL_UUID
            : prev.tts.aivisCloudModelUuid,
        aivisCloudSpeakerUuid:
          engine === 'aivisCloud'
            ? prev.tts.aivisCloudSpeakerUuid || ''
            : prev.tts.aivisCloudSpeakerUuid,
        aivisCloudStyleId:
          engine === 'aivisCloud'
            ? prev.tts.aivisCloudStyleId || ''
            : prev.tts.aivisCloudStyleId,
      },
    }));
  }, []);

  const updateTTSSpeaker = useCallback((speaker: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, speaker },
    }));
  }, []);

  const updateVoicevoxApiUrl = useCallback((url: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, voicevoxApiUrl: url },
    }));
  }, []);

  const updateVoicepeakApiUrl = useCallback((url: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, voicepeakApiUrl: url },
    }));
  }, []);

  const updateAivisSpeechApiUrl = useCallback((url: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, aivisSpeechApiUrl: url },
    }));
  }, []);

  const updateAivisCloudApiKey = useCallback((key: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, aivisCloudApiKey: key },
    }));
  }, []);

  const updateAivisCloudModelUuid = useCallback((modelUuid: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, aivisCloudModelUuid: modelUuid },
    }));
  }, []);

  const updateAivisCloudSpeakerUuid = useCallback((speakerUuid: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, aivisCloudSpeakerUuid: speakerUuid },
    }));
  }, []);

  const updateAivisCloudStyleId = useCallback((styleId: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, aivisCloudStyleId: styleId },
    }));
  }, []);

  const updateMinimaxApiKey = useCallback((key: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, minimaxApiKey: key },
    }));
  }, []);

  const updateMinimaxGroupId = useCallback((groupId: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, minimaxGroupId: groupId },
    }));
  }, []);

  const getApiKeyForProvider = useCallback(
    (provider: ChatProviderOption): string => {
      return settings.llm.apiKeys[provider] || '';
    },
    [settings.llm.apiKeys],
  );

  return {
    settings,
    availableModels,
    updateLLMProvider,
    updateLLMModel,
    updateLLMApiKey,
    updateLLMEndpoint,
    refreshOpenRouterDynamicFreeModels,
    isRefreshingOpenRouterFreeModels,
    openRouterRefreshError,
    updateOpenRouterMaxCandidates,
    updateTTSEngine,
    updateTTSSpeaker,
    updateVoicevoxApiUrl,
    updateVoicepeakApiUrl,
    updateAivisSpeechApiUrl,
    updateAivisCloudApiKey,
    updateAivisCloudModelUuid,
    updateAivisCloudSpeakerUuid,
    updateAivisCloudStyleId,
    updateMinimaxApiKey,
    updateMinimaxGroupId,
    getApiKeyForProvider,
  };
}
