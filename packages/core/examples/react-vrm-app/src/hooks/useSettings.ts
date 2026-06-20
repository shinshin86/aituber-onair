import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AITuberOnAirCore,
  refreshOpenRouterFreeModels,
  type RefreshOpenRouterFreeModelsResult,
} from '@aituber-onair/core';
import type {
  AppSettings,
  ChatProviderOption,
  StreamingPlatformOption,
  TTSEngineOption,
} from '../types/settings';

type ApiKeyProvider = Exclude<ChatProviderOption, 'gemini-nano'>;

const STORAGE_KEY = 'react-vrm-app-settings';
const DEFAULT_AIVIS_CLOUD_MODEL_UUID = '22e8ed77-94fe-4ef2-871f-a86f94e9a579';
const DEFAULT_GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const DEFAULT_GEMINI_TTS_LANGUAGE_CODE = 'ja-JP';
const DEFAULT_OPENAI_COMPATIBLE_MODEL = 'local-model';
const DEFAULT_OPENAI_COMPATIBLE_ENDPOINT =
  'http://localhost:11434/v1/chat/completions';
const DEFAULT_OPENAI_COMPATIBLE_TTS_ENDPOINT =
  'http://localhost:8880/v1/audio/speech';
const DEFAULT_UNREAL_SPEECH_TTS_ENDPOINT =
  'https://api.v8.unrealspeech.com/stream';
const DEFAULT_ELEVENLABS_TTS_ENDPOINT =
  'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2';
const DEFAULT_ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128';
const DEFAULT_INWORLD_TTS_ENDPOINT = 'https://api.inworld.ai/tts/v1/voice';
const DEFAULT_INWORLD_MODEL = 'inworld-tts-2';
const DEFAULT_INWORLD_AUDIO_ENCODING = 'MP3';
const DEFAULT_INWORLD_SAMPLE_RATE_HERTZ = '48000';
const DEFAULT_INWORLD_LANGUAGE = 'ja-JP';
const DEFAULT_GRADIUM_TTS_ENDPOINT =
  'https://api.gradium.ai/api/post/speech/tts';
const DEFAULT_GRADIUM_OUTPUT_FORMAT = 'wav';
const DEFAULT_PIPER_PLUS_BASE_PATH = `${import.meta.env.BASE_URL}piper/`;
const DEFAULT_PIPER_PLUS_MODEL_CONFIG_FILE = 'tsukuyomi-config.json';
const DEFAULT_PIPER_PLUS_MODEL_FILE = 'tsukuyomi-wavlm-300epoch.onnx';
const DEFAULT_PIPER_PLUS_VOICE_FILE = 'mei_normal.htsvoice';
const DEFAULT_OPENROUTER_MAX_CANDIDATES = 1;
const DEFAULT_OPENROUTER_MAX_WORKING = 10;
const DEFAULT_SCREEN_VISION_PROMPT =
  'OBS仮想カメラの画面を見て、配信者として短く自然にコメントしてください。';
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
        deepseek: '',
        mistral: '',
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
      unrealSpeechApiKey: '',
      unrealSpeechApiUrl: DEFAULT_UNREAL_SPEECH_TTS_ENDPOINT,
      unrealSpeechBitrate: '192k',
      unrealSpeechSpeed: '',
      unrealSpeechPitch: '',
      unrealSpeechCodec: 'libmp3lame',
      unrealSpeechTemperature: '',
      elevenLabsApiKey: '',
      elevenLabsApiUrl: DEFAULT_ELEVENLABS_TTS_ENDPOINT,
      elevenLabsModel: DEFAULT_ELEVENLABS_MODEL,
      elevenLabsOutputFormat: DEFAULT_ELEVENLABS_OUTPUT_FORMAT,
      elevenLabsLanguageCode: '',
      elevenLabsStability: '',
      elevenLabsSimilarityBoost: '',
      elevenLabsStyle: '',
      elevenLabsUseSpeakerBoost: 'default',
      elevenLabsSpeed: '',
      elevenLabsSeed: '',
      elevenLabsApplyTextNormalization: 'default',
      inworldApiKey: '',
      inworldApiUrl: DEFAULT_INWORLD_TTS_ENDPOINT,
      inworldModel: DEFAULT_INWORLD_MODEL,
      inworldAudioEncoding: DEFAULT_INWORLD_AUDIO_ENCODING,
      inworldSampleRateHertz: DEFAULT_INWORLD_SAMPLE_RATE_HERTZ,
      inworldBitRate: '',
      inworldSpeakingRate: '',
      inworldLanguage: DEFAULT_INWORLD_LANGUAGE,
      inworldDeliveryMode: 'default',
      inworldTemperature: '',
      gradiumApiKey: '',
      gradiumApiUrl: DEFAULT_GRADIUM_TTS_ENDPOINT,
      gradiumOutputFormat: DEFAULT_GRADIUM_OUTPUT_FORMAT,
      gradiumTemperature: '',
      gradiumVoiceSimilarity: '',
      gradiumPaddingBonus: '',
      gradiumRewriteRules: '',
      piperPlusBasePath: DEFAULT_PIPER_PLUS_BASE_PATH,
      piperPlusModelConfigFile: DEFAULT_PIPER_PLUS_MODEL_CONFIG_FILE,
      piperPlusModelFile: DEFAULT_PIPER_PLUS_MODEL_FILE,
      piperPlusVoiceFile: DEFAULT_PIPER_PLUS_VOICE_FILE,
      piperPlusSpeed: '',
      piperPlusNoiseScale: '',
    },
    visual: {
      backgroundMode: 'default',
      layoutMode: 'chat',
      showInputInBroadcast: false,
    },
    screenVision: {
      deviceId: '',
      prompt: DEFAULT_SCREEN_VISION_PROMPT,
      autoIntervalMs: 0,
      enabled: false,
    },
    stream: {
      platform: 'none',
      youtubeApiKey: '',
      youtubeLiveId: '',
      youtubeEnabled: false,
      youtubeCommentIntervalMs: 20_000,
      twitchClientId: '',
      twitchAccessToken: '',
      twitchChannel: '',
      twitchEnabled: false,
      twitchCommentIntervalMs: 20_000,
    },
    commentIntelligence: {
      enabled: true,
      mode: 'rules',
      useSameLLMSettings: true,
      maxCommentsPerBatch: 50,
      analysisIntervalMs: 1000,
      minCommentsForLLMAnalysis: 8,
      blockHighRiskViewers: true,
      viewerBlockDurationMs: 10 * 60 * 1000,
    },
    manneri: {
      enabled: true,
      similarityThreshold: 0.75,
      lookbackWindow: 10,
      interventionCooldownMs: 5 * 60 * 1000,
      minMessageLength: 10,
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
        visual: { ...defaults.visual, ...saved.visual },
        screenVision: { ...defaults.screenVision, ...saved.screenVision },
        stream: { ...defaults.stream, ...saved.stream },
        commentIntelligence: {
          ...defaults.commentIntelligence,
          ...saved.commentIntelligence,
        },
        manneri: { ...defaults.manneri, ...saved.manneri },
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
      unrealSpeech: 'af_bella',
      elevenLabs: '',
      inworld: '',
      gradium: 'YTpq7expH9539ERJ',
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
            ? prev.tts.geminiTtsLanguageCode || DEFAULT_GEMINI_TTS_LANGUAGE_CODE
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
          engine === 'xai'
            ? prev.tts.xaiBitRate || 128000
            : prev.tts.xaiBitRate,
        unrealSpeechApiUrl:
          engine === 'unrealSpeech'
            ? prev.tts.unrealSpeechApiUrl || DEFAULT_UNREAL_SPEECH_TTS_ENDPOINT
            : prev.tts.unrealSpeechApiUrl,
        unrealSpeechBitrate:
          engine === 'unrealSpeech'
            ? prev.tts.unrealSpeechBitrate || '192k'
            : prev.tts.unrealSpeechBitrate,
        unrealSpeechCodec:
          engine === 'unrealSpeech'
            ? prev.tts.unrealSpeechCodec || 'libmp3lame'
            : prev.tts.unrealSpeechCodec,
        elevenLabsApiUrl:
          engine === 'elevenLabs'
            ? prev.tts.elevenLabsApiUrl || DEFAULT_ELEVENLABS_TTS_ENDPOINT
            : prev.tts.elevenLabsApiUrl,
        elevenLabsModel:
          engine === 'elevenLabs'
            ? prev.tts.elevenLabsModel || DEFAULT_ELEVENLABS_MODEL
            : prev.tts.elevenLabsModel,
        elevenLabsOutputFormat:
          engine === 'elevenLabs'
            ? prev.tts.elevenLabsOutputFormat ||
              DEFAULT_ELEVENLABS_OUTPUT_FORMAT
            : prev.tts.elevenLabsOutputFormat,
        elevenLabsUseSpeakerBoost:
          engine === 'elevenLabs'
            ? prev.tts.elevenLabsUseSpeakerBoost || 'default'
            : prev.tts.elevenLabsUseSpeakerBoost,
        elevenLabsApplyTextNormalization:
          engine === 'elevenLabs'
            ? prev.tts.elevenLabsApplyTextNormalization || 'default'
            : prev.tts.elevenLabsApplyTextNormalization,
        inworldApiUrl:
          engine === 'inworld'
            ? prev.tts.inworldApiUrl || DEFAULT_INWORLD_TTS_ENDPOINT
            : prev.tts.inworldApiUrl,
        inworldModel:
          engine === 'inworld'
            ? prev.tts.inworldModel || DEFAULT_INWORLD_MODEL
            : prev.tts.inworldModel,
        inworldAudioEncoding:
          engine === 'inworld'
            ? prev.tts.inworldAudioEncoding || DEFAULT_INWORLD_AUDIO_ENCODING
            : prev.tts.inworldAudioEncoding,
        inworldSampleRateHertz:
          engine === 'inworld'
            ? prev.tts.inworldSampleRateHertz ||
              DEFAULT_INWORLD_SAMPLE_RATE_HERTZ
            : prev.tts.inworldSampleRateHertz,
        inworldLanguage:
          engine === 'inworld'
            ? prev.tts.inworldLanguage || DEFAULT_INWORLD_LANGUAGE
            : prev.tts.inworldLanguage,
        inworldDeliveryMode:
          engine === 'inworld'
            ? prev.tts.inworldDeliveryMode || 'default'
            : prev.tts.inworldDeliveryMode,
        gradiumApiUrl:
          engine === 'gradium'
            ? prev.tts.gradiumApiUrl || DEFAULT_GRADIUM_TTS_ENDPOINT
            : prev.tts.gradiumApiUrl,
        gradiumOutputFormat:
          engine === 'gradium'
            ? prev.tts.gradiumOutputFormat || DEFAULT_GRADIUM_OUTPUT_FORMAT
            : prev.tts.gradiumOutputFormat,
        gradiumTemperature:
          engine === 'gradium'
            ? prev.tts.gradiumTemperature || ''
            : prev.tts.gradiumTemperature,
        gradiumVoiceSimilarity:
          engine === 'gradium'
            ? prev.tts.gradiumVoiceSimilarity || ''
            : prev.tts.gradiumVoiceSimilarity,
        gradiumPaddingBonus:
          engine === 'gradium'
            ? prev.tts.gradiumPaddingBonus || ''
            : prev.tts.gradiumPaddingBonus,
        gradiumRewriteRules:
          engine === 'gradium'
            ? prev.tts.gradiumRewriteRules || ''
            : prev.tts.gradiumRewriteRules,
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

  const updateTtsField = useCallback(
    <TKey extends keyof AppSettings['tts']>(
      key: TKey,
      value: AppSettings['tts'][TKey],
    ) => {
      setSettings((prev) => ({
        ...prev,
        tts: { ...prev.tts, [key]: value },
      }));
    },
    [],
  );

  const updatePiperPlusBasePath = useCallback((basePath: string) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, piperPlusBasePath: basePath },
    }));
  }, []);

  const updatePiperPlusModelConfigFile = useCallback(
    (modelConfigFile: string) => {
      setSettings((prev) => ({
        ...prev,
        tts: { ...prev.tts, piperPlusModelConfigFile: modelConfigFile },
      }));
    },
    [],
  );

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

  const updateVisualBackgroundMode = useCallback(
    (backgroundMode: AppSettings['visual']['backgroundMode']) => {
      setSettings((prev) => ({
        ...prev,
        visual: { ...prev.visual, backgroundMode },
      }));
    },
    [],
  );

  const updateVisualLayoutMode = useCallback(
    (layoutMode: AppSettings['visual']['layoutMode']) => {
      setSettings((prev) => ({
        ...prev,
        visual: { ...prev.visual, layoutMode },
      }));
    },
    [],
  );

  const updateVisualShowInputInBroadcast = useCallback(
    (showInputInBroadcast: boolean) => {
      setSettings((prev) => ({
        ...prev,
        visual: { ...prev.visual, showInputInBroadcast },
      }));
    },
    [],
  );

  const updateScreenVisionDeviceId = useCallback((deviceId: string) => {
    setSettings((prev) => ({
      ...prev,
      screenVision: { ...prev.screenVision, deviceId },
    }));
  }, []);

  const updateScreenVisionPrompt = useCallback((prompt: string) => {
    setSettings((prev) => ({
      ...prev,
      screenVision: { ...prev.screenVision, prompt },
    }));
  }, []);

  const updateScreenVisionAutoIntervalMs = useCallback(
    (autoIntervalMs: number) => {
      setSettings((prev) => ({
        ...prev,
        screenVision: { ...prev.screenVision, autoIntervalMs },
      }));
    },
    [],
  );

  const updateScreenVisionEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      screenVision: { ...prev.screenVision, enabled },
    }));
  }, []);

  const updateStreamPlatform = useCallback(
    (platform: StreamingPlatformOption) => {
      setSettings((prev) => ({
        ...prev,
        stream: { ...prev.stream, platform },
      }));
    },
    [],
  );

  const updateYoutubeApiKey = useCallback((youtubeApiKey: string) => {
    setSettings((prev) => ({
      ...prev,
      stream: { ...prev.stream, youtubeApiKey },
    }));
  }, []);

  const updateYoutubeLiveId = useCallback((youtubeLiveId: string) => {
    setSettings((prev) => ({
      ...prev,
      stream: { ...prev.stream, youtubeLiveId },
    }));
  }, []);

  const updateYoutubeEnabled = useCallback((youtubeEnabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      stream: { ...prev.stream, youtubeEnabled },
    }));
  }, []);

  const updateYoutubeCommentIntervalMs = useCallback(
    (youtubeCommentIntervalMs: number) => {
      setSettings((prev) => ({
        ...prev,
        stream: { ...prev.stream, youtubeCommentIntervalMs },
      }));
    },
    [],
  );

  const updateTwitchClientId = useCallback((twitchClientId: string) => {
    setSettings((prev) => ({
      ...prev,
      stream: { ...prev.stream, twitchClientId },
    }));
  }, []);

  const updateTwitchAccessToken = useCallback((twitchAccessToken: string) => {
    setSettings((prev) => ({
      ...prev,
      stream: { ...prev.stream, twitchAccessToken },
    }));
  }, []);

  const updateTwitchChannel = useCallback((twitchChannel: string) => {
    setSettings((prev) => ({
      ...prev,
      stream: { ...prev.stream, twitchChannel },
    }));
  }, []);

  const updateTwitchEnabled = useCallback((twitchEnabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      stream: { ...prev.stream, twitchEnabled },
    }));
  }, []);

  const updateTwitchCommentIntervalMs = useCallback(
    (twitchCommentIntervalMs: number) => {
      setSettings((prev) => ({
        ...prev,
        stream: { ...prev.stream, twitchCommentIntervalMs },
      }));
    },
    [],
  );

  const updateCommentIntelligenceEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      commentIntelligence: { ...prev.commentIntelligence, enabled },
    }));
  }, []);

  const updateCommentIntelligenceMode = useCallback(
    (mode: AppSettings['commentIntelligence']['mode']) => {
      setSettings((prev) => ({
        ...prev,
        commentIntelligence: { ...prev.commentIntelligence, mode },
      }));
    },
    [],
  );

  const updateCommentIntelligenceAnalysisIntervalMs = useCallback(
    (analysisIntervalMs: number) => {
      setSettings((prev) => ({
        ...prev,
        commentIntelligence: {
          ...prev.commentIntelligence,
          analysisIntervalMs: normalizePositiveInteger(
            analysisIntervalMs,
            getDefaultSettings().commentIntelligence.analysisIntervalMs,
          ),
        },
      }));
    },
    [],
  );

  const updateCommentIntelligenceMaxCommentsPerBatch = useCallback(
    (maxCommentsPerBatch: number) => {
      setSettings((prev) => ({
        ...prev,
        commentIntelligence: {
          ...prev.commentIntelligence,
          maxCommentsPerBatch: normalizePositiveInteger(
            maxCommentsPerBatch,
            getDefaultSettings().commentIntelligence.maxCommentsPerBatch,
          ),
        },
      }));
    },
    [],
  );

  const updateCommentIntelligenceMinCommentsForLLMAnalysis = useCallback(
    (minCommentsForLLMAnalysis: number) => {
      setSettings((prev) => ({
        ...prev,
        commentIntelligence: {
          ...prev.commentIntelligence,
          minCommentsForLLMAnalysis: normalizePositiveInteger(
            minCommentsForLLMAnalysis,
            getDefaultSettings().commentIntelligence.minCommentsForLLMAnalysis,
          ),
        },
      }));
    },
    [],
  );

  const updateCommentIntelligenceBlockHighRiskViewers = useCallback(
    (blockHighRiskViewers: boolean) => {
      setSettings((prev) => ({
        ...prev,
        commentIntelligence: {
          ...prev.commentIntelligence,
          blockHighRiskViewers,
        },
      }));
    },
    [],
  );

  const updateCommentIntelligenceViewerBlockDurationMs = useCallback(
    (viewerBlockDurationMs: number) => {
      setSettings((prev) => ({
        ...prev,
        commentIntelligence: {
          ...prev.commentIntelligence,
          viewerBlockDurationMs: normalizePositiveInteger(
            viewerBlockDurationMs,
            getDefaultSettings().commentIntelligence.viewerBlockDurationMs,
          ),
        },
      }));
    },
    [],
  );

  const updateManneriEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      manneri: { ...prev.manneri, enabled },
    }));
  }, []);

  const updateManneriSimilarityThreshold = useCallback(
    (similarityThreshold: number) => {
      setSettings((prev) => ({
        ...prev,
        manneri: {
          ...prev.manneri,
          similarityThreshold: Math.min(
            1,
            Math.max(0.1, similarityThreshold),
          ),
        },
      }));
    },
    [],
  );

  const updateManneriLookbackWindow = useCallback((lookbackWindow: number) => {
    setSettings((prev) => ({
      ...prev,
      manneri: {
        ...prev.manneri,
        lookbackWindow: normalizePositiveInteger(
          lookbackWindow,
          getDefaultSettings().manneri.lookbackWindow,
        ),
      },
    }));
  }, []);

  const updateManneriInterventionCooldownMs = useCallback(
    (interventionCooldownMs: number) => {
      setSettings((prev) => ({
        ...prev,
        manneri: {
          ...prev.manneri,
          interventionCooldownMs: normalizePositiveInteger(
            interventionCooldownMs,
            getDefaultSettings().manneri.interventionCooldownMs,
          ),
        },
      }));
    },
    [],
  );

  const updateManneriMinMessageLength = useCallback(
    (minMessageLength: number) => {
      setSettings((prev) => ({
        ...prev,
        manneri: {
          ...prev.manneri,
          minMessageLength: normalizePositiveInteger(
            minMessageLength,
            getDefaultSettings().manneri.minMessageLength,
          ),
        },
      }));
    },
    [],
  );

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
    updateTtsField,
    updatePiperPlusBasePath,
    updatePiperPlusModelConfigFile,
    updatePiperPlusModelFile,
    updatePiperPlusVoiceFile,
    updatePiperPlusSpeed,
    updatePiperPlusNoiseScale,
    updateVisualBackgroundMode,
    updateVisualLayoutMode,
    updateVisualShowInputInBroadcast,
    updateScreenVisionDeviceId,
    updateScreenVisionPrompt,
    updateScreenVisionAutoIntervalMs,
    updateScreenVisionEnabled,
    updateStreamPlatform,
    updateYoutubeApiKey,
    updateYoutubeLiveId,
    updateYoutubeEnabled,
    updateYoutubeCommentIntervalMs,
    updateTwitchClientId,
    updateTwitchAccessToken,
    updateTwitchChannel,
    updateTwitchEnabled,
    updateTwitchCommentIntervalMs,
    updateCommentIntelligenceEnabled,
    updateCommentIntelligenceMode,
    updateCommentIntelligenceAnalysisIntervalMs,
    updateCommentIntelligenceMaxCommentsPerBatch,
    updateCommentIntelligenceMinCommentsForLLMAnalysis,
    updateCommentIntelligenceBlockHighRiskViewers,
    updateCommentIntelligenceViewerBlockDurationMs,
    updateManneriEnabled,
    updateManneriSimilarityThreshold,
    updateManneriLookbackWindow,
    updateManneriInterventionCooldownMs,
    updateManneriMinMessageLength,
    getApiKeyForProvider,
  };
}
