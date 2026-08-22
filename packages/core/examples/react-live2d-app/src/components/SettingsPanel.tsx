import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDefaultXaiReasoningEffort,
  getVoiceEngineVoiceList,
  isGPT5Model,
  isXaiReasoningEffortModel,
  isXaiReasoningEffortNoneModel,
  normalizeXaiReasoningEffort,
  type VoiceEngineVoice,
  type XaiReasoningEffort,
} from '@aituber-onair/core';
import { ScreenVisionPanel } from './ScreenVisionPanel';
import { StreamSettings } from './StreamSettings';
import { useGeminiNanoStatus } from '../hooks/useGeminiNanoStatus';
import { DEFAULT_SYSTEM_PROMPT } from '../constants/prompts';
import type { useScreenVisionController } from '../hooks/useScreenVisionController';
import type {
  Live2DEmotionEffect,
  Live2DReactionControlMode,
  Live2DReactionEmotion,
} from '../lib/live2dReactions';
import type { ChatProviderOption, TTSEngineOption } from '../types/settings';
import type { useSettings } from '../hooks/useSettings';

type SettingsHook = ReturnType<typeof useSettings>;
type ScreenVisionController = ReturnType<typeof useScreenVisionController>;

interface SettingsPanelProps extends SettingsHook {
  isProcessing: boolean;
  backgroundImageUrl: string | null;
  streamErrorMessage?: string;
  screenVisionController: ScreenVisionController;
  onBackgroundImageChange: (file: File | null) => void;
}

const PROVIDERS: {
  value: ChatProviderOption;
  label: string;
  disabled?: boolean;
}[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai-compatible', label: 'OpenAI-Compatible' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'gemini-nano', label: 'Gemini Nano' },
  { value: 'claude', label: 'Claude' },
  { value: 'xai', label: 'xAI' },
  { value: 'zai', label: 'Z.ai' },
  { value: 'kimi', label: 'Kimi' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'sakana', label: 'Sakana AI (Node/backend only)', disabled: true },
  { value: 'plamo', label: 'PLaMo' },
];

const TTS_ENGINES: { value: TTSEngineOption; label: string }[] = [
  { value: 'openai', label: 'OpenAI TTS' },
  { value: 'geminiTts', label: 'Gemini TTS' },
  { value: 'openaiCompatible', label: 'OpenAI-Compatible TTS' },
  { value: 'voicevox', label: 'VOICEVOX' },
  { value: 'voicepeak', label: 'VOICEPEAK' },
  { value: 'aivisSpeech', label: 'AivisSpeech' },
  { value: 'aivisCloud', label: 'Aivis Cloud' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'xai', label: 'xAI TTS' },
  { value: 'unrealSpeech', label: 'Unreal Speech' },
  { value: 'elevenLabs', label: 'ElevenLabs' },
  { value: 'inworld', label: 'Inworld' },
  { value: 'gradium', label: 'Gradium' },
  { value: 'piperPlus', label: 'Piper Plus' },
  { value: 'webSpeech', label: 'Web Speech API' },
  { value: 'none', label: 'None' },
];

const LIVE2D_REACTION_EMOTION_OPTIONS: ReadonlyArray<{
  value: Live2DReactionEmotion;
  label: string;
}> = [
  { value: 'happy', label: 'Alegría (happy)' },
  { value: 'surprised', label: 'Sorpresa (surprised)' },
  { value: 'sad', label: 'Tristeza (sad)' },
  { value: 'angry', label: 'Enfado (angry)' },
  { value: 'relaxed', label: 'Relajación (relaxed)' },
  { value: 'thinking', label: 'Pensando (thinking)' },
  { value: 'neutral', label: 'Neutral' },
];

const LIVE2D_EFFECT_OPTIONS: ReadonlyArray<{
  value: Live2DEmotionEffect | 'none';
  label: string;
}> = [
  { value: 'none', label: 'Ninguno' },
  { value: 'happy', label: 'Alegría (brillos)' },
  { value: 'surprised', label: 'Sorpresa (rayos)' },
  { value: 'sad', label: 'Tristeza (lágrimas)' },
  { value: 'angry', label: 'Enfado (marcas de enfado)' },
  { value: 'relaxed', label: 'Relajación (burbujas)' },
  { value: 'thinking', label: 'Pensando (burbuja de pensamiento)' },
];

const OPENAI_SPEAKERS = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const GEMINI_TTS_MODELS = [
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
] as const;
const GEMINI_TTS_SPEAKERS = [
  'Zephyr',
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Leda',
  'Orus',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
] as const;
const XAI_SPEAKERS = ['ara', 'eve', 'leo', 'rex', 'sal'];
const XAI_CODECS = ['mp3', 'wav', 'pcm', 'mulaw', 'alaw'] as const;
const XAI_SAMPLE_RATES = [8000, 16000, 22050, 24000, 44100, 48000] as const;
const XAI_BIT_RATES = [32000, 64000, 96000, 128000, 192000] as const;
const UNREAL_SPEECH_SPEAKERS = [
  'af_bella',
  'af_sarah',
  'am_adam',
  'am_michael',
] as const;
const UNREAL_SPEECH_CODECS = ['libmp3lame', 'pcm_mulaw', 'pcm_s16le'] as const;
const ELEVENLABS_MODELS = [
  'eleven_multilingual_v2',
  'eleven_flash_v2_5',
  'eleven_turbo_v2_5',
] as const;
const ELEVENLABS_OUTPUT_FORMATS = [
  'mp3_44100_128',
  'mp3_22050_32',
  'pcm_16000',
  'ulaw_8000',
] as const;
const INWORLD_MODELS = [
  'inworld-tts-2',
  'inworld-tts-1.5-mini',
  'inworld-tts-1.5-max',
] as const;
const INWORLD_AUDIO_ENCODINGS = [
  'MP3',
  'OGG_OPUS',
  'FLAC',
  'LINEAR16',
  'WAV',
  'PCM',
  'ALAW',
  'MULAW',
] as const;
const INWORLD_DELIVERY_MODES = ['STABLE', 'BALANCED', 'CREATIVE'] as const;
const GRADIUM_VOICES: Record<string, string> = {
  YTpq7expH9539ERJ: 'Emma - English (US, feminine)',
  LFZvm12tW_z0xfGo: 'Kent - English (US, masculine)',
  jtEKaLYNn6iif5PR: 'Sydney - English (US, feminine)',
  KWJiFWu2O9nMPYcR: 'John - English (US, masculine)',
  ubuXFxVQwVYnZQhy: 'Eva - English (GB, feminine)',
  m86j6D7UZpGzHsNu: 'Jack - English (GB, masculine)',
  b35yykvVppLXyw_l: 'Elise - French (FR, feminine)',
  axlOaUiFyOZhy4nv: 'Leo - French (FR, masculine)',
  '-uP9MuGtBqAvEyxI': 'Mia - German (DE, feminine)',
  '0y1VZjPabOBU3rWy': 'Maximilian - German (DE, masculine)',
  B36pbz5_UoWn4BDl: 'Valentina - Spanish (MX, feminine)',
  xu7iJ_fn2ElcWp2s: 'Sergio - Spanish (ES, masculine)',
  pYcGZz9VOo4n2ynh: 'Alice - Portuguese (BR, feminine)',
  'M-FvVo9c-jGR4PgP': 'Davi - Portuguese (BR, masculine)',
};
const GRADIUM_OUTPUT_FORMATS = [
  'wav',
  'pcm',
  'opus',
  'ulaw_8000',
  'mulaw_8000',
  'alaw_8000',
  'pcm_8000',
  'pcm_16000',
  'pcm_22050',
  'pcm_24000',
  'pcm_44100',
  'pcm_48000',
] as const;

const VOICEPEAK_SPEAKERS = [
  { id: 'f1', name: 'Mujer japonesa 1' },
  { id: 'f2', name: 'Mujer japonesa 2' },
  { id: 'f3', name: 'Mujer japonesa 3' },
  { id: 'm1', name: 'Hombre japonés 1' },
  { id: 'm2', name: 'Hombre japonés 2' },
  { id: 'm3', name: 'Hombre japonés 3' },
  { id: 'c', name: 'Niña' },
];

const AIVIS_CLOUD_PRESETS = [
  {
    id: 'kohaku',
    label: 'コハク',
    modelUuid: '22e8ed77-94fe-4ef2-871f-a86f94e9a579',
    speakerUuid: '',
    styleId: '',
  },
  {
    id: 'mao',
    label: 'まお',
    modelUuid: 'a59cb814-0083-4369-8542-f51a29e72af7',
    speakerUuid: '',
    styleId: '',
  },
] as const;

interface VoiceSpeaker {
  name: string;
  speaker_uuid: string;
  styles: { name: string; id: number }[];
}

interface MinimaxVoice {
  voice_id: string;
  voice_name: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
}

interface InworldVoice {
  voiceId: string;
  displayName?: string;
  langCode?: string;
  gender?: string;
}

type SectionKey =
  | 'llm'
  | 'tts'
  | 'visual'
  | 'emotionEffects'
  | 'stream'
  | 'commentIntelligence'
  | 'manneri';

export function SettingsPanel({
  settings,
  availableModels,
  updateLLMProvider,
  updateLLMModel,
  updateLLMSystemPrompt,
  updateLLMApiKey,
  updateLLMEndpoint,
  updateXaiReasoningEffort,
  refreshOpenRouterDynamicFreeModels,
  isRefreshingOpenRouterFreeModels,
  openRouterRefreshError,
  updateOpenRouterMaxCandidates,
  refreshOpenAiCompatibleModels,
  openAiCompatibleModels,
  refreshOpenAiCompatibleTtsModels,
  openAiCompatibleTtsModels,
  openAiCompatibleLlmDiscoveryError,
  openAiCompatibleTtsDiscoveryError,
  ttsKeepAliveSyncError,
  isRefreshingOpenAiCompatibleModels,
  isRefreshingOpenAiCompatibleTtsModels,
  updateTTSEngine,
  updateTTSSpeaker,
  updateOpenAiCompatibleApiKey,
  updateOpenAiCompatibleApiUrl,
  updateOpenAiCompatibleModel,
  updateOpenAiCompatibleSpeed,
  updateOpenAiCompatibleKeepAliveMinutes,
  updateOpenAiCompatibleSentencePipeline,
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
  updateVisualLive2DReactionControlMode,
  updateVisualLive2DEmotionEffect,
  resetVisualLive2DEmotionEffectMap,
  updateScreenVisionDeviceId,
  updateScreenVisionPrompt,
  updateScreenVisionAutoIntervalMs,
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
  updateTikTokUniqueId,
  updateTikTokRelayUrl,
  updateTikTokEnabled,
  updateTikTokCommentIntervalMs,
  updateCommentIntelligenceEnabled,
  updateCommentIntelligenceMode,
  updateCommentIntelligenceStreamTopic,
  updateCommentIntelligenceStreamTitle,
  updateCommentIntelligenceTopicFilter,
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
  isProcessing,
  backgroundImageUrl,
  streamErrorMessage,
  screenVisionController,
  onBackgroundImageChange,
}: SettingsPanelProps) {
  const disabled = isProcessing;
  const [systemPromptDraft, setSystemPromptDraft] = useState(
    settings.llm.systemPrompt,
  );
  const committedEndpoint = settings.llm.endpoint || '';
  const [endpointDraft, setEndpointDraft] = useState(committedEndpoint);
  const [endpointError, setEndpointError] = useState('');

  const commitSystemPrompt = () => {
    if (systemPromptDraft !== settings.llm.systemPrompt) {
      updateLLMSystemPrompt(systemPromptDraft);
    }
  };
  const commitEndpoint = () => {
    const endpoint = endpointDraft.trim();
    let endpointUrl: URL;

    try {
      endpointUrl = new URL(endpoint);
    } catch {
      setEndpointError('Enter a full http:// or https:// URL.');
      return;
    }

    if (endpointUrl.protocol !== 'http:' && endpointUrl.protocol !== 'https:') {
      setEndpointError('Enter a full http:// or https:// URL.');
      return;
    }

    setEndpointError('');
    setEndpointDraft(endpoint);
    if (endpoint !== committedEndpoint) {
      updateLLMEndpoint(endpoint);
    }
  };
  const isOpenAIGPT5Model =
    settings.llm.provider === 'openai' && isGPT5Model(settings.llm.model);
  const isXaiReasoningEffortModelSelected =
    settings.llm.provider === 'xai' &&
    isXaiReasoningEffortModel(settings.llm.model);
  const xaiReasoningEffortValue: XaiReasoningEffort =
    isXaiReasoningEffortModelSelected
      ? normalizeXaiReasoningEffort(
          settings.llm.model,
          settings.llm.xaiReasoningEffort ||
            getDefaultXaiReasoningEffort(settings.llm.model),
        ) || 'none'
      : 'none';
  const allowsXaiNoneReasoningEffort =
    settings.llm.provider === 'xai' &&
    isXaiReasoningEffortNoneModel(settings.llm.model);
  const openRouterApiKey = getApiKeyForProvider('openrouter').trim();
  const openRouterDynamicFreeModels =
    settings.llm.openRouterDynamicFreeModels?.models || [];
  const openRouterFetchedAt =
    settings.llm.openRouterDynamicFreeModels?.fetchedAt || 0;
  const openRouterMaxCandidates =
    settings.llm.openRouterDynamicFreeModels?.maxCandidates || 1;
  const geminiNano = useGeminiNanoStatus(
    settings.llm.provider === 'gemini-nano',
  );

  const [voicevoxSpeakers, setVoicevoxSpeakers] = useState<VoiceSpeaker[]>([]);
  const [aivisSpeakers, setAivisSpeakers] = useState<VoiceSpeaker[]>([]);
  const [minimaxVoices, setMinimaxVoices] = useState<MinimaxVoice[]>([]);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>(
    [],
  );
  const [inworldVoices, setInworldVoices] = useState<InworldVoice[]>([]);
  const [webSpeechVoices, setWebSpeechVoices] = useState<VoiceEngineVoice[]>(
    [],
  );
  const [isFetchingWebSpeechVoices, setIsFetchingWebSpeechVoices] =
    useState(false);
  const [fetchError, setFetchError] = useState('');
  const [isFetchingMinimaxVoices, setIsFetchingMinimaxVoices] = useState(false);
  const [isFetchingElevenLabsVoices, setIsFetchingElevenLabsVoices] =
    useState(false);
  const [isFetchingInworldVoices, setIsFetchingInworldVoices] = useState(false);
  const speakerRef = useRef(settings.tts.speaker);
  const [expandedSections, setExpandedSections] = useState<
    Record<SectionKey, boolean>
  >({
    llm: true,
    tts: true,
    visual: true,
    emotionEffects: true,
    stream: true,
    commentIntelligence: true,
    manneri: true,
  });

  useEffect(() => {
    speakerRef.current = settings.tts.speaker;
  }, [settings.tts.speaker]);

  const selectedAivisCloudPresetId = useMemo(() => {
    const matched = AIVIS_CLOUD_PRESETS.find(
      (preset) =>
        preset.modelUuid === (settings.tts.aivisCloudModelUuid || '') &&
        preset.speakerUuid === (settings.tts.aivisCloudSpeakerUuid || '') &&
        preset.styleId === (settings.tts.aivisCloudStyleId || ''),
    );
    return matched?.id || AIVIS_CLOUD_PRESETS[0].id;
  }, [
    settings.tts.aivisCloudModelUuid,
    settings.tts.aivisCloudSpeakerUuid,
    settings.tts.aivisCloudStyleId,
  ]);

  // Fetch speaker list for VOICEVOX / AivisSpeech
  useEffect(() => {
    if (
      settings.tts.engine !== 'voicevox' &&
      settings.tts.engine !== 'aivisSpeech'
    ) {
      return;
    }

    const controller = new AbortController();

    const fetchSpeakers = async () => {
      const isVoicevox = settings.tts.engine === 'voicevox';
      const baseUrl = isVoicevox
        ? settings.tts.voicevoxApiUrl || 'http://localhost:50021'
        : settings.tts.aivisSpeechApiUrl || 'http://localhost:10101';

      try {
        const response = await fetch(`${baseUrl}/speakers`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const speakers = (await response.json()) as VoiceSpeaker[];
        if (controller.signal.aborted) return;

        if (isVoicevox) {
          setVoicevoxSpeakers(speakers);
        } else {
          setAivisSpeakers(speakers);
        }
        setFetchError('');

        if (!speakerRef.current && speakers.length > 0) {
          const firstId = speakers[0]?.styles?.[0]?.id;
          if (firstId != null) updateTTSSpeaker(String(firstId));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        if (isVoicevox) {
          setVoicevoxSpeakers([]);
          setFetchError(`Error conexión VOICEVOX: ${message}`);
        } else {
          setAivisSpeakers([]);
          setFetchError(`Error conexión AivisSpeech: ${message}`);
        }
      }
    };

    void fetchSpeakers();

    return () => {
      controller.abort();
    };
  }, [
    settings.tts.engine,
    settings.tts.voicevoxApiUrl,
    settings.tts.aivisSpeechApiUrl,
    updateTTSSpeaker,
  ]);

  // Fetch MiniMax speaker list after API key is entered
  useEffect(() => {
    if (settings.tts.engine !== 'minimax') {
      return;
    }

    const apiKey = settings.tts.minimaxApiKey?.trim();
    if (!apiKey) {
      return;
    }

    const controller = new AbortController();

    const fetchMinimaxVoices = async () => {
      setIsFetchingMinimaxVoices(true);
      try {
        const response = await fetch(
          'https://api.minimax.io/v1/query/tts_speakers',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          base_resp?: { status_code?: number; status_msg?: string };
          data?: { speakers?: MinimaxVoice[] };
        };
        if (controller.signal.aborted) return;

        if (payload.base_resp && payload.base_resp.status_code !== 0) {
          throw new Error(payload.base_resp.status_msg || 'MiniMax API error');
        }

        const voices = payload.data?.speakers || [];
        setMinimaxVoices(voices);
        setFetchError('');

        if (
          voices.length > 0 &&
          !voices.some((voice) => voice.voice_id === speakerRef.current)
        ) {
          updateTTSSpeaker(voices[0].voice_id);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        setMinimaxVoices([]);
        setFetchError(`Error conexión MiniMax: ${message}`);
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingMinimaxVoices(false);
        }
      }
    };

    void fetchMinimaxVoices();

    return () => {
      controller.abort();
    };
  }, [settings.tts.engine, settings.tts.minimaxApiKey, updateTTSSpeaker]);

  // Fetch ElevenLabs voice list after API key is entered
  useEffect(() => {
    if (settings.tts.engine !== 'elevenLabs') {
      return;
    }

    const apiKey = settings.tts.elevenLabsApiKey?.trim();
    if (!apiKey) {
      queueMicrotask(() => {
        setElevenLabsVoices([]);
      });
      return;
    }

    const controller = new AbortController();

    const fetchElevenLabsVoices = async () => {
      setIsFetchingElevenLabsVoices(true);
      try {
        const response = await fetch(
          'https://api.elevenlabs.io/v2/voices?page_size=100',
          {
            method: 'GET',
            headers: {
              'xi-api-key': apiKey,
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          voices?: ElevenLabsVoice[];
        };
        if (controller.signal.aborted) return;

        const voices = payload.voices || [];
        setElevenLabsVoices(voices);
        setFetchError('');

        if (
          voices.length > 0 &&
          !voices.some((voice) => voice.voice_id === speakerRef.current)
        ) {
          updateTTSSpeaker(voices[0].voice_id);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        setElevenLabsVoices([]);
        setFetchError(`Error conexión ElevenLabs: ${message}`);
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingElevenLabsVoices(false);
        }
      }
    };

    void fetchElevenLabsVoices();

    return () => {
      controller.abort();
    };
  }, [settings.tts.engine, settings.tts.elevenLabsApiKey, updateTTSSpeaker]);

  useEffect(() => {
    if (settings.tts.engine !== 'inworld') {
      return;
    }

    const apiKey = settings.tts.inworldApiKey?.trim();
    if (!apiKey) {
      queueMicrotask(() => {
        setInworldVoices([]);
      });
      return;
    }

    const controller = new AbortController();

    const fetchInworldVoices = async () => {
      setIsFetchingInworldVoices(true);
      try {
        const url = new URL('https://api.inworld.ai/voices/v1/voices');
        url.searchParams.set('orderBy', 'display_name asc');
        url.searchParams.set('pageSize', '2000');
        if (settings.tts.inworldLanguage?.trim()) {
          url.searchParams.set(
            'filter',
            `lang_code = "${settings.tts.inworldLanguage.trim()}"`,
          );
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { Authorization: `Basic ${apiKey}` },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          voices?: InworldVoice[];
        };
        if (controller.signal.aborted) return;

        const voices = payload.voices || [];
        setInworldVoices(voices);
        setFetchError('');

        if (
          voices.length > 0 &&
          !voices.some((voice) => voice.voiceId === speakerRef.current)
        ) {
          updateTTSSpeaker(voices[0].voiceId);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        setInworldVoices([]);
        setFetchError(`Error conexión Inworld: ${message}`);
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingInworldVoices(false);
        }
      }
    };

    void fetchInworldVoices();

    return () => {
      controller.abort();
    };
  }, [
    settings.tts.engine,
    settings.tts.inworldApiKey,
    settings.tts.inworldLanguage,
    updateTTSSpeaker,
  ]);

  useEffect(() => {
    if (settings.tts.engine !== 'webSpeech') {
      return;
    }

    let active = true;
    const fetchWebSpeechVoices = async () => {
      setIsFetchingWebSpeechVoices(true);
      try {
        const voices = await getVoiceEngineVoiceList('webSpeech');
        if (!active) return;
        setWebSpeechVoices(voices);
        setFetchError('');
        if (
          voices.length > 0 &&
          !voices.some((voice) => voice.id === settings.tts.speaker)
        ) {
          updateTTSSpeaker(voices[0].id);
        }
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setWebSpeechVoices([]);
        setFetchError(`Error lista voces Web Speech: ${message}`);
      } finally {
        if (active) {
          setIsFetchingWebSpeechVoices(false);
        }
      }
    };

    void fetchWebSpeechVoices();
    return () => {
      active = false;
    };
  }, [settings.tts.engine, settings.tts.speaker, updateTTSSpeaker]);

  const handleAivisCloudPresetChange = (presetId: string) => {
    const preset = AIVIS_CLOUD_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    updateAivisCloudModelUuid(preset.modelUuid);
    updateAivisCloudSpeakerUuid(preset.speakerUuid);
    updateAivisCloudStyleId(preset.styleId);
    updateTTSSpeaker(preset.modelUuid);
  };

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="settings-panel">
      {/* LLM Section */}
      <div className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => toggleSection('llm')}
          aria-expanded={expandedSections.llm}
        >
          <h3>LLM</h3>
          <span
            className={`settings-section-chevron${expandedSections.llm ? ' is-open' : ''}`}
          >
            ⌄
          </span>
        </button>

        {expandedSections.llm && (
          <>
            <div className="settings-field">
              <label htmlFor="llm-provider">Provider</label>
              <select
                id="llm-provider"
                value={settings.llm.provider}
                onChange={(e) =>
                  updateLLMProvider(e.target.value as ChatProviderOption)
                }
                disabled={disabled}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value} disabled={p.disabled}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {settings.llm.provider !== 'gemini-nano' && (
              <div className="settings-field">
                <label htmlFor="llm-apikey">
                  API Key ({settings.llm.provider})
                  {settings.llm.provider === 'openai-compatible'
                    ? ' (opcional)'
                    : ''}
                </label>
                <input
                  id="llm-apikey"
                  type="password"
                  value={getApiKeyForProvider(settings.llm.provider)}
                  onChange={(e) =>
                    updateLLMApiKey(settings.llm.provider, e.target.value)
                  }
                  placeholder={
                    settings.llm.provider === 'openai-compatible'
                      ? 'Ingresa solo si es necesario'
                      : 'XXX-...'
                  }
                  disabled={disabled}
                />
              </div>
            )}

            {settings.llm.provider === 'openai-compatible' ? (
              <>
                <div className="settings-field">
                  <label htmlFor="llm-model-discovered">Model</label>
                  <select
                    id="llm-model-discovered"
                    value={openAiCompatibleModels.includes(settings.llm.model) ? settings.llm.model : ''}
                    onChange={(e) => updateLLMModel(e.target.value)}
                    disabled={disabled || isRefreshingOpenAiCompatibleModels || openAiCompatibleModels.length === 0}
                  >
                    <option value="">Manual entry below</option>
                    {openAiCompatibleModels.map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                  <input
                    id="llm-model"
                    type="text"
                    aria-label="Manual LLM model"
                    value={settings.llm.model}
                    onChange={(e) => updateLLMModel(e.target.value)}
                    placeholder="ssfdre38/gemma4-turbo:latest"
                    disabled={disabled}
                  />
                  <button
                    type="button"
                    className="settings-action-button"
                    onClick={() => void refreshOpenAiCompatibleModels()}
                    disabled={disabled || isRefreshingOpenAiCompatibleModels}
                  >
                    <span aria-live="polite">
                      {isRefreshingOpenAiCompatibleModels
                        ? 'Refreshing...'
                        : 'Refresh models'}
                    </span>
                  </button>
                  {openAiCompatibleLlmDiscoveryError && (
                    <p className="settings-field-error" aria-live="polite">
                      {openAiCompatibleLlmDiscoveryError}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="settings-field">
                <label htmlFor="llm-model">Model</label>
                <select
                  id="llm-model"
                  value={settings.llm.model}
                  onChange={(e) => updateLLMModel(e.target.value)}
                  disabled={disabled}
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="settings-field">
              <label htmlFor="llm-system-prompt">System Prompt</label>
              <textarea
                id="llm-system-prompt"
                rows={6}
                value={systemPromptDraft}
                onChange={(event) => setSystemPromptDraft(event.target.value)}
                onBlur={commitSystemPrompt}
                placeholder={DEFAULT_SYSTEM_PROMPT}
                disabled={disabled}
              />
              <p className="settings-field-hint">
                Se aplica cuando se quita el foco del campo. Si está vacío, usa valores por defecto.
                Eliminar instrucciones específicas del avatar puede afectar,
                Puede afectar la correlación con efectos de emoción.
              </p>
            </div>

            {isOpenAIGPT5Model && (
              <p className="settings-field-hint">
                GPT-5 models use the Casual preset and Very Short replies in
                this sample.
              </p>
            )}

            {settings.llm.provider === 'xai' && (
              <div className="settings-field">
                <label htmlFor="xai-reasoning-effort">
                  xAI Reasoning Effort
                </label>
                <select
                  id="xai-reasoning-effort"
                  value={xaiReasoningEffortValue}
                  onChange={(e) =>
                    updateXaiReasoningEffort(
                      e.target.value as XaiReasoningEffort,
                    )
                  }
                  disabled={disabled || !isXaiReasoningEffortModelSelected}
                >
                  {allowsXaiNoneReasoningEffort && (
                    <option value="none">None</option>
                  )}
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <p className="settings-field-hint">
                  {isXaiReasoningEffortModelSelected
                    ? settings.llm.model === 'grok-4.5'
                      ? 'Grok 4.5 uses low by default; none is not supported.'
                      : 'Grok 4.3 uses none by default for lower latency.'
                    : 'This xAI model does not support reasoning_effort.'}
                </p>
              </div>
            )}

            {settings.llm.provider === 'openrouter' && (
              <>
                <div className="settings-field">
                  <label htmlFor="openrouter-max-candidates">
                    Max candidates
                  </label>
                  <input
                    id="openrouter-max-candidates"
                    type="number"
                    min={1}
                    value={openRouterMaxCandidates}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      updateOpenRouterMaxCandidates(
                        Number.isFinite(parsed) ? parsed : 1,
                      );
                    }}
                    disabled={disabled || isRefreshingOpenRouterFreeModels}
                  />
                </div>
                <div className="settings-field">
                  <button
                    type="button"
                    className="settings-action-button"
                    onClick={() => {
                      void refreshOpenRouterDynamicFreeModels();
                    }}
                    disabled={
                      disabled ||
                      isRefreshingOpenRouterFreeModels ||
                      !openRouterApiKey
                    }
                  >
                    {isRefreshingOpenRouterFreeModels
                      ? 'Fetching...'
                      : 'Fetch free models'}
                  </button>
                  {!openRouterApiKey && (
                    <p className="settings-field-hint">
                      Set OpenRouter API key to fetch free models.
                    </p>
                  )}
                  {openRouterRefreshError && (
                    <p className="settings-field-error">
                      {openRouterRefreshError}
                    </p>
                  )}
                  <p className="settings-field-hint">
                    Dynamic free models: {openRouterDynamicFreeModels.length}
                  </p>
                  {openRouterFetchedAt > 0 && (
                    <p className="settings-field-hint">
                      Last fetched:{' '}
                      {new Date(openRouterFetchedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            )}

            {settings.llm.provider === 'openai-compatible' && (
              <div className="settings-field">
                <label htmlFor="llm-endpoint">Endpoint URL</label>
                <input
                  id="llm-endpoint"
                  type="text"
                  value={endpointDraft}
                  onChange={(event) => {
                    setEndpointDraft(event.target.value);
                    setEndpointError('');
                  }}
                  onBlur={commitEndpoint}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                  aria-invalid={endpointError ? true : undefined}
                  aria-describedby={
                    endpointError ? 'llm-endpoint-error' : undefined
                  }
                  placeholder="http://localhost:11434/v1/chat/completions"
                  disabled={disabled}
                />
                {endpointError && (
                  <p id="llm-endpoint-error" className="settings-field-error">
                    {endpointError}
                  </p>
                )}
              </div>
            )}

            {settings.llm.provider === 'gemini-nano' && (
              <>
                <div className="settings-field">
                  <small>
                    Gemini Nano usa IA integrada del navegador, no requiere API Key.
                  </small>
                </div>
                <div className="settings-field">
                  <small>{geminiNano.statusText}</small>
                  {geminiNano.downloadProgress != null && (
                    <small>{geminiNano.downloadProgress}%</small>
                  )}
                  {geminiNano.status === 'downloadable' && (
                    <button
                      type="button"
                      className="settings-action-button"
                      onClick={() => geminiNano.prepareModel()}
                      disabled={disabled || geminiNano.isPreparing}
                    >
                      {geminiNano.isPreparing
                        ? 'Preparing...'
                        : 'Prepare Model'}
                    </button>
                  )}
                  <small>
                    Requiere Chrome 138+. Abre chrome://flags y habilita
                    `#optimization-guide-on-device-model` y
                    `#prompt-api-for-gemini-nano`; después reinicia Chrome.
                  </small>
                  <small>
                    Después de habilitar los flags, pulsa `Prepare Model` para
                    iniciar la descarga del modelo. La primera descarga puede
                    tardar varios minutos.
                  </small>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* TTS Section */}
      <div className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => toggleSection('tts')}
          aria-expanded={expandedSections.tts}
        >
          <h3>TTS</h3>
          <span
            className={`settings-section-chevron${expandedSections.tts ? ' is-open' : ''}`}
          >
            ⌄
          </span>
        </button>

        {expandedSections.tts && (
          <>
            <div className="settings-field">
              <label htmlFor="tts-engine">Engine</label>
              <select
                id="tts-engine"
                value={settings.tts.engine}
                onChange={(e) =>
                  updateTTSEngine(e.target.value as TTSEngineOption)
                }
                disabled={disabled}
              >
                {TTS_ENGINES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {settings.tts.engine === 'openai' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-openai-apikey">API Key (OpenAI)</label>
                  <input
                    id="tts-openai-apikey"
                    type="password"
                    value={getApiKeyForProvider('openai')}
                    onChange={(e) => updateLLMApiKey('openai', e.target.value)}
                    placeholder="OpenAI API key"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-speaker">Speaker</label>
                  <select
                    id="tts-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {OPENAI_SPEAKERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {settings.tts.engine === 'geminiTts' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-gemini-apikey">API Key (Gemini)</label>
                  <input
                    id="tts-gemini-apikey"
                    type="password"
                    value={getApiKeyForProvider('gemini')}
                    onChange={(e) => updateLLMApiKey('gemini', e.target.value)}
                    placeholder="Google API key"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gemini-speaker">Voice</label>
                  <select
                    id="tts-gemini-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {GEMINI_TTS_SPEAKERS.map((speaker) => (
                      <option key={speaker} value={speaker}>
                        {speaker}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gemini-model">Model</label>
                  <select
                    id="tts-gemini-model"
                    value={settings.tts.geminiTtsModel || GEMINI_TTS_MODELS[0]}
                    onChange={(e) => updateGeminiTtsModel(e.target.value)}
                    disabled={disabled}
                  >
                    {GEMINI_TTS_MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gemini-language">Language Code</label>
                  <input
                    id="tts-gemini-language"
                    type="text"
                    value={settings.tts.geminiTtsLanguageCode || ''}
                    onChange={(e) =>
                      updateGeminiTtsLanguageCode(e.target.value)
                    }
                    placeholder="ja-JP"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gemini-prompt">
                    Style / Audio-tag Prompt
                  </label>
                  <input
                    id="tts-gemini-prompt"
                    type="text"
                    value={settings.tts.geminiTtsPrompt || ''}
                    onChange={(e) => updateGeminiTtsPrompt(e.target.value)}
                    placeholder="Ejemplo: Voz alegre y enérgica"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'xai' && (
              <>
                {settings.llm.provider !== 'xai' && (
                  <div className="settings-field">
                    <label htmlFor="tts-xai-apikey">API Key (xAI)</label>
                    <input
                      id="tts-xai-apikey"
                      type="password"
                      value={getApiKeyForProvider('xai')}
                      onChange={(e) => updateLLMApiKey('xai', e.target.value)}
                      placeholder="xai-..."
                      disabled={disabled}
                    />
                  </div>
                )}
                <div className="settings-field">
                  <label htmlFor="tts-xai-speaker">Speaker</label>
                  <select
                    id="tts-xai-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {XAI_SPEAKERS.map((speaker) => (
                      <option key={speaker} value={speaker}>
                        {speaker}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-xai-language">Language</label>
                  <input
                    id="tts-xai-language"
                    type="text"
                    value={settings.tts.xaiLanguage || ''}
                    onChange={(e) => updateXaiLanguage(e.target.value)}
                    placeholder="auto"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-xai-codec">Codec</label>
                  <select
                    id="tts-xai-codec"
                    value={settings.tts.xaiCodec || 'mp3'}
                    onChange={(e) => updateXaiCodec(e.target.value)}
                    disabled={disabled}
                  >
                    {XAI_CODECS.map((codec) => (
                      <option key={codec} value={codec}>
                        {codec}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-xai-sample-rate">Sample Rate</label>
                  <select
                    id="tts-xai-sample-rate"
                    value={String(settings.tts.xaiSampleRate || 24000)}
                    onChange={(e) =>
                      updateXaiSampleRate(Number.parseInt(e.target.value, 10))
                    }
                    disabled={disabled}
                  >
                    {XAI_SAMPLE_RATES.map((sampleRate) => (
                      <option key={sampleRate} value={sampleRate}>
                        {sampleRate}
                      </option>
                    ))}
                  </select>
                </div>
                {(settings.tts.xaiCodec || 'mp3') === 'mp3' && (
                  <div className="settings-field">
                    <label htmlFor="tts-xai-bit-rate">Bit Rate</label>
                    <select
                      id="tts-xai-bit-rate"
                      value={String(settings.tts.xaiBitRate || 128000)}
                      onChange={(e) =>
                        updateXaiBitRate(Number.parseInt(e.target.value, 10))
                      }
                      disabled={disabled}
                    >
                      {XAI_BIT_RATES.map((bitRate) => (
                        <option key={bitRate} value={bitRate}>
                          {bitRate}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {settings.tts.engine === 'unrealSpeech' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-unreal-apikey">API Key</label>
                  <input
                    id="tts-unreal-apikey"
                    type="password"
                    value={settings.tts.unrealSpeechApiKey || ''}
                    onChange={(e) =>
                      updateTtsField('unrealSpeechApiKey', e.target.value)
                    }
                    placeholder="Unreal Speech API key"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-unreal-speaker">Speaker</label>
                  <select
                    id="tts-unreal-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {UNREAL_SPEECH_SPEAKERS.map((speaker) => (
                      <option key={speaker} value={speaker}>
                        {speaker}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-unreal-url">API URL</label>
                  <input
                    id="tts-unreal-url"
                    type="text"
                    value={settings.tts.unrealSpeechApiUrl || ''}
                    onChange={(e) =>
                      updateTtsField('unrealSpeechApiUrl', e.target.value)
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-unreal-codec">Codec</label>
                  <select
                    id="tts-unreal-codec"
                    value={settings.tts.unrealSpeechCodec || 'libmp3lame'}
                    onChange={(e) =>
                      updateTtsField('unrealSpeechCodec', e.target.value)
                    }
                    disabled={disabled}
                  >
                    {UNREAL_SPEECH_CODECS.map((codec) => (
                      <option key={codec} value={codec}>
                        {codec}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-unreal-bitrate">Bitrate</label>
                  <input
                    id="tts-unreal-bitrate"
                    type="text"
                    value={settings.tts.unrealSpeechBitrate || ''}
                    onChange={(e) =>
                      updateTtsField('unrealSpeechBitrate', e.target.value)
                    }
                    placeholder="192k"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-unreal-speed">Speed</label>
                  <input
                    id="tts-unreal-speed"
                    type="number"
                    step="0.05"
                    value={settings.tts.unrealSpeechSpeed || ''}
                    onChange={(e) =>
                      updateTtsField('unrealSpeechSpeed', e.target.value)
                    }
                    placeholder="default"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-unreal-pitch">Pitch</label>
                  <input
                    id="tts-unreal-pitch"
                    type="number"
                    step="0.05"
                    value={settings.tts.unrealSpeechPitch || ''}
                    onChange={(e) =>
                      updateTtsField('unrealSpeechPitch', e.target.value)
                    }
                    placeholder="default"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-unreal-temperature">Temperature</label>
                  <input
                    id="tts-unreal-temperature"
                    type="number"
                    step="0.05"
                    value={settings.tts.unrealSpeechTemperature || ''}
                    onChange={(e) =>
                      updateTtsField('unrealSpeechTemperature', e.target.value)
                    }
                    placeholder="default"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'elevenLabs' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-apikey">API Key</label>
                  <input
                    id="tts-eleven-apikey"
                    type="password"
                    value={settings.tts.elevenLabsApiKey || ''}
                    onChange={(e) =>
                      updateTtsField('elevenLabsApiKey', e.target.value)
                    }
                    placeholder="ElevenLabs API key"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-speaker">Voice</label>
                  <select
                    id="tts-eleven-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={
                      disabled ||
                      !settings.tts.elevenLabsApiKey ||
                      isFetchingElevenLabsVoices ||
                      elevenLabsVoices.length === 0
                    }
                  >
                    {!settings.tts.elevenLabsApiKey && (
                      <option value="">Ingresa API Key</option>
                    )}
                    {settings.tts.elevenLabsApiKey &&
                      isFetchingElevenLabsVoices && (
                        <option value="">Cargando...</option>
                      )}
                    {settings.tts.elevenLabsApiKey &&
                      !isFetchingElevenLabsVoices &&
                      elevenLabsVoices.length === 0 && (
                        <option value="">No se pudo obtener lista de voces</option>
                      )}
                    {elevenLabsVoices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.category
                          ? `${voice.name} (${voice.category})`
                          : voice.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-url">API URL</label>
                  <input
                    id="tts-eleven-url"
                    type="text"
                    value={settings.tts.elevenLabsApiUrl || ''}
                    onChange={(e) =>
                      updateTtsField('elevenLabsApiUrl', e.target.value)
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-model">Model</label>
                  <select
                    id="tts-eleven-model"
                    value={settings.tts.elevenLabsModel || ELEVENLABS_MODELS[0]}
                    onChange={(e) =>
                      updateTtsField('elevenLabsModel', e.target.value)
                    }
                    disabled={disabled}
                  >
                    {ELEVENLABS_MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-format">Output Format</label>
                  <select
                    id="tts-eleven-format"
                    value={
                      settings.tts.elevenLabsOutputFormat ||
                      ELEVENLABS_OUTPUT_FORMATS[0]
                    }
                    onChange={(e) =>
                      updateTtsField('elevenLabsOutputFormat', e.target.value)
                    }
                    disabled={disabled}
                  >
                    {ELEVENLABS_OUTPUT_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-language">Language Code</label>
                  <input
                    id="tts-eleven-language"
                    type="text"
                    value={settings.tts.elevenLabsLanguageCode || ''}
                    onChange={(e) =>
                      updateTtsField('elevenLabsLanguageCode', e.target.value)
                    }
                    placeholder="ja"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-stability">Stability</label>
                  <input
                    id="tts-eleven-stability"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.tts.elevenLabsStability || ''}
                    onChange={(e) =>
                      updateTtsField('elevenLabsStability', e.target.value)
                    }
                    placeholder="0.5"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-similarity">
                    Similarity Boost
                  </label>
                  <input
                    id="tts-eleven-similarity"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.tts.elevenLabsSimilarityBoost || ''}
                    onChange={(e) =>
                      updateTtsField(
                        'elevenLabsSimilarityBoost',
                        e.target.value,
                      )
                    }
                    placeholder="0.75"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-style">Style</label>
                  <input
                    id="tts-eleven-style"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.tts.elevenLabsStyle || ''}
                    onChange={(e) =>
                      updateTtsField('elevenLabsStyle', e.target.value)
                    }
                    placeholder="0"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-speed">Speed</label>
                  <input
                    id="tts-eleven-speed"
                    type="number"
                    min="0.7"
                    max="1.2"
                    step="0.01"
                    value={settings.tts.elevenLabsSpeed || ''}
                    onChange={(e) =>
                      updateTtsField('elevenLabsSpeed', e.target.value)
                    }
                    placeholder="1.0"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-seed">Seed</label>
                  <input
                    id="tts-eleven-seed"
                    type="number"
                    value={settings.tts.elevenLabsSeed || ''}
                    onChange={(e) =>
                      updateTtsField('elevenLabsSeed', e.target.value)
                    }
                    placeholder="optional"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-speaker-boost">
                    Speaker Boost
                  </label>
                  <select
                    id="tts-eleven-speaker-boost"
                    value={settings.tts.elevenLabsUseSpeakerBoost || 'default'}
                    onChange={(e) =>
                      updateTtsField(
                        'elevenLabsUseSpeakerBoost',
                        e.target.value as 'default' | 'true' | 'false',
                      )
                    }
                    disabled={disabled}
                  >
                    <option value="default">Default</option>
                    <option value="true">On</option>
                    <option value="false">Off</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-eleven-normalization">
                    Text Normalization
                  </label>
                  <select
                    id="tts-eleven-normalization"
                    value={
                      settings.tts.elevenLabsApplyTextNormalization || 'default'
                    }
                    onChange={(e) =>
                      updateTtsField(
                        'elevenLabsApplyTextNormalization',
                        e.target.value as 'default' | 'auto' | 'on' | 'off',
                      )
                    }
                    disabled={disabled}
                  >
                    <option value="default">Default</option>
                    <option value="auto">auto</option>
                    <option value="on">on</option>
                    <option value="off">off</option>
                  </select>
                </div>
              </>
            )}

            {settings.tts.engine === 'inworld' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-apikey">API Key</label>
                  <input
                    id="tts-inworld-apikey"
                    type="password"
                    value={settings.tts.inworldApiKey || ''}
                    onChange={(e) =>
                      updateTtsField('inworldApiKey', e.target.value)
                    }
                    placeholder="Inworld Basic Base64 credentials"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-speaker">Voice</label>
                  <select
                    id="tts-inworld-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={
                      disabled ||
                      !settings.tts.inworldApiKey ||
                      isFetchingInworldVoices ||
                      inworldVoices.length === 0
                    }
                  >
                    {!settings.tts.inworldApiKey && (
                      <option value="">Ingresa API Key</option>
                    )}
                    {settings.tts.inworldApiKey && isFetchingInworldVoices && (
                      <option value="">Cargando...</option>
                    )}
                    {settings.tts.inworldApiKey &&
                      !isFetchingInworldVoices &&
                      inworldVoices.length === 0 && (
                        <option value="">No se pudo obtener lista de voces</option>
                      )}
                    {inworldVoices.map((voice) => (
                      <option key={voice.voiceId} value={voice.voiceId}>
                        {voice.displayName || voice.voiceId}
                        {voice.langCode ? ` (${voice.langCode})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-url">API URL</label>
                  <input
                    id="tts-inworld-url"
                    type="text"
                    value={settings.tts.inworldApiUrl || ''}
                    onChange={(e) =>
                      updateTtsField('inworldApiUrl', e.target.value)
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-model">Model</label>
                  <select
                    id="tts-inworld-model"
                    value={settings.tts.inworldModel || INWORLD_MODELS[0]}
                    onChange={(e) =>
                      updateTtsField('inworldModel', e.target.value)
                    }
                    disabled={disabled}
                  >
                    {INWORLD_MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-encoding">Audio Encoding</label>
                  <select
                    id="tts-inworld-encoding"
                    value={
                      settings.tts.inworldAudioEncoding ||
                      INWORLD_AUDIO_ENCODINGS[0]
                    }
                    onChange={(e) =>
                      updateTtsField('inworldAudioEncoding', e.target.value)
                    }
                    disabled={disabled}
                  >
                    {INWORLD_AUDIO_ENCODINGS.map((encoding) => (
                      <option key={encoding} value={encoding}>
                        {encoding}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-language">Language</label>
                  <input
                    id="tts-inworld-language"
                    type="text"
                    value={settings.tts.inworldLanguage || ''}
                    onChange={(e) =>
                      updateTtsField('inworldLanguage', e.target.value)
                    }
                    placeholder="ja-JP"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-sample-rate">Sample Rate</label>
                  <input
                    id="tts-inworld-sample-rate"
                    type="number"
                    value={settings.tts.inworldSampleRateHertz || ''}
                    onChange={(e) =>
                      updateTtsField('inworldSampleRateHertz', e.target.value)
                    }
                    placeholder="48000"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-bitrate">Bit Rate</label>
                  <input
                    id="tts-inworld-bitrate"
                    type="number"
                    value={settings.tts.inworldBitRate || ''}
                    onChange={(e) =>
                      updateTtsField('inworldBitRate', e.target.value)
                    }
                    placeholder="default"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-speaking-rate">
                    Speaking Rate
                  </label>
                  <input
                    id="tts-inworld-speaking-rate"
                    type="number"
                    step="0.05"
                    value={settings.tts.inworldSpeakingRate || ''}
                    onChange={(e) =>
                      updateTtsField('inworldSpeakingRate', e.target.value)
                    }
                    placeholder="default"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-delivery">Delivery Mode</label>
                  <select
                    id="tts-inworld-delivery"
                    value={settings.tts.inworldDeliveryMode || 'default'}
                    onChange={(e) =>
                      updateTtsField(
                        'inworldDeliveryMode',
                        e.target.value as
                          | 'default'
                          | 'STABLE'
                          | 'BALANCED'
                          | 'CREATIVE',
                      )
                    }
                    disabled={disabled}
                  >
                    <option value="default">Default</option>
                    {INWORLD_DELIVERY_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-inworld-temperature">Temperature</label>
                  <input
                    id="tts-inworld-temperature"
                    type="number"
                    step="0.05"
                    value={settings.tts.inworldTemperature || ''}
                    onChange={(e) =>
                      updateTtsField('inworldTemperature', e.target.value)
                    }
                    placeholder="default"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'gradium' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-gradium-apikey">API Key</label>
                  <input
                    id="tts-gradium-apikey"
                    type="password"
                    value={settings.tts.gradiumApiKey || ''}
                    onChange={(e) =>
                      updateTtsField('gradiumApiKey', e.target.value)
                    }
                    placeholder="Gradium API key"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gradium-speaker">Voice</label>
                  <select
                    id="tts-gradium-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {Object.entries(GRADIUM_VOICES).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gradium-url">API URL</label>
                  <input
                    id="tts-gradium-url"
                    type="text"
                    value={settings.tts.gradiumApiUrl || ''}
                    onChange={(e) =>
                      updateTtsField('gradiumApiUrl', e.target.value)
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gradium-output">Output Format</label>
                  <select
                    id="tts-gradium-output"
                    value={settings.tts.gradiumOutputFormat || 'wav'}
                    onChange={(e) =>
                      updateTtsField('gradiumOutputFormat', e.target.value)
                    }
                    disabled={disabled}
                  >
                    {GRADIUM_OUTPUT_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gradium-temperature">Temperature</label>
                  <input
                    id="tts-gradium-temperature"
                    type="number"
                    min="0"
                    max="1.4"
                    step="0.05"
                    value={settings.tts.gradiumTemperature || ''}
                    onChange={(e) =>
                      updateTtsField('gradiumTemperature', e.target.value)
                    }
                    placeholder="default"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gradium-similarity">
                    Voice Similarity
                  </label>
                  <input
                    id="tts-gradium-similarity"
                    type="number"
                    min="1"
                    max="4"
                    step="0.05"
                    value={settings.tts.gradiumVoiceSimilarity || ''}
                    onChange={(e) =>
                      updateTtsField('gradiumVoiceSimilarity', e.target.value)
                    }
                    placeholder="default"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gradium-padding">Padding Bonus</label>
                  <input
                    id="tts-gradium-padding"
                    type="number"
                    min="-2"
                    max="2"
                    step="0.05"
                    value={settings.tts.gradiumPaddingBonus || ''}
                    onChange={(e) =>
                      updateTtsField('gradiumPaddingBonus', e.target.value)
                    }
                    placeholder="default"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-gradium-rewrite">Rewrite Rules</label>
                  <input
                    id="tts-gradium-rewrite"
                    type="text"
                    value={settings.tts.gradiumRewriteRules || ''}
                    onChange={(e) =>
                      updateTtsField('gradiumRewriteRules', e.target.value)
                    }
                    placeholder="en"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'piperPlus' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-piper-base-path">Assets Base Path</label>
                  <input
                    id="tts-piper-base-path"
                    type="text"
                    value={settings.tts.piperPlusBasePath || ''}
                    onChange={(e) => updatePiperPlusBasePath(e.target.value)}
                    placeholder="/piper/"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-piper-config">Model Config File</label>
                  <input
                    id="tts-piper-config"
                    type="text"
                    value={settings.tts.piperPlusModelConfigFile || ''}
                    onChange={(e) =>
                      updatePiperPlusModelConfigFile(e.target.value)
                    }
                    placeholder="tsukuyomi-config.json"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-piper-model">Model File</label>
                  <input
                    id="tts-piper-model"
                    type="text"
                    value={settings.tts.piperPlusModelFile || ''}
                    onChange={(e) => updatePiperPlusModelFile(e.target.value)}
                    placeholder="tsukuyomi-wavlm-300epoch.onnx"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-piper-voice">HTS Voice File</label>
                  <input
                    id="tts-piper-voice"
                    type="text"
                    value={settings.tts.piperPlusVoiceFile || ''}
                    onChange={(e) => updatePiperPlusVoiceFile(e.target.value)}
                    placeholder="mei_normal.htsvoice"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-piper-speed">Speed</label>
                  <input
                    id="tts-piper-speed"
                    type="number"
                    step="0.05"
                    value={settings.tts.piperPlusSpeed || ''}
                    onChange={(e) => updatePiperPlusSpeed(e.target.value)}
                    placeholder="1.0"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-piper-noise-scale">Noise Scale</label>
                  <input
                    id="tts-piper-noise-scale"
                    type="number"
                    step="0.05"
                    value={settings.tts.piperPlusNoiseScale || ''}
                    onChange={(e) => updatePiperPlusNoiseScale(e.target.value)}
                    placeholder="0.667"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <small>
                    Los assets de runtime no se incluyen por tamaño y licencias de terceros.
                    Consulta README Piper Plus Setup y coloca en `public/piper/`:
                    `dist/`, `src/`, `assets/`, `models/`.
                  </small>
                </div>
              </>
            )}

            {settings.tts.engine === 'webSpeech' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-web-speech-voice">Browser Voice</label>
                  <select
                    id="tts-web-speech-voice"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled || isFetchingWebSpeechVoices}
                  >
                    {webSpeechVoices.length > 0 ? (
                      webSpeechVoices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.label}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {isFetchingWebSpeechVoices
                          ? 'Loading browser voices...'
                          : 'Browser default voice'}
                      </option>
                    )}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-web-speech-language">Language</label>
                  <input
                    id="tts-web-speech-language"
                    type="text"
                    value={settings.tts.webSpeechLanguage || ''}
                    onChange={(e) =>
                      updateTtsField('webSpeechLanguage', e.target.value)
                    }
                    placeholder="ja-JP"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-web-speech-rate">Rate (0.1 - 10)</label>
                  <input
                    id="tts-web-speech-rate"
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={settings.tts.webSpeechRate || ''}
                    onChange={(e) =>
                      updateTtsField('webSpeechRate', e.target.value)
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-web-speech-pitch">Pitch (0 - 2)</label>
                  <input
                    id="tts-web-speech-pitch"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.tts.webSpeechPitch || ''}
                    onChange={(e) =>
                      updateTtsField('webSpeechPitch', e.target.value)
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-web-speech-volume">Volume (0 - 1)</label>
                  <input
                    id="tts-web-speech-volume"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.tts.webSpeechVolume || ''}
                    onChange={(e) =>
                      updateTtsField('webSpeechVolume', e.target.value)
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <small>
                    Web Speech API se reproduce directamente desde el navegador. No se puede obtener buffer de audio, por lo que no es compatible con lip-sync en este ejemplo.
                  </small>
                  {fetchError.startsWith('Web Speech') && (
                    <small className="settings-field-error">{fetchError}</small>
                  )}
                </div>
              </>
            )}

            {settings.tts.engine === 'openaiCompatible' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-openai-compatible-apikey">
                    API Key (optional)
                  </label>
                  <input
                    id="tts-openai-compatible-apikey"
                    type="password"
                    value={settings.tts.openAiCompatibleApiKey || ''}
                    onChange={(e) =>
                      updateOpenAiCompatibleApiKey(e.target.value)
                    }
                    placeholder="Sin Authorization si no se ingresa"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-openai-compatible-url">
                    Endpoint URL
                  </label>
                  <input
                    id="tts-openai-compatible-url"
                    type="text"
                    value={settings.tts.openAiCompatibleApiUrl || ''}
                    onChange={(e) =>
                      updateOpenAiCompatibleApiUrl(e.target.value)
                    }
                    placeholder="http://localhost:8880/v1/audio/speech"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-openai-compatible-model-discovered">
                    Model
                  </label>
                  <select
                    id="tts-openai-compatible-model-discovered"
                    value={openAiCompatibleTtsModels.includes(settings.tts.openAiCompatibleModel || '') ? settings.tts.openAiCompatibleModel : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        updateOpenAiCompatibleModel(e.target.value);
                      }
                    }}
                    disabled={disabled || isRefreshingOpenAiCompatibleTtsModels || openAiCompatibleTtsModels.length === 0}
                  >
                    <option value="">Manual entry below</option>
                    {openAiCompatibleTtsModels.map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                  <input
                    id="tts-openai-compatible-model"
                    type="text"
                    aria-label="Manual TTS model"
                    value={settings.tts.openAiCompatibleModel || ''}
                    onChange={(e) => updateOpenAiCompatibleModel(e.target.value)}
                    placeholder="local-model"
                    disabled={disabled}
                  />
                  <button
                    type="button"
                    className="settings-action-button"
                    onClick={() => void refreshOpenAiCompatibleTtsModels()}
                    disabled={disabled || isRefreshingOpenAiCompatibleTtsModels}
                  >
                    <span aria-live="polite">
                      {isRefreshingOpenAiCompatibleTtsModels
                        ? 'Refreshing...'
                        : 'Refresh TTS models'}
                    </span>
                  </button>
                  {openAiCompatibleTtsDiscoveryError && (
                    <p className="settings-field-error" aria-live="polite">
                      {openAiCompatibleTtsDiscoveryError}
                    </p>
                  )}
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-openai-compatible-speaker">
                    Voice (optional)
                  </label>
                  <input
                    id="tts-openai-compatible-speaker"
                    type="text"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    placeholder="No se envía campo voice si está vacío"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-openai-compatible-speed">
                    Speed (0.25 - 4.0)
                  </label>
                  <input
                    id="tts-openai-compatible-speed"
                    type="number"
                    min="0.25"
                    max="4"
                    step="0.05"
                    value={settings.tts.openAiCompatibleSpeed || ''}
                    onChange={(e) =>
                      updateOpenAiCompatibleSpeed(e.target.value)
                    }
                    placeholder="1.0"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-openai-compatible-keep-alive">
                    Retención del modelo en GPU (minutos)
                  </label>
                  <input
                    id="tts-openai-compatible-keep-alive"
                    type="number"
                    min="5"
                    max="1440"
                    step="1"
                    value={
                      settings.tts.openAiCompatibleKeepAliveMinutes || 5
                    }
                    onChange={(e) =>
                      updateOpenAiCompatibleKeepAliveMinutes(
                        Number(e.target.value),
                      )
                    }
                    disabled={disabled}
                  />
                  <small>
                    Mínimo 5 minutos. El contador se reinicia después de cada frase.
                  </small>
                  {ttsKeepAliveSyncError && (
                    <p className="settings-field-error" aria-live="polite">
                      {ttsKeepAliveSyncError}
                    </p>
                  )}
                </div>
                <div className="settings-field settings-field-inline">
                  <label htmlFor="tts-openai-compatible-sentence-pipeline">
                    <input
                      id="tts-openai-compatible-sentence-pipeline"
                      type="checkbox"
                      checked={
                        settings.tts.openAiCompatibleSentencePipeline !== false
                      }
                      onChange={(e) =>
                        updateOpenAiCompatibleSentencePipeline(e.target.checked)
                      }
                      disabled={disabled}
                    />
                    Pipeline TTS por frases
                  </label>
                  <small>
                    Reproduce la primera frase mientras Qwen3 sintetiza las siguientes, manteniendo el orden.
                  </small>
                </div>
              </>
            )}

            {settings.tts.engine === 'voicevox' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-voicevox-speaker">Speaker</label>
                  <select
                    id="tts-voicevox-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {voicevoxSpeakers.length > 0 ? (
                      voicevoxSpeakers.flatMap((sp) =>
                        (sp.styles || []).map((style) => (
                          <option
                            key={`${sp.speaker_uuid}-${style.id}`}
                            value={String(style.id)}
                          >
                            {sp.name} - {style.name}
                          </option>
                        )),
                      )
                    ) : (
                      <option value="">Cargando desde servidor...</option>
                    )}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-voicevox-url">API URL</label>
                  <input
                    id="tts-voicevox-url"
                    type="text"
                    value={settings.tts.voicevoxApiUrl || ''}
                    onChange={(e) => updateVoicevoxApiUrl(e.target.value)}
                    placeholder="http://localhost:50021"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'voicepeak' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-voicepeak-speaker">Speaker</label>
                  <select
                    id="tts-voicepeak-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {VOICEPEAK_SPEAKERS.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-voicepeak-url">API URL</label>
                  <input
                    id="tts-voicepeak-url"
                    type="text"
                    value={settings.tts.voicepeakApiUrl || ''}
                    onChange={(e) => updateVoicepeakApiUrl(e.target.value)}
                    placeholder="http://localhost:20202"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'aivisSpeech' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-aivis-speaker">Speaker</label>
                  <select
                    id="tts-aivis-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {aivisSpeakers.length > 0 ? (
                      aivisSpeakers.flatMap((sp) =>
                        (sp.styles || []).map((style) => (
                          <option
                            key={`${sp.speaker_uuid}-${style.id}`}
                            value={String(style.id)}
                          >
                            {sp.name} - {style.name}
                          </option>
                        )),
                      )
                    ) : (
                      <option value="">Cargando desde servidor...</option>
                    )}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-aivis-url">API URL</label>
                  <input
                    id="tts-aivis-url"
                    type="text"
                    value={settings.tts.aivisSpeechApiUrl || ''}
                    onChange={(e) => updateAivisSpeechApiUrl(e.target.value)}
                    placeholder="http://localhost:10101"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'minimax' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-minimax-apikey">API Key</label>
                  <input
                    id="tts-minimax-apikey"
                    type="password"
                    value={settings.tts.minimaxApiKey || ''}
                    onChange={(e) => updateMinimaxApiKey(e.target.value)}
                    placeholder="MiniMax API Key"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-minimax-groupid">Group ID</label>
                  <input
                    id="tts-minimax-groupid"
                    type="text"
                    value={settings.tts.minimaxGroupId || ''}
                    onChange={(e) => updateMinimaxGroupId(e.target.value)}
                    placeholder="MiniMax Group ID"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-minimax-speaker">
                    Voz (Endpoint: global fijo)
                  </label>
                  <select
                    id="tts-minimax-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={
                      disabled ||
                      !settings.tts.minimaxApiKey ||
                      minimaxVoices.length === 0
                    }
                  >
                    {!settings.tts.minimaxApiKey && (
                      <option value="">
                        Ingresa API Key para obtener la lista
                      </option>
                    )}
                    {settings.tts.minimaxApiKey && isFetchingMinimaxVoices && (
                      <option value="">Cargando lista de voces...</option>
                    )}
                    {settings.tts.minimaxApiKey &&
                      !isFetchingMinimaxVoices &&
                      minimaxVoices.length === 0 && (
                        <option value="">No se pudo obtener la lista</option>
                      )}
                    {minimaxVoices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.voice_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {settings.tts.engine === 'aivisCloud' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-aiviscloud-apikey">API Key</label>
                  <input
                    id="tts-aiviscloud-apikey"
                    type="password"
                    value={settings.tts.aivisCloudApiKey || ''}
                    onChange={(e) => updateAivisCloudApiKey(e.target.value)}
                    placeholder="Aivis Cloud API Key"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-aiviscloud-preset">Voice</label>
                  <select
                    id="tts-aiviscloud-preset"
                    value={selectedAivisCloudPresetId}
                    onChange={(e) =>
                      handleAivisCloudPresetChange(e.target.value)
                    }
                    disabled={disabled}
                  >
                    {AIVIS_CLOUD_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {fetchError &&
              (settings.tts.engine === 'voicevox' ||
                settings.tts.engine === 'aivisSpeech' ||
                settings.tts.engine === 'minimax') && (
                <div
                  style={{
                    color: '#e94560',
                    fontSize: '0.75rem',
                    marginTop: 4,
                  }}
                >
                  {fetchError}
                </div>
              )}
          </>
        )}
      </div>

      <div className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => toggleSection('visual')}
          aria-expanded={expandedSections.visual}
        >
          <h3>Visual</h3>
          <span
            className={`settings-section-chevron${expandedSections.visual ? ' is-open' : ''}`}
          >
            ⌄
          </span>
        </button>

        {expandedSections.visual && (
          <>
            <div className="settings-field">
              <label htmlFor="visual-background-mode">Modo fondo</label>
              <select
                id="visual-background-mode"
                value={settings.visual.backgroundMode}
                onChange={(e) =>
                  updateVisualBackgroundMode(
                    e.target.value as 'default' | 'green',
                  )
                }
                disabled={disabled}
              >
                <option value="default">Fondo normal</option>
                <option value="green">グリーンバック</option>
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="visual-layout-mode">Modo visualización</label>
              <select
                id="visual-layout-mode"
                value={settings.visual.layoutMode}
                onChange={(e) =>
                  updateVisualLayoutMode(e.target.value as 'chat' | 'broadcast')
                }
                disabled={disabled}
              >
                <option value="chat">Chat normal</option>
                <option value="broadcast">Transmisión solo</option>
              </select>
            </div>

            <label className="settings-checkbox-field">
              <input
                type="checkbox"
                checked={settings.visual.showInputInBroadcast}
                onChange={(e) =>
                  updateVisualShowInputInBroadcast(e.target.checked)
                }
                disabled={
                  disabled || settings.visual.layoutMode !== 'broadcast'
                }
              />
              <span>Mostrar campo de entrada en transmisión solo</span>
            </label>

            <div className="settings-field">
              <label htmlFor="background-image">Imagen de fondo</label>
              <div className="settings-file-picker-row">
                <input
                  id="background-image"
                  className="settings-file-input-hidden"
                  type="file"
                  accept="image/*"
                  disabled={disabled}
                  onChange={(e) => {
                    onBackgroundImageChange(e.target.files?.[0] ?? null);
                    e.currentTarget.value = '';
                  }}
                />
                <label
                  htmlFor="background-image"
                  className={`settings-file-trigger${disabled ? ' is-disabled' : ''}`}
                >
                  Seleccionar imagen
                </label>
                <span className="settings-file-hint">PNG / JPG</span>
              </div>
              <div className="settings-file-actions">
                <span className="settings-file-status">
                  {backgroundImageUrl ? 'Configurado' : 'No configurado'}
                </span>
                {backgroundImageUrl && (
                  <button
                    type="button"
                    className="settings-clear-button"
                    onClick={() => onBackgroundImageChange(null)}
                    disabled={disabled}
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => toggleSection('emotionEffects')}
          aria-expanded={expandedSections.emotionEffects}
        >
          <h3>Efectos emoción</h3>
          <span
            className={`settings-section-chevron${expandedSections.emotionEffects ? ' is-open' : ''}`}
          >
            ⌄
          </span>
        </button>

        {expandedSections.emotionEffects && (
          <>
            <div className="settings-field">
              <label htmlFor="live2d-reaction-control-mode">Modo control</label>
              <select
                id="live2d-reaction-control-mode"
                value={settings.visual.live2dReactionControlMode}
                onChange={(event) =>
                  updateVisualLive2DReactionControlMode(
                    event.target.value as Live2DReactionControlMode,
                  )
                }
                disabled={disabled}
              >
                <option value="none">Sin efecto</option>
                <option value="manual">Botón manual</option>
                <option value="linked">Solo sincronizado con habla</option>
              </select>
              <p className="settings-field-hint">
                {settings.visual.live2dReactionControlMode === 'none'
                  ? 'No muestra botones ni efectos al hablar.'
                  : settings.visual.live2dReactionControlMode === 'manual'
                    ? 'Preview de efectos visuales desde botones en el avatar.'
                    : 'Muestra efecto visual cuando recibe tag de emoción del habla.'}
              </p>
            </div>

            <div className="settings-field">
              <span className="settings-field-label">
                Correlación emoción-efecto
              </span>
              <div className="settings-emotion-mapping-list">
                {LIVE2D_REACTION_EMOTION_OPTIONS.map((emotionOption) => (
                  <label
                    key={emotionOption.value}
                    className="settings-emotion-mapping-row"
                    htmlFor={`live2d-effect-${emotionOption.value}`}
                  >
                    <span>{emotionOption.label}</span>
                    <select
                      id={`live2d-effect-${emotionOption.value}`}
                      value={
                        settings.visual.live2dEmotionEffectMap[
                          emotionOption.value
                        ] || 'none'
                      }
                      onChange={(event) =>
                        updateVisualLive2DEmotionEffect(
                          emotionOption.value,
                          event.target.value === 'none'
                            ? null
                            : (event.target.value as Live2DEmotionEffect),
                        )
                      }
                      disabled={disabled}
                    >
                      {LIVE2D_EFFECT_OPTIONS.map((effectOption) => (
                        <option
                          key={effectOption.value}
                          value={effectOption.value}
                        >
                          {effectOption.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="settings-clear-button settings-inline-button"
                onClick={resetVisualLive2DEmotionEffectMap}
                disabled={disabled}
              >
                Restaurar valores iniciales emoción-efecto
              </button>
            </div>
          </>
        )}
      </div>

      <div className="settings-section">
        <h3>Screen Vision</h3>
        <ScreenVisionPanel
          disabled={disabled}
          settings={settings.screenVision}
          controller={screenVisionController}
          onDeviceIdChange={updateScreenVisionDeviceId}
          onPromptChange={updateScreenVisionPrompt}
          onAutoIntervalMsChange={updateScreenVisionAutoIntervalMs}
        />
      </div>

      <StreamSettings
        stream={settings.stream}
        commentIntelligence={settings.commentIntelligence}
        manneri={settings.manneri}
        disabled={disabled}
        isExpanded={expandedSections.stream}
        isCommentIntelligenceExpanded={expandedSections.commentIntelligence}
        isManneriExpanded={expandedSections.manneri}
        onToggleExpand={() => toggleSection('stream')}
        onToggleCommentIntelligence={() => toggleSection('commentIntelligence')}
        onToggleManneri={() => toggleSection('manneri')}
        streamErrorMessage={streamErrorMessage}
        updateStreamPlatform={updateStreamPlatform}
        updateYoutubeApiKey={updateYoutubeApiKey}
        updateYoutubeLiveId={updateYoutubeLiveId}
        updateYoutubeEnabled={updateYoutubeEnabled}
        updateYoutubeCommentIntervalMs={updateYoutubeCommentIntervalMs}
        updateTwitchClientId={updateTwitchClientId}
        updateTwitchAccessToken={updateTwitchAccessToken}
        updateTwitchChannel={updateTwitchChannel}
        updateTwitchEnabled={updateTwitchEnabled}
        updateTwitchCommentIntervalMs={updateTwitchCommentIntervalMs}
        updateTikTokUniqueId={updateTikTokUniqueId}
        updateTikTokRelayUrl={updateTikTokRelayUrl}
        updateTikTokEnabled={updateTikTokEnabled}
        updateTikTokCommentIntervalMs={updateTikTokCommentIntervalMs}
        updateCommentIntelligenceEnabled={updateCommentIntelligenceEnabled}
        updateCommentIntelligenceMode={updateCommentIntelligenceMode}
        updateCommentIntelligenceStreamTopic={
          updateCommentIntelligenceStreamTopic
        }
        updateCommentIntelligenceStreamTitle={
          updateCommentIntelligenceStreamTitle
        }
        updateCommentIntelligenceTopicFilter={
          updateCommentIntelligenceTopicFilter
        }
        updateCommentIntelligenceAnalysisIntervalMs={
          updateCommentIntelligenceAnalysisIntervalMs
        }
        updateCommentIntelligenceMaxCommentsPerBatch={
          updateCommentIntelligenceMaxCommentsPerBatch
        }
        updateCommentIntelligenceMinCommentsForLLMAnalysis={
          updateCommentIntelligenceMinCommentsForLLMAnalysis
        }
        updateCommentIntelligenceBlockHighRiskViewers={
          updateCommentIntelligenceBlockHighRiskViewers
        }
        updateCommentIntelligenceViewerBlockDurationMs={
          updateCommentIntelligenceViewerBlockDurationMs
        }
        updateManneriEnabled={updateManneriEnabled}
        updateManneriSimilarityThreshold={updateManneriSimilarityThreshold}
        updateManneriLookbackWindow={updateManneriLookbackWindow}
        updateManneriInterventionCooldownMs={
          updateManneriInterventionCooldownMs
        }
        updateManneriMinMessageLength={updateManneriMinMessageLength}
      />
    </div>
  );
}
