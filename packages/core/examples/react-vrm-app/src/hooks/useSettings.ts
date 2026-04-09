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

type ApiKeyProvider = Exclude<ChatProviderOption, 'gemini-nano'>;

const STORAGE_KEY = 'react-vrm-app-settings';
const DEFAULT_AIVIS_CLOUD_MODEL_UUID = '22e8ed77-94fe-4ef2-871f-a86f94e9a579';
const DEFAULT_GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_GEMINI_TTS_LANGUAGE_CODE = 'ja-JP';
const DEFAULT_OPENAI_COMPATIBLE_MODEL = 'local-model';
const DEFAULT_OPENAI_COMPATIBLE_ENDPOINT =
  'http://localhost:11434/v1/chat/completions';
const DEFAULT_OPENAI_COMPATIBLE_TTS_ENDPOINT =
  'http://localhost:8880/v1/audio/speech';
const DEFAULT_PIPER_PLUS_BASE_PATH = `${import.meta.env.BASE_URL}piper/`;
const DEFAULT_PIPER_PLUS_MODEL_CONFIG_FILE = 'tsukuyomi-config.json';
const DEFAULT_PIPER_PLUS_MODEL_FILE = 'tsukuyomi-wavlm-300epoch.onnx';
const DEFAULT_PIPER_PLUS_VOICE_FILE = 'mei_normal.htsvoice';
const DEFAULT_OPENROUTER_MAX_CANDIDATES = 1;
const DEFAULT_OPENROUTER_MAX_WORKING = 10;
const EMPTY_MODEL_IDS: string[] = [];

function getOrderedModels(provider: ChatProviderOption): string[] {
  const models = AITuberOnAirCore.getSupportedModels(provider);
  if (provider === 'claude') {
    return [...models].reverse();
  }
  return models;
}

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
  value: AppSettings['llm']['openRouterDynamicFreeModels'] | undefined,
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
        'openai-compatible': '',
        openrouter: '',
        gemini: '',
        claude: '',
        zai: '',
        kimi: '',
        xai: '',
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
      openAiCompatibleApiKey: '',
      openAiCompatibleApiUrl: DEFAULT_OPENAI_COMPATIBLE_TTS_ENDPOINT,
      openAiCompatibleModel: DEFAULT_OPENAI_COMPATIBLE_MODEL,
      openAiCompatibleSpeed: '',
      geminiTtsModel: DEFAULT_GEMINI_TTS_MODEL,
      geminiTtsLanguageCode: DEFAULT_GEMINI_TTS_LANGUAGE_CODE,
      geminiTtsPrompt: '',
      aivisCloudApiKey: '',
      aivisCloudModelUuid: DEFAULT_AIVIS_CLOUD_MODEL_UUID,
      aivisCloudSpeakerUuid: '',
      aivisCloudStyleId: '',
      minimaxApiKey: '',
      minimaxGroupId: '',
      xaiLanguage: 'auto',
      xaiCodec: 'mp3',
      xaiSampleRate: 24000,
      xaiBitRate: 128000,
      piperPlusBasePath: DEFAULT_PIPER_PLUS_BASE_PATH,
      piperPlusModelConfigFile: DEFAULT_PIPER_PLUS_MODEL_CONFIG_FILE,
      piperPlusModelFile: DEFAULT_PIPER_PLUS_MODEL_FILE,
      piperPlusVoiceFile: DEFAULT_PIPER_PLUS_VOICE_FILE,
      piperPlusSpeed: '',
      piperPlusNoiseScale: '',
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
    () => settings.llm.openRouterDynamicFreeModels?.models || EMPTY_MODEL_IDS,
    [settings.llm.openRouterDynamicFreeModels?.models],
  );

  const availableModels = useMemo(() => {
    const models = getOrderedModels(settings.llm.provider);
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
      const baseModels = getOrderedModels(provider);
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
      if (provider === 'gemini-nano') {
        return;
      }
      setSettings((prev) => ({
        ...prev,
        llm: {
          ...prev.llm,
          apiKeys: {
            ...prev.llm.apiKeys,
            [provider as ApiKeyProvider]: key,
          },
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
      geminiTts: 'Zephyr',
      openaiCompatible: '',
      voicepeak: 'f1',
      voicevox: '',
      aivisSpeech: '',
      aivisCloud: DEFAULT_AIVIS_CLOUD_MODEL_UUID,
      minimax: 'male-qn-qingse',
      xai: 'eve',
      piperPlus: 'default',
      none: '',
    };
    setSettings((prev) => ({
      ...prev,
      tts: {
        ...prev.tts,
        engine,
        speaker: defaultSpeaker[engine] ?? '',
        openAiCompatibleApiUrl:
          engine === 'openaiCompatible'
            ? prev.tts.openAiCompatibleApiUrl ||
              DEFAULT_OPENAI_COMPATIBLE_TTS_ENDPOINT
            : prev.tts.openAiCompatibleApiUrl,
        openAiCompatibleModel:
          engine === 'openaiCompatible'
            ? prev.tts.openAiCompatibleModel || DEFAULT_OPENAI_COMPATIBLE_MODEL
            : prev.tts.openAiCompatibleModel,
        openAiCompatibleSpeed:
          engine === 'openaiCompatible'
            ? prev.tts.openAiCompatibleSpeed || ''
            : prev.tts.openAiCompatibleSpeed,
        geminiTtsModel:
          engine === 'geminiTts'
            ? prev.tts.geminiTtsModel || DEFAULT_GEMINI_TTS_MODEL
            : prev.tts.geminiTtsModel,
        geminiTtsLanguageCode:
          engine === 'geminiTts'
            ? prev.tts.geminiTtsLanguageCode ||
              DEFAULT_GEMINI_TTS_LANGUAGE_CODE
            : prev.tts.geminiTtsLanguageCode,
        geminiTtsPrompt:
          engine === 'geminiTts'
            ? prev.tts.geminiTtsPrompt || ''
            : prev.tts.geminiTtsPrompt,
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
        xaiLanguage:
          engine === 'xai'
            ? prev.tts.xaiLanguage || 'auto'
            : prev.tts.xaiLanguage,
        xaiCodec:
          engine === 'xai' ? prev.tts.xaiCodec || 'mp3' : prev.tts.xaiCodec,
        xaiSampleRate:
          engine === 'xai'
            ? prev.tts.xaiSampleRate || 24000
            : prev.tts.xaiSampleRate,
        xaiBitRate:
          engine === 'xai' ? prev.tts.xaiBitRate || 128000 : prev.tts.xaiBitRate,
        piperPlusBasePath:
          engine === 'piperPlus'
            ? prev.tts.piperPlusBasePath || DEFAULT_PIPER_PLUS_BASE_PATH
            : prev.tts.piperPlusBasePath,
        piperPlusModelConfigFile:
          engine === 'piperPlus'
            ? prev.tts.piperPlusModelConfigFile ||
              DEFAULT_PIPER_PLUS_MODEL_CONFIG_FILE
            : prev.tts.piperPlusModelConfigFile,
        piperPlusModelFile:
          engine === 'piperPlus'
            ? prev.tts.piperPlusModelFile || DEFAULT_PIPER_PLUS_MODEL_FILE
            : prev.tts.piperPlusModelFile,
        piperPlusVoiceFile:
          engine === 'piperPlus'
            ? prev.tts.piperPlusVoiceFile || DEFAULT_PIPER_PLUS_VOICE_FILE
            : prev.tts.piperPlusVoiceFile,
        piperPlusSpeed:
          engine === 'piperPlus'
            ? prev.tts.piperPlusSpeed || ''
            : prev.tts.piperPlusSpeed,
        piperPlusNoiseScale:
          engine === 'piperPlus'
            ? prev.tts.piperPlusNoiseScale || ''
            : prev.tts.piperPlusNoiseScale,
      },
    }));
  }, []);

  const updateTTSSpeaker = useCallback((speaker: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, speaker },
    }));
  }, []);

  const updateOpenAiCompatibleApiKey = useCallback((key: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, openAiCompatibleApiKey: key },
    }));
  }, []);

  const updateOpenAiCompatibleApiUrl = useCallback((url: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, openAiCompatibleApiUrl: url },
    }));
  }, []);

  const updateOpenAiCompatibleModel = useCallback((model: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, openAiCompatibleModel: model },
    }));
  }, []);

  const updateOpenAiCompatibleSpeed = useCallback((speed: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, openAiCompatibleSpeed: speed },
    }));
  }, []);

  const updateGeminiTtsModel = useCallback((model: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, geminiTtsModel: model },
    }));
  }, []);

  const updateGeminiTtsLanguageCode = useCallback((languageCode: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, geminiTtsLanguageCode: languageCode },
    }));
  }, []);

  const updateGeminiTtsPrompt = useCallback((prompt: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, geminiTtsPrompt: prompt },
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

  const updateXaiLanguage = useCallback((language: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, xaiLanguage: language },
    }));
  }, []);

  const updateXaiCodec = useCallback((codec: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, xaiCodec: codec },
    }));
  }, []);

  const updateXaiSampleRate = useCallback((sampleRate: number) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, xaiSampleRate: sampleRate },
    }));
  }, []);

  const updateXaiBitRate = useCallback((bitRate: number) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, xaiBitRate: bitRate },
    }));
  }, []);

  const updatePiperPlusBasePath = useCallback((basePath: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, piperPlusBasePath: basePath },
    }));
  }, []);

  const updatePiperPlusModelConfigFile = useCallback((modelConfigFile: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, piperPlusModelConfigFile: modelConfigFile },
    }));
  }, []);

  const updatePiperPlusModelFile = useCallback((modelFile: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, piperPlusModelFile: modelFile },
    }));
  }, []);

  const updatePiperPlusVoiceFile = useCallback((voiceFile: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, piperPlusVoiceFile: voiceFile },
    }));
  }, []);

  const updatePiperPlusSpeed = useCallback((speed: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, piperPlusSpeed: speed },
    }));
  }, []);

  const updatePiperPlusNoiseScale = useCallback((noiseScale: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, piperPlusNoiseScale: noiseScale },
    }));
  }, []);

  const getApiKeyForProvider = useCallback(
    (provider: ChatProviderOption): string => {
      if (provider === 'gemini-nano') {
        return '';
      }
      return settings.llm.apiKeys[provider as ApiKeyProvider] || '';
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
    updateOpenAiCompatibleApiKey,
    updateOpenAiCompatibleApiUrl,
    updateOpenAiCompatibleModel,
    updateOpenAiCompatibleSpeed,
    updateGeminiTtsModel,
    updateGeminiTtsLanguageCode,
    updateGeminiTtsPrompt,
    updateVoicevoxApiUrl,
    updateVoicepeakApiUrl,
    updateAivisSpeechApiUrl,
    updateAivisCloudApiKey,
    updateAivisCloudModelUuid,
    updateAivisCloudSpeakerUuid,
    updateAivisCloudStyleId,
    updateMinimaxApiKey,
    updateMinimaxGroupId,
    updateXaiLanguage,
    updateXaiCodec,
    updateXaiSampleRate,
    updateXaiBitRate,
    updatePiperPlusBasePath,
    updatePiperPlusModelConfigFile,
    updatePiperPlusModelFile,
    updatePiperPlusVoiceFile,
    updatePiperPlusSpeed,
    updatePiperPlusNoiseScale,
    getApiKeyForProvider,
  };
}
