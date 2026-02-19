import { useState, useEffect, useCallback, useMemo } from 'react';
import { AITuberOnAirCore } from '@aituber-onair/core';
import type {
  AppSettings,
  ChatProviderOption,
  TTSEngineOption,
} from '../types/settings';

const STORAGE_KEY = 'pngtuber-settings';
const DEFAULT_AIVIS_CLOUD_MODEL_UUID = '22e8ed77-94fe-4ef2-871f-a86f94e9a579';
const DEFAULT_OPENAI_COMPATIBLE_MODEL = 'local-model';
const DEFAULT_OPENAI_COMPATIBLE_ENDPOINT =
  'http://localhost:11434/v1/chat/completions';

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
        llm: { ...defaults.llm, ...saved.llm, apiKeys: { ...defaults.llm.apiKeys, ...saved.llm?.apiKeys } },
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
  const availableModels = useMemo(() => {
    const models = AITuberOnAirCore.getSupportedModels(settings.llm.provider);
    if (settings.llm.provider !== 'openai-compatible') {
      return models;
    }
    if (settings.llm.model) {
      return [settings.llm.model];
    }
    return [DEFAULT_OPENAI_COMPATIBLE_MODEL];
  }, [settings.llm.provider, settings.llm.model]);

  // Persist settings on change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateLLMProvider = useCallback((provider: ChatProviderOption) => {
    const models = AITuberOnAirCore.getSupportedModels(provider);
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
  }, []);

  const updateLLMModel = useCallback((model: string) => {
    setSettings((prev) => ({
      ...prev,
      llm: { ...prev.llm, model },
    }));
  }, []);

  const updateLLMApiKey = useCallback((provider: ChatProviderOption, key: string) => {
    setSettings((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        apiKeys: { ...prev.llm.apiKeys, [provider]: key },
      },
    }));
  }, []);

  const updateLLMEndpoint = useCallback((endpoint: string) => {
    setSettings((prev) => ({
      ...prev,
      llm: { ...prev.llm, endpoint },
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
          engine === 'aivisCloud' ? prev.tts.aivisCloudSpeakerUuid || '' : prev.tts.aivisCloudSpeakerUuid,
        aivisCloudStyleId:
          engine === 'aivisCloud' ? prev.tts.aivisCloudStyleId || '' : prev.tts.aivisCloudStyleId,
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
