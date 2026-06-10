import React, {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  AITuberOnAirCoreOptions,
  ChatServiceFactory,
  GPT5_PRESETS,
  GPT5PresetKey,
  CHAT_RESPONSE_LENGTH,
  ChatResponseLength,
  MODEL_GEMINI_NANO,
  type VisionSupportLevel,
  type ElevenLabsApplyTextNormalization,
  allowsReasoningLow,
  allowsReasoningMinimal,
  allowsReasoningNone,
  allowsReasoningXHigh,
  getDefaultReasoningEffortForGPT5Model,
  isGPT5Model,
  isResponsesOnlyGPT5Model,
  refreshOpenRouterFreeModels,
  type MinimaxModel,
  type MinimaxAudioFormat,
  type UnrealSpeechCodec,
  type InworldAudioEncoding,
  type InworldDeliveryMode,
  type GradiumOutputFormat,
  type EmotionTypeForVoicepeak,
  type VoicepeakEmotionWeights,
  type VoiceVoxQueryParameterOverrides,
  type AivisSpeechQueryParameterOverrides,
} from '@aituber-onair/core';

// Constants imports
import {
  openaiModels,
  DEFAULT_CHAT_PROVIDER,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
} from './constants/openai';
import { geminiModels, geminiNanoModels } from './constants/gemini';
import { claudeModels } from './constants/claude';
import { zaiModels } from './constants/zai';
import { kimiModels } from './constants/kimi';
import { xaiModels } from './constants/xai';
import { deepseekModels } from './constants/deepseek';
import { mistralModels } from './constants/mistral';
import { openrouterModels } from './constants/openrouter';
import {
  type VoiceEngineType,
  VOICE_ENGINE_CONFIGS,
  DEFAULT_VOICE_ENGINE,
} from './constants/voiceEngines';
import { randomIntTool, randomIntHandler } from './constants/tools';
import { mcpServers } from './constants/mcp';

// Speaker constants
import { OPENAI_TTS_SPEAKERS } from './constants/speakers/openaiTts';
import { VOICEPEAK_SPEAKERS } from './constants/speakers/voicepeak';
import { AIVIS_CLOUD_MODELS } from './constants/speakers/aivisCloud';

// Default icons
import defaultUserIcon from './assets/icons/default-user.svg';
import defaultAvatarIcon from './assets/icons/default-avatar.svg';
import { AIVIS_SPEECH_API_ENDPOINT } from './constants/speakers/aivisSpeech';
import { VOICEVOX_API_ENDPOINT } from './constants/speakers/voicevox';

// Avatar image generation utilities
import {
  generateAvatarImage,
  createAvatarPrompt,
  revokeObjectUrl,
} from './utils/geminiImageGeneration';
import { useGeminiNanoStatus } from './hooks/useGeminiNanoStatus';
import { usePiperPlusStatus } from './hooks/usePiperPlusStatus';

// when use MCP, uncomment the following line
// import { createMcpToolHandler } from './mcpClient';

// MiniMax model options with descriptions
const MINIMAX_MODELS: Record<MinimaxModel, string> = {
  'speech-2.6-hd':
    'Latest flagship HD model with ultra-high fidelity and natural prosody.',
  'speech-2.6-turbo':
    'Latest Turbo model optimized for low latency and real-time responses.',
  'speech-2.5-hd-preview':
    'The brand new HD model. Ultimate Similarity, Ultra-High Quality',
  'speech-2.5-turbo-preview':
    'The brand new Turbo model. Ultimate Value, 40 Languages',
  'speech-02-hd':
    'Superior rhythm and stability, with outstanding performance in replication similarity and sound quality.',
  'speech-02-turbo':
    'Superior rhythm and stability, with enhanced multilingual capabilities and excellent performance.',
  'speech-01-hd': 'Rich Voices, Expressive Emotions, Authentic Languages',
  'speech-01-turbo': 'Excellent performance and low latency',
};

type ReasoningEffortLevel =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh';
type ChatProvider = NonNullable<AITuberOnAirCoreOptions['chatProvider']>;

// MiniMax Voice IDs with descriptions
const MINIMAX_VOICES: Record<string, string> = {
  'male-qn-qingse': 'Male - Qingse (Default)',
  Wise_Woman: 'Wise Woman',
  Friendly_Person: 'Friendly Person',
  Inspirational_girl: 'Inspirational Girl',
  Deep_Voice_Man: 'Deep Voice Man',
  Calm_Woman: 'Calm Woman',
  Casual_Guy: 'Casual Guy',
  Lively_Girl: 'Lively Girl',
  Patient_Man: 'Patient Man',
  Young_Knight: 'Young Knight',
  Determined_Man: 'Determined Man',
  Lovely_Girl: 'Lovely Girl',
  Decent_Boy: 'Decent Boy',
  Imposing_Manner: 'Imposing Manner',
  Elegant_Man: 'Elegant Man',
  Abbess: 'Abbess',
  Sweet_Girl_2: 'Sweet Girl 2',
  Exuberant_Girl: 'Exuberant Girl',
};

const XAI_TTS_SPEAKERS = ['ara', 'eve', 'leo', 'rex', 'sal'] as const;
const UNREAL_SPEECH_SPEAKERS = [
  'af_bella',
  'af_sarah',
  'am_adam',
  'am_michael',
] as const;
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
const GRADIUM_OUTPUT_FORMATS: GradiumOutputFormat[] = [
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
];

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
}

interface ElevenLabsVoiceListResponse {
  voices?: ElevenLabsVoice[];
}

interface InworldVoice {
  voiceId: string;
  displayName?: string;
  langCode?: string;
  promptLanguages?: string[];
  gender?: string;
}

interface InworldVoiceListResponse {
  voices?: InworldVoice[];
  nextPageToken?: string;
}

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
const PIPER_PLUS_BASE_PATH = `${import.meta.env.BASE_URL}piper/`;
const PIPER_PLUS_MODEL_CONFIG_FILE = 'tsukuyomi-config.json';
const PIPER_PLUS_MODEL_FILE = 'tsukuyomi-wavlm-300epoch.onnx';
const PIPER_PLUS_VOICE_FILE = 'mei_normal.htsvoice';

type BaseMessage = { id: string; role: 'user' | 'assistant' };
type TextMessage = BaseMessage & { kind: 'text'; content: string };
type ImageMessage = BaseMessage & { kind: 'image'; dataUrl: string };
type Message = TextMessage | ImageMessage;

type AivisCloudBooleanOption = 'default' | 'true' | 'false';
type AivisCloudOutputFormatOption =
  | 'default'
  | 'wav'
  | 'flac'
  | 'mp3'
  | 'aac'
  | 'opus';
type AivisCloudOutputSamplingRateOption =
  | 'default'
  | '8000'
  | '11025'
  | '12000'
  | '16000'
  | '22050'
  | '24000'
  | '44100'
  | '48000';
type AivisCloudOutputChannelOption = 'default' | 'mono' | 'stereo';
type VoicePeakEmotionMode = 'single' | 'weighted';
const VOICEPEAK_WEIGHTED_EMOTION_KEYS = [
  'happy',
  'fun',
  'angry',
  'sad',
  'surprised',
] as const;
type VoicePeakWeightedEmotionKey =
  (typeof VOICEPEAK_WEIGHTED_EMOTION_KEYS)[number];
type VoicePeakWeightedEmotionInputs = Record<
  VoicePeakWeightedEmotionKey,
  string
>;

function createInitialVoicePeakEmotionWeights(): VoicePeakWeightedEmotionInputs {
  return {
    happy: '',
    fun: '',
    angry: '',
    sad: '',
    surprised: '',
  };
}

// UI Messages
const DO_NOT_SET_API_KEY_MESSAGE = 'API Keyを入力してください。';
const CORE_SETTINGS_APPLIED_MESSAGE = 'AITuberOnAirCoreの設定を反映しました！';
const DO_NOT_SETTINGS_MESSAGE = 'まずは「設定」を行ってください。';
const CORE_NOT_INITIALIZED_MESSAGE = 'AITuberOnAirCoreが初期化されていません。';
const OPENAI_COMPATIBLE_DEFAULT_MODEL = 'local-model';
const OPENAI_COMPATIBLE_DEFAULT_ENDPOINT =
  'http://localhost:11434/v1/chat/completions';
const OPENAI_COMPATIBLE_TTS_DEFAULT_ENDPOINT =
  'http://localhost:8880/v1/audio/speech';
const OPENAI_COMPATIBLE_ENDPOINT_REQUIRED_MESSAGE =
  'OpenAI-CompatibleのEndpoint URLを入力してください。';
const REACT_BASIC_STORAGE_KEY = 'AITuberOnAirCore_example_react-basic';
const DEFAULT_OPENROUTER_MAX_CANDIDATES = 1;
const DEFAULT_OPENROUTER_MAX_WORKING = 10;
const RESPONSE_LENGTH_LABELS: Record<ChatResponseLength, string> = {
  [CHAT_RESPONSE_LENGTH.VERY_SHORT]: 'Very Short',
  [CHAT_RESPONSE_LENGTH.SHORT]: 'Short',
  [CHAT_RESPONSE_LENGTH.MEDIUM]: 'Medium',
  [CHAT_RESPONSE_LENGTH.LONG]: 'Long',
  [CHAT_RESPONSE_LENGTH.VERY_LONG]: 'Very Long',
  [CHAT_RESPONSE_LENGTH.DEEP]: 'Deep',
};
const RESPONSE_LENGTH_BASE_TOKENS: Record<ChatResponseLength, number> = {
  [CHAT_RESPONSE_LENGTH.VERY_SHORT]: 40,
  [CHAT_RESPONSE_LENGTH.SHORT]: 100,
  [CHAT_RESPONSE_LENGTH.MEDIUM]: 200,
  [CHAT_RESPONSE_LENGTH.LONG]: 300,
  [CHAT_RESPONSE_LENGTH.VERY_LONG]: 1000,
  [CHAT_RESPONSE_LENGTH.DEEP]: 5000,
};

interface OpenRouterDynamicFreeModelsState {
  models: string[];
  fetchedAt: number;
  maxCandidates: number;
}

interface ReactBasicStorageShape {
  openRouterDynamicFreeModels?: Partial<OpenRouterDynamicFreeModelsState>;
}

function normalizeOpenRouterModelIds(modelIds: string[]): string[] {
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

function normalizeMaxCandidates(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_OPENROUTER_MAX_CANDIDATES;
  }
  return Math.max(1, Math.floor(value));
}

function normalizeOpenRouterDynamicState(
  input?: Partial<OpenRouterDynamicFreeModelsState>,
): OpenRouterDynamicFreeModelsState {
  return {
    models: normalizeOpenRouterModelIds(input?.models || []),
    fetchedAt:
      typeof input?.fetchedAt === 'number' && Number.isFinite(input.fetchedAt)
        ? input.fetchedAt
        : 0,
    maxCandidates: normalizeMaxCandidates(input?.maxCandidates),
  };
}

function loadOpenRouterDynamicState(): OpenRouterDynamicFreeModelsState {
  try {
    const raw = localStorage.getItem(REACT_BASIC_STORAGE_KEY);
    if (!raw) {
      return normalizeOpenRouterDynamicState();
    }
    const parsed = JSON.parse(raw) as ReactBasicStorageShape;
    return normalizeOpenRouterDynamicState(parsed.openRouterDynamicFreeModels);
  } catch {
    return normalizeOpenRouterDynamicState();
  }
}

function saveOpenRouterDynamicState(
  value: OpenRouterDynamicFreeModelsState,
): void {
  try {
    const raw = localStorage.getItem(REACT_BASIC_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ReactBasicStorageShape) : {};
    const next: ReactBasicStorageShape = {
      ...parsed,
      openRouterDynamicFreeModels: {
        models: normalizeOpenRouterModelIds(value.models),
        fetchedAt: value.fetchedAt,
        maxCandidates: normalizeMaxCandidates(value.maxCandidates),
      },
    };
    localStorage.setItem(REACT_BASIC_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function buildOpenRouterEndpoint(baseUrl: string, path: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return `${trimmed}${path}`;
}

const App: React.FC = () => {
  const idCounter = useRef(0);
  const nextId = () => (++idCounter.current).toString();

  const [showSettings, setShowSettings] = useState(false);

  // initialized flag (true if configured)
  const [isConfigured, setIsConfigured] = useState(false);

  // Settings modal tab state
  const [activeTab, setActiveTab] = useState<'llm' | 'voice' | 'avatar'>('llm');

  // configuration form states
  const [apiKey, setApiKey] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>(
    DEFAULT_SYSTEM_PROMPT,
  );
  const [chatProvider, setChatProvider] = useState<ChatProvider>(
    DEFAULT_CHAT_PROVIDER as ChatProvider,
  );
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [kimiBaseUrl, setKimiBaseUrl] = useState<string>('');
  const [openRouterBaseUrl, setOpenRouterBaseUrl] = useState<string>('');
  const [openRouterDynamicState, setOpenRouterDynamicState] =
    useState<OpenRouterDynamicFreeModelsState>(loadOpenRouterDynamicState);
  const [isFetchingOpenRouterFreeModels, setIsFetchingOpenRouterFreeModels] =
    useState<boolean>(false);
  const [openRouterRefreshError, setOpenRouterRefreshError] =
    useState<string>('');
  const [openAICompatibleEndpoint, setOpenAICompatibleEndpoint] =
    useState<string>(OPENAI_COMPATIBLE_DEFAULT_ENDPOINT);

  // DeepWiki MCP enable flag
  const [enableDeepWikiMcp, setEnableDeepWikiMcp] = useState<boolean>(false);

  // GPT-5 and response settings
  const [responseLength, setResponseLength] = useState<ChatResponseLength>(
    CHAT_RESPONSE_LENGTH.MEDIUM,
  );
  const [gpt5Preset, setGpt5Preset] = useState<GPT5PresetKey | 'custom'>(
    'casual',
  );
  const [verbosity, setVerbosity] = useState<'low' | 'medium' | 'high'>(
    'medium',
  );
  const [reasoning_effort, setReasoningEffort] =
    useState<ReasoningEffortLevel>('medium');
  const [gpt5EndpointPreference, setGpt5EndpointPreference] = useState<
    'chat' | 'responses'
  >('chat');

  const normalizeReasoningEffortForModel = (
    targetModel: string | undefined,
    effort?: ReasoningEffortLevel,
  ): ReasoningEffortLevel => {
    if (!targetModel || !isGPT5Model(targetModel)) {
      if (!effort || effort === 'none') {
        return 'medium';
      }
      return effort;
    }

    if (!effort) {
      return getDefaultReasoningEffortForGPT5Model(targetModel);
    }

    // Round unsupported values to the nearest supported level, matching the
    // normalization performed by the chat package.
    if (
      (effort === 'none' && !allowsReasoningNone(targetModel)) ||
      (effort === 'minimal' && !allowsReasoningMinimal(targetModel))
    ) {
      if (effort === 'minimal' && allowsReasoningNone(targetModel)) {
        return 'none';
      }
      if (effort === 'none' && allowsReasoningMinimal(targetModel)) {
        return 'minimal';
      }
      return allowsReasoningLow(targetModel) ? 'low' : 'medium';
    }
    if (effort === 'low' && !allowsReasoningLow(targetModel)) {
      return 'medium';
    }
    if (effort === 'xhigh' && !allowsReasoningXHigh(targetModel)) {
      return 'high';
    }
    return effort;
  };

  // chat messages state
  const [messages, setMessages] = useState<Message[]>([]);
  // reference to the latest messages
  const messagesRef = useRef<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [partialTextBuffer, setPartialTextBuffer] = useState('');

  // image attachment state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const visionSupportLevel: VisionSupportLevel = model
    ? ChatServiceFactory.getVisionSupportLevelForModel(chatProvider, model)
    : 'unsupported';
  const supportsVision = visionSupportLevel !== 'unsupported';

  const isMcpSupportedProvider =
    chatProvider === 'openai' ||
    chatProvider === 'gemini' ||
    chatProvider === 'claude';
  const geminiNano = useGeminiNanoStatus(chatProvider === 'gemini-nano');
  const piperPlus = usePiperPlusStatus();
  const requiresApiKey =
    chatProvider !== 'openai-compatible' && chatProvider !== 'gemini-nano';
  const openRouterAvailableModels = useMemo(() => {
    const seen = new Set(openrouterModels);
    const dynamic = openRouterDynamicState.models.filter((modelId) => {
      const trimmed = modelId.trim();
      if (!trimmed || seen.has(trimmed)) {
        return false;
      }
      seen.add(trimmed);
      return true;
    });
    return [...openrouterModels, ...dynamic];
  }, [openRouterDynamicState.models]);

  // Voice settings state
  const [selectedVoiceEngine, setSelectedVoiceEngine] =
    useState<VoiceEngineType>(DEFAULT_VOICE_ENGINE);
  const [voiceApiKeys, setVoiceApiKeys] = useState<Record<string, string>>({});
  const [minimaxGroupId, setMinimaxGroupId] = useState<string>('');
  const [minimaxModel, setMinimaxModel] =
    useState<MinimaxModel>('speech-2.6-hd');
  const [minimaxLanguageBoost, setMinimaxLanguageBoost] =
    useState<string>('Japanese');
  const [minimaxSpeed, setMinimaxSpeed] = useState<string>('');
  const [minimaxVolume, setMinimaxVolume] = useState<string>('');
  const [minimaxPitch, setMinimaxPitch] = useState<string>('');
  const [minimaxSampleRate, setMinimaxSampleRate] = useState<string>('32000');
  const [minimaxBitrate, setMinimaxBitrate] = useState<string>('128000');
  const [minimaxAudioFormat, setMinimaxAudioFormat] =
    useState<MinimaxAudioFormat>('mp3');
  const [minimaxAudioChannel, setMinimaxAudioChannel] = useState<'1' | '2'>(
    '1',
  );
  const [xaiLanguage, setXaiLanguage] = useState<string>('auto');
  const [xaiCodec, setXaiCodec] = useState<string>('mp3');
  const [xaiSampleRate, setXaiSampleRate] = useState<string>('24000');
  const [xaiBitRate, setXaiBitRate] = useState<string>('128000');
  const [unrealSpeechBitrate, setUnrealSpeechBitrate] =
    useState<string>('192k');
  const [unrealSpeechSpeed, setUnrealSpeechSpeed] = useState<string>('');
  const [unrealSpeechPitch, setUnrealSpeechPitch] = useState<string>('');
  const [unrealSpeechCodec, setUnrealSpeechCodec] =
    useState<UnrealSpeechCodec>('libmp3lame');
  const [unrealSpeechTemperature, setUnrealSpeechTemperature] =
    useState<string>('');
  const [elevenLabsModel, setElevenLabsModel] = useState<string>(
    String(
      VOICE_ENGINE_CONFIGS.elevenLabs.defaultParams?.model ||
        ELEVENLABS_MODELS[0],
    ),
  );
  const [elevenLabsOutputFormat, setElevenLabsOutputFormat] = useState<string>(
    String(
      VOICE_ENGINE_CONFIGS.elevenLabs.defaultParams?.outputFormat ||
        ELEVENLABS_OUTPUT_FORMATS[0],
    ),
  );
  const [elevenLabsLanguageCode, setElevenLabsLanguageCode] =
    useState<string>('');
  const [elevenLabsStability, setElevenLabsStability] = useState<string>('');
  const [elevenLabsSimilarityBoost, setElevenLabsSimilarityBoost] =
    useState<string>('');
  const [elevenLabsStyle, setElevenLabsStyle] = useState<string>('');
  const [elevenLabsUseSpeakerBoost, setElevenLabsUseSpeakerBoost] = useState<
    'default' | 'true' | 'false'
  >('default');
  const [elevenLabsSpeed, setElevenLabsSpeed] = useState<string>('');
  const [elevenLabsSeed, setElevenLabsSeed] = useState<string>('');
  const [
    elevenLabsApplyTextNormalization,
    setElevenLabsApplyTextNormalization,
  ] = useState<'default' | ElevenLabsApplyTextNormalization>('default');
  const [inworldModel, setInworldModel] = useState<string>(
    String(
      VOICE_ENGINE_CONFIGS.inworld.defaultParams?.model || INWORLD_MODELS[0],
    ),
  );
  const [inworldAudioEncoding, setInworldAudioEncoding] =
    useState<InworldAudioEncoding>(
      (VOICE_ENGINE_CONFIGS.inworld.defaultParams
        ?.audioEncoding as InworldAudioEncoding) || 'MP3',
    );
  const [inworldSampleRateHertz, setInworldSampleRateHertz] = useState<string>(
    String(
      VOICE_ENGINE_CONFIGS.inworld.defaultParams?.sampleRateHertz || 48000,
    ),
  );
  const [inworldBitRate, setInworldBitRate] = useState<string>('');
  const [inworldSpeakingRate, setInworldSpeakingRate] = useState<string>('');
  const [inworldLanguage, setInworldLanguage] = useState<string>(
    String(VOICE_ENGINE_CONFIGS.inworld.defaultParams?.language || 'ja-JP'),
  );
  const [inworldDeliveryMode, setInworldDeliveryMode] = useState<
    'default' | InworldDeliveryMode
  >('default');
  const [inworldTemperature, setInworldTemperature] = useState<string>('');
  const [gradiumOutputFormat, setGradiumOutputFormat] =
    useState<GradiumOutputFormat>('wav');
  const [gradiumTemperature, setGradiumTemperature] = useState<string>('');
  const [gradiumVoiceSimilarity, setGradiumVoiceSimilarity] =
    useState<string>('');
  const [gradiumPaddingBonus, setGradiumPaddingBonus] = useState<string>('');
  const [gradiumRewriteRules, setGradiumRewriteRules] = useState<string>('');
  const [voicevoxSpeedScale, setVoicevoxSpeedScale] = useState<string>('');
  const [voicevoxPitchScale, setVoicevoxPitchScale] = useState<string>('');
  const [voicevoxIntonationScale, setVoicevoxIntonationScale] =
    useState<string>('');
  const [voicevoxVolumeScale, setVoicevoxVolumeScale] = useState<string>('');
  const [voicevoxPrePhonemeLength, setVoicevoxPrePhonemeLength] =
    useState<string>('');
  const [voicevoxPostPhonemeLength, setVoicevoxPostPhonemeLength] =
    useState<string>('');
  const [voicevoxPauseLength, setVoicevoxPauseLength] = useState<string>('');
  const [voicevoxPauseLengthScale, setVoicevoxPauseLengthScale] =
    useState<string>('');
  const [voicevoxOutputSamplingRate, setVoicevoxOutputSamplingRate] =
    useState<string>('default');
  const [voicevoxOutputStereo, setVoicevoxOutputStereo] = useState<
    'default' | 'mono' | 'stereo'
  >('default');
  const [voicevoxEnableKatakanaEnglish, setVoicevoxEnableKatakanaEnglish] =
    useState<'default' | 'true' | 'false'>('default');
  const [
    voicevoxEnableInterrogativeUpspeak,
    setVoicevoxEnableInterrogativeUpspeak,
  ] = useState<'default' | 'true' | 'false'>('default');
  const [voicevoxCoreVersion, setVoicevoxCoreVersion] = useState<string>('');
  const [voicepeakEmotionMode, setVoicepeakEmotionMode] =
    useState<VoicePeakEmotionMode>('single');
  const [voicepeakEmotion, setVoicepeakEmotion] =
    useState<EmotionTypeForVoicepeak>('neutral');
  const [voicepeakEmotionWeights, setVoicepeakEmotionWeights] =
    useState<VoicePeakWeightedEmotionInputs>(
      createInitialVoicePeakEmotionWeights,
    );
  const [voicepeakSpeed, setVoicepeakSpeed] = useState<string>('');
  const [voicepeakPitch, setVoicepeakPitch] = useState<string>('');
  const [openaiSpeed, setOpenaiSpeed] = useState<string>('');
  const [openaiCompatibleApiUrl, setOpenaiCompatibleApiUrl] = useState<string>(
    OPENAI_COMPATIBLE_TTS_DEFAULT_ENDPOINT,
  );
  const [openaiCompatibleModel, setOpenaiCompatibleModel] = useState<string>(
    OPENAI_COMPATIBLE_DEFAULT_MODEL,
  );
  const [openaiCompatibleSpeed, setOpenaiCompatibleSpeed] =
    useState<string>('');
  const [geminiTtsModel, setGeminiTtsModel] = useState<string>(
    String(
      VOICE_ENGINE_CONFIGS.geminiTts.defaultParams?.model ||
        GEMINI_TTS_MODELS[0],
    ),
  );
  const [geminiTtsLanguageCode, setGeminiTtsLanguageCode] = useState<string>(
    String(
      VOICE_ENGINE_CONFIGS.geminiTts.defaultParams?.languageCode || 'ja-JP',
    ),
  );
  const [geminiTtsPrompt, setGeminiTtsPrompt] = useState<string>('');
  const [aivisCloudModelUuid, setAivisCloudModelUuid] = useState<string>('');
  const [aivisCloudSpeakerUuid, setAivisCloudSpeakerUuid] =
    useState<string>('');
  const [aivisCloudStyleId, setAivisCloudStyleId] = useState<string>('');
  const [aivisCloudStyleName, setAivisCloudStyleName] = useState<string>('');
  const [aivisCloudUseSsml, setAivisCloudUseSsml] =
    useState<AivisCloudBooleanOption>('default');
  const [aivisCloudLanguage, setAivisCloudLanguage] = useState<string>('ja');
  const [aivisCloudSpeakingRate, setAivisCloudSpeakingRate] =
    useState<string>('');
  const [aivisCloudEmotionalIntensity, setAivisCloudEmotionalIntensity] =
    useState<string>('');
  const [aivisCloudTempoDynamics, setAivisCloudTempoDynamics] =
    useState<string>('');
  const [aivisCloudPitch, setAivisCloudPitch] = useState<string>('');
  const [aivisCloudVolume, setAivisCloudVolume] = useState<string>('');
  const [aivisCloudLeadingSilence, setAivisCloudLeadingSilence] =
    useState<string>('');
  const [aivisCloudTrailingSilence, setAivisCloudTrailingSilence] =
    useState<string>('');
  const [aivisCloudLineBreakSilence, setAivisCloudLineBreakSilence] =
    useState<string>('');
  const [aivisCloudOutputFormat, setAivisCloudOutputFormat] =
    useState<AivisCloudOutputFormatOption>('default');
  const [aivisCloudOutputBitrate, setAivisCloudOutputBitrate] =
    useState<string>('');
  const [aivisCloudOutputSamplingRate, setAivisCloudOutputSamplingRate] =
    useState<AivisCloudOutputSamplingRateOption>('default');
  const [aivisCloudOutputChannels, setAivisCloudOutputChannels] =
    useState<AivisCloudOutputChannelOption>('default');
  const [aivisCloudUserDictionaryUuid, setAivisCloudUserDictionaryUuid] =
    useState<string>('');
  const [aivisCloudEnableBillingLogs, setAivisCloudEnableBillingLogs] =
    useState<AivisCloudBooleanOption>('default');
  const [aivisSpeedScale, setAivisSpeedScale] = useState<string>('');
  const [aivisPitchScale, setAivisPitchScale] = useState<string>('');
  const [aivisIntonationScale, setAivisIntonationScale] = useState<string>('');
  const [aivisTempoDynamicsScale, setAivisTempoDynamicsScale] =
    useState<string>('');
  const [aivisVolumeScale, setAivisVolumeScale] = useState<string>('');
  const [aivisPrePhonemeLength, setAivisPrePhonemeLength] =
    useState<string>('');
  const [aivisPostPhonemeLength, setAivisPostPhonemeLength] =
    useState<string>('');
  const [aivisPauseLength, setAivisPauseLength] = useState<string>('');
  const [aivisPauseLengthScale, setAivisPauseLengthScale] =
    useState<string>('');
  const [aivisOutputSamplingRate, setAivisOutputSamplingRate] =
    useState<string>('default');
  const [aivisOutputStereo, setAivisOutputStereo] = useState<
    'default' | 'mono' | 'stereo'
  >('default');
  const [piperPlusSpeed, setPiperPlusSpeed] = useState<string>('');
  const [piperPlusNoiseScale, setPiperPlusNoiseScale] = useState<string>('');
  const [selectedSpeakers, setSelectedSpeakers] = useState<
    Record<string, string | number>
  >({
    openai: 'alloy',
    geminiTts: 'Zephyr',
    openaiCompatible: '',
    voicevox: '',
    aivisSpeech: '',
    aivisCloud: 'a59cb814-0083-4369-8542-f51a29e72af7',
    voicepeak: 'f1',
    minimax: 'male-qn-qingse',
    xai: 'eve',
    unrealSpeech: 'af_bella',
    elevenLabs: '',
    inworld: '',
    gradium: 'YTpq7expH9539ERJ',
    piperPlus: 'default',
  });
  const [availableSpeakers, setAvailableSpeakers] = useState<
    Record<string, any[]>
  >({});
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>(
    [],
  );
  const [isFetchingElevenLabsVoices, setIsFetchingElevenLabsVoices] =
    useState(false);
  const [elevenLabsVoiceFetchError, setElevenLabsVoiceFetchError] =
    useState('');
  const [inworldVoices, setInworldVoices] = useState<InworldVoice[]>([]);
  const [isFetchingInworldVoices, setIsFetchingInworldVoices] = useState(false);
  const [inworldVoiceFetchError, setInworldVoiceFetchError] = useState('');

  // Voice playback state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Avatar settings state
  const [avatarImageUrl, setAvatarImageUrl] =
    useState<string>(defaultAvatarIcon);
  const [enableAvatarGeneration, setEnableAvatarGeneration] =
    useState<boolean>(false);
  const [geminiImageApiKey, setGeminiImageApiKey] = useState<string>('');
  const [generatedAvatarImage, setGeneratedAvatarImage] = useState<
    string | null
  >(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState<boolean>(false);

  // AITuberOnAirCore instance reference
  const aituberRef = useRef<AITuberOnAirCore | null>(null);

  /**
   * Fetch speakers for dynamic voice engines
   */
  const fetchSpeakers = async (engine: VoiceEngineType) => {
    try {
      switch (engine) {
        case 'voicevox': {
          const response = await fetch(`${VOICEVOX_API_ENDPOINT}/speakers`);
          if (response.ok) {
            const speakers = await response.json();
            setAvailableSpeakers((prev) => ({ ...prev, voicevox: speakers }));
            // Auto-select first speaker if none selected
            if (!selectedSpeakers.voicevox && speakers.length > 0) {
              const firstSpeaker = speakers[0];
              const speakerId =
                firstSpeaker.styles?.[0]?.id || firstSpeaker.speaker_uuid;
              setSelectedSpeakers((prev) => ({ ...prev, voicevox: speakerId }));
            }
          }
          break;
        }
        case 'aivisSpeech': {
          const response = await fetch(`${AIVIS_SPEECH_API_ENDPOINT}/speakers`);
          if (response.ok) {
            const speakers = await response.json();
            setAvailableSpeakers((prev) => ({
              ...prev,
              aivisSpeech: speakers,
            }));
            // Auto-select first speaker if none selected
            if (!selectedSpeakers.aivisSpeech && speakers.length > 0) {
              const firstStyle = speakers[0]?.styles?.[0];
              if (firstStyle) {
                setSelectedSpeakers((prev) => ({
                  ...prev,
                  aivisSpeech: firstStyle.id,
                }));
              }
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch speakers for ${engine}:`, error);
    }
  };

  /**
   * when voice engine changes, fetch speakers if needed
   */
  useEffect(() => {
    if (selectedVoiceEngine !== 'none') {
      if (['voicevox', 'aivisSpeech'].includes(selectedVoiceEngine)) {
        fetchSpeakers(selectedVoiceEngine);
      }
    }

    if (selectedVoiceEngine === 'voicevox') {
      setVoicevoxSpeedScale('');
      setVoicevoxPitchScale('');
      setVoicevoxIntonationScale('');
      setVoicevoxVolumeScale('');
      setVoicevoxPrePhonemeLength('');
      setVoicevoxPostPhonemeLength('');
      setVoicevoxPauseLength('');
      setVoicevoxPauseLengthScale('');
      setVoicevoxOutputSamplingRate('default');
      setVoicevoxOutputStereo('default');
      setVoicevoxEnableKatakanaEnglish('default');
      setVoicevoxEnableInterrogativeUpspeak('default');
      setVoicevoxCoreVersion('');
    }

    setVoicepeakEmotionMode('single');
    setVoicepeakEmotion('neutral');
    setVoicepeakEmotionWeights(createInitialVoicePeakEmotionWeights());
    setVoicepeakSpeed('');
    setVoicepeakPitch('');

    if (selectedVoiceEngine === 'openai') {
      setOpenaiSpeed('');
    }

    if (selectedVoiceEngine === 'openaiCompatible') {
      setOpenaiCompatibleApiUrl(OPENAI_COMPATIBLE_TTS_DEFAULT_ENDPOINT);
      setOpenaiCompatibleModel(OPENAI_COMPATIBLE_DEFAULT_MODEL);
      setOpenaiCompatibleSpeed('');
    }

    if (selectedVoiceEngine === 'geminiTts') {
      setGeminiTtsModel(
        String(
          VOICE_ENGINE_CONFIGS.geminiTts.defaultParams?.model ||
            GEMINI_TTS_MODELS[0],
        ),
      );
      setGeminiTtsLanguageCode(
        String(
          VOICE_ENGINE_CONFIGS.geminiTts.defaultParams?.languageCode || 'ja-JP',
        ),
      );
      setGeminiTtsPrompt('');
    }

    if (selectedVoiceEngine === 'aivisCloud') {
      setAivisCloudModelUuid('');
      setAivisCloudSpeakerUuid('');
      setAivisCloudStyleId('');
      setAivisCloudStyleName('');
      setAivisCloudUseSsml('default');
      setAivisCloudLanguage('ja');
      setAivisCloudSpeakingRate('');
      setAivisCloudEmotionalIntensity('');
      setAivisCloudTempoDynamics('');
      setAivisCloudPitch('');
      setAivisCloudVolume('');
      setAivisCloudLeadingSilence('');
      setAivisCloudTrailingSilence('');
      setAivisCloudLineBreakSilence('');
      setAivisCloudOutputFormat('default');
      setAivisCloudOutputBitrate('');
      setAivisCloudOutputSamplingRate('default');
      setAivisCloudOutputChannels('default');
      setAivisCloudUserDictionaryUuid('');
      setAivisCloudEnableBillingLogs('default');
    }

    if (selectedVoiceEngine === 'aivisSpeech') {
      setAivisSpeedScale('');
      setAivisPitchScale('');
      setAivisIntonationScale('');
      setAivisTempoDynamicsScale('');
      setAivisVolumeScale('');
      setAivisPrePhonemeLength('');
      setAivisPostPhonemeLength('');
      setAivisPauseLength('');
      setAivisPauseLengthScale('');
      setAivisOutputSamplingRate('default');
      setAivisOutputStereo('default');
    }

    if (selectedVoiceEngine === 'xai') {
      setXaiLanguage('auto');
      setXaiCodec('mp3');
      setXaiSampleRate('24000');
      setXaiBitRate('128000');
    }

    if (selectedVoiceEngine === 'unrealSpeech') {
      setUnrealSpeechBitrate(
        String(
          VOICE_ENGINE_CONFIGS.unrealSpeech.defaultParams?.bitrate || '192k',
        ),
      );
      setUnrealSpeechSpeed('');
      setUnrealSpeechPitch('');
      setUnrealSpeechCodec(
        (VOICE_ENGINE_CONFIGS.unrealSpeech.defaultParams
          ?.codec as UnrealSpeechCodec) || 'libmp3lame',
      );
      setUnrealSpeechTemperature('');
    }

    if (selectedVoiceEngine === 'elevenLabs') {
      setElevenLabsModel(
        String(
          VOICE_ENGINE_CONFIGS.elevenLabs.defaultParams?.model ||
            ELEVENLABS_MODELS[0],
        ),
      );
      setElevenLabsOutputFormat(
        String(
          VOICE_ENGINE_CONFIGS.elevenLabs.defaultParams?.outputFormat ||
            ELEVENLABS_OUTPUT_FORMATS[0],
        ),
      );
      setElevenLabsLanguageCode('');
      setElevenLabsStability('');
      setElevenLabsSimilarityBoost('');
      setElevenLabsStyle('');
      setElevenLabsUseSpeakerBoost('default');
      setElevenLabsSpeed('');
      setElevenLabsSeed('');
      setElevenLabsApplyTextNormalization('default');
    }

    if (selectedVoiceEngine === 'inworld') {
      setInworldModel(
        String(
          VOICE_ENGINE_CONFIGS.inworld.defaultParams?.model ||
            INWORLD_MODELS[0],
        ),
      );
      setInworldAudioEncoding(
        (VOICE_ENGINE_CONFIGS.inworld.defaultParams
          ?.audioEncoding as InworldAudioEncoding) || 'MP3',
      );
      setInworldSampleRateHertz(
        String(
          VOICE_ENGINE_CONFIGS.inworld.defaultParams?.sampleRateHertz || 48000,
        ),
      );
      setInworldBitRate('');
      setInworldSpeakingRate('');
      setInworldLanguage(
        String(VOICE_ENGINE_CONFIGS.inworld.defaultParams?.language || 'ja-JP'),
      );
      setInworldDeliveryMode('default');
      setInworldTemperature('');
    }

    if (selectedVoiceEngine === 'gradium') {
      setGradiumOutputFormat(
        (VOICE_ENGINE_CONFIGS.gradium.defaultParams
          ?.outputFormat as GradiumOutputFormat) || 'wav',
      );
      setGradiumTemperature('');
      setGradiumVoiceSimilarity('');
      setGradiumPaddingBonus('');
      setGradiumRewriteRules('');
    }

    if (selectedVoiceEngine === 'piperPlus') {
      setPiperPlusSpeed('');
      setPiperPlusNoiseScale('');
    }
  }, [selectedVoiceEngine]);

  useEffect(() => {
    if (selectedVoiceEngine !== 'elevenLabs') {
      return;
    }

    const apiKey = voiceApiKeys.elevenLabs?.trim();
    if (!apiKey) {
      queueMicrotask(() => {
        setElevenLabsVoices([]);
        setElevenLabsVoiceFetchError('');
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

        const payload = (await response.json()) as ElevenLabsVoiceListResponse;
        if (controller.signal.aborted) {
          return;
        }

        const voices = payload.voices || [];
        setElevenLabsVoices(voices);
        setElevenLabsVoiceFetchError('');

        if (
          voices.length > 0 &&
          !voices.some(
            (voice) => voice.voice_id === selectedSpeakers.elevenLabs,
          )
        ) {
          setSelectedSpeakers((prev) => ({
            ...prev,
            elevenLabs: voices[0].voice_id,
          }));
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setElevenLabsVoices([]);
        setElevenLabsVoiceFetchError(`ElevenLabs接続エラー: ${message}`);
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
  }, [
    selectedVoiceEngine,
    voiceApiKeys.elevenLabs,
    selectedSpeakers.elevenLabs,
  ]);

  useEffect(() => {
    if (selectedVoiceEngine !== 'inworld') {
      return;
    }

    const apiKey = voiceApiKeys.inworld?.trim();
    if (!apiKey) {
      queueMicrotask(() => {
        setInworldVoices([]);
        setInworldVoiceFetchError('');
      });
      return;
    }

    const controller = new AbortController();

    const fetchInworldVoices = async () => {
      setIsFetchingInworldVoices(true);
      try {
        const voices: InworldVoice[] = [];
        let pageToken = '';

        do {
          const url = new URL('https://api.inworld.ai/voices/v1/voices');
          url.searchParams.set('orderBy', 'display_name asc');
          url.searchParams.set('pageSize', '2000');
          if (inworldLanguage.trim()) {
            url.searchParams.set('filter', `lang_code = "${inworldLanguage}"`);
          }
          if (pageToken) {
            url.searchParams.set('pageToken', pageToken);
          }

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              Authorization: `Basic ${apiKey}`,
            },
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const payload = (await response.json()) as InworldVoiceListResponse;
          voices.push(...(payload.voices || []));
          pageToken = payload.nextPageToken || '';
        } while (pageToken);

        if (controller.signal.aborted) {
          return;
        }
        setInworldVoices(voices);
        setInworldVoiceFetchError('');
        if (
          voices.length > 0 &&
          !voices.some((voice) => voice.voiceId === selectedSpeakers.inworld)
        ) {
          setSelectedSpeakers((prev) => ({
            ...prev,
            inworld: voices[0].voiceId,
          }));
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setInworldVoices([]);
        setInworldVoiceFetchError(`Inworld接続エラー: ${message}`);
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
    selectedVoiceEngine,
    voiceApiKeys.inworld,
    inworldLanguage,
    selectedSpeakers.inworld,
  ]);

  /**
   * when chat provider changes, reset the model to the first one
   */
  useEffect(() => {
    switch (chatProvider) {
      case 'openai':
        setModel(openaiModels[0]);
        break;
      case 'gemini':
        setModel(geminiModels[0]);
        break;
      case 'gemini-nano':
        setModel(MODEL_GEMINI_NANO);
        break;
      case 'claude':
        setModel(claudeModels[0]);
        break;
      case 'zai':
        setModel(zaiModels[0]);
        break;
      case 'kimi':
        setModel(kimiModels[0]);
        break;
      case 'xai':
        setModel(xaiModels[0]);
        break;
      case 'deepseek':
        setModel(deepseekModels[0]);
        break;
      case 'mistral':
        setModel(mistralModels[0]);
        break;
      case 'openrouter':
        setModel(openrouterModels[0]);
        break;
      case 'openai-compatible':
        setModel(OPENAI_COMPATIBLE_DEFAULT_MODEL);
        break;
      default:
        setModel(openaiModels[0]);
        break;
    }
  }, [chatProvider]);

  useEffect(() => {
    if (!isMcpSupportedProvider && enableDeepWikiMcp) {
      setEnableDeepWikiMcp(false);
    }
  }, [chatProvider, enableDeepWikiMcp, isMcpSupportedProvider]);

  useEffect(() => {
    if (!supportsVision && imageDataUrl) {
      setImageDataUrl(null);
    }
  }, [supportsVision, imageDataUrl]);

  useEffect(() => {
    if (chatProvider !== 'openai') {
      return;
    }
    const normalized = normalizeReasoningEffortForModel(
      model,
      reasoning_effort,
    );
    if (normalized !== reasoning_effort) {
      setReasoningEffort(normalized);
    }
  }, [chatProvider, model, reasoning_effort]);

  useEffect(() => {
    if (chatProvider !== 'openai' || !model) {
      return;
    }
    if (
      isResponsesOnlyGPT5Model(model) &&
      gpt5EndpointPreference !== 'responses'
    ) {
      setGpt5EndpointPreference('responses');
    }
  }, [chatProvider, model, gpt5EndpointPreference]);

  /**
   * when GPT-5 preset changes, update verbosity and reasoning_effort
   */
  useEffect(() => {
    if (gpt5Preset !== 'custom' && gpt5Preset in GPT5_PRESETS) {
      const preset = GPT5_PRESETS[gpt5Preset];
      setVerbosity(preset.verbosity);
      setReasoningEffort(
        normalizeReasoningEffortForModel(model, preset.reasoning_effort),
      );
    }
  }, [gpt5Preset, model]);

  useEffect(() => {
    saveOpenRouterDynamicState(openRouterDynamicState);
  }, [openRouterDynamicState]);

  useEffect(() => {
    if (chatProvider !== 'openrouter') {
      return;
    }
    if (openRouterAvailableModels.length === 0) {
      return;
    }
    if (!openRouterAvailableModels.includes(model)) {
      setModel(openRouterAvailableModels[0]);
    }
  }, [chatProvider, model, openRouterAvailableModels]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * convert messages to API format
   */
  const convertMessagesToApiFormat = (msgs: Message[]) => {
    const apiMessages: any[] = [];
    let currentImageUrl: string | null = null;

    for (const msg of msgs) {
      if (msg.role === 'user') {
        if (msg.kind === 'image') {
          // Store image URL for combining with next text message
          currentImageUrl = msg.dataUrl;
        } else if (msg.kind === 'text') {
          if (currentImageUrl) {
            // Combine image and text into a single message with VisionBlock format
            apiMessages.push({
              role: 'user',
              content: [
                { type: 'text', text: msg.content },
                {
                  type: 'image_url',
                  image_url: {
                    url: currentImageUrl,
                    detail: 'low',
                  },
                },
              ],
            });
            currentImageUrl = null;
          } else {
            // Text only message
            apiMessages.push({
              role: 'user',
              content: msg.content,
            });
          }
        }
      } else {
        // Assistant messages are always text
        if (msg.kind === 'text') {
          apiMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // If there's a dangling image without text, add it with default prompt
    if (currentImageUrl) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'この画像について説明してください。' },
          {
            type: 'image_url',
            image_url: {
              url: currentImageUrl,
              detail: 'low',
            },
          },
        ],
      });
    }

    return apiMessages;
  };

  /**
   * initialize AITuberOnAirCore
   */
  const initializeAITuber = () => {
    const trimmedApiKey = apiKey.trim();
    const trimmedModel = model.trim();

    if (requiresApiKey && !trimmedApiKey) {
      alert(DO_NOT_SET_API_KEY_MESSAGE);
      return;
    }

    if (chatProvider === 'openai-compatible' && !trimmedModel) {
      alert('OpenAI-CompatibleのModelを入力してください。');
      return;
    }

    // if existing instance exists, remove listeners
    if (aituberRef.current) {
      aituberRef.current.removeAllListeners();
    }

    const normalizedReasoningEffort = normalizeReasoningEffortForModel(
      model,
      reasoning_effort,
    );

    // prepare provider options for GPT-5 models
    const providerOptions: Record<string, any> = {};
    if (chatProvider === 'openai' && model && isGPT5Model(model)) {
      // Add GPT-5 specific options
      if (gpt5Preset !== 'custom') {
        providerOptions.gpt5Preset = gpt5Preset;
      } else {
        // Use custom settings
        providerOptions.verbosity = verbosity;
        providerOptions.reasoning_effort = normalizedReasoningEffort;
      }
      providerOptions.gpt5EndpointPreference = isResponsesOnlyGPT5Model(model)
        ? 'responses'
        : gpt5EndpointPreference;
    }
    if (chatProvider === 'kimi') {
      const trimmedBaseUrl = kimiBaseUrl.trim();
      if (trimmedBaseUrl) {
        providerOptions.baseUrl = trimmedBaseUrl;
      }
    }
    if (chatProvider === 'openrouter') {
      const trimmedBaseUrl = openRouterBaseUrl.trim();
      if (trimmedBaseUrl) {
        providerOptions.baseUrl = trimmedBaseUrl;
      }
    }
    if (chatProvider === 'openai-compatible') {
      const trimmedEndpoint = openAICompatibleEndpoint.trim();
      if (!trimmedEndpoint) {
        alert(OPENAI_COMPATIBLE_ENDPOINT_REQUIRED_MESSAGE);
        return;
      }
      providerOptions.endpoint = trimmedEndpoint;
    }

    // prepare voice options if enabled
    const createVoiceOptions = () => {
      if (selectedVoiceEngine === 'none') {
        return undefined;
      }

      const config = VOICE_ENGINE_CONFIGS[selectedVoiceEngine];
      const selectedSpeaker = selectedSpeakers[selectedVoiceEngine];
      const options: any = {
        engineType: selectedVoiceEngine,
        onComplete: () => {
          console.log('Voice playback completed');
          setIsSpeaking(false);
        },
      };

      if (
        selectedVoiceEngine !== 'openaiCompatible' ||
        String(selectedSpeaker || '').trim()
      ) {
        options.speaker = selectedSpeaker;
      }

      // Add API key if needed
      if (config.needsApiKey) {
        const apiKey = voiceApiKeys[selectedVoiceEngine];
        if (apiKey) {
          if (selectedVoiceEngine === 'minimax') {
            options.apiKey = apiKey.trim();
            if (minimaxGroupId) {
              options.groupId = minimaxGroupId.trim();
            }
          } else {
            options.apiKey = apiKey.trim();
          }
        }
      }

      // Add API URL if specified
      if (config.apiUrl) {
        switch (selectedVoiceEngine) {
          case 'voicevox':
            options.voicevoxApiUrl = config.apiUrl;
            break;
          case 'voicepeak':
            options.voicepeakApiUrl = config.apiUrl;
            break;
          case 'aivisSpeech':
            options.aivisSpeechApiUrl = config.apiUrl;
            break;
          case 'unrealSpeech':
            options.unrealSpeechApiUrl = config.apiUrl;
            break;
          case 'elevenLabs':
            options.elevenLabsApiUrl = config.apiUrl;
            break;
          case 'inworld':
            options.inworldApiUrl = config.apiUrl;
            break;
          case 'gradium':
            options.gradiumApiUrl = config.apiUrl;
            break;
        }
      }

      // Add engine-specific options
      switch (selectedVoiceEngine) {
        case 'openai': {
          const parsedSpeed = Number.parseFloat(openaiSpeed);
          if (!Number.isNaN(parsedSpeed)) {
            options.openAiSpeed = parsedSpeed;
          }
          break;
        }
        case 'openaiCompatible': {
          const trimmedApiUrl = openaiCompatibleApiUrl.trim();
          const trimmedModel = openaiCompatibleModel.trim();
          const trimmedApiKey = voiceApiKeys.openaiCompatible?.trim() || '';
          const trimmedSpeaker = String(selectedSpeaker || '').trim();
          const parsedSpeed = Number.parseFloat(openaiCompatibleSpeed);

          if (trimmedApiUrl) {
            options.openAiCompatibleApiUrl = trimmedApiUrl;
          }
          if (trimmedModel) {
            options.openAiCompatibleModel = trimmedModel;
          }
          if (trimmedApiKey) {
            options.apiKey = trimmedApiKey;
          }
          if (trimmedSpeaker) {
            options.speaker = trimmedSpeaker;
          } else {
            delete options.speaker;
          }
          if (!Number.isNaN(parsedSpeed)) {
            options.openAiCompatibleSpeed = parsedSpeed;
          }
          break;
        }
        case 'geminiTts': {
          const trimmedModel = geminiTtsModel.trim();
          const trimmedLanguageCode = geminiTtsLanguageCode.trim();
          const trimmedPrompt = geminiTtsPrompt.trim();

          if (trimmedModel) {
            options.geminiTtsModel = trimmedModel;
          }
          if (trimmedLanguageCode) {
            options.geminiTtsLanguageCode = trimmedLanguageCode;
          }
          if (trimmedPrompt) {
            options.geminiTtsPrompt = trimmedPrompt;
          }
          break;
        }
        case 'aivisCloud': {
          const trimmedModelUuid = aivisCloudModelUuid.trim();
          if (trimmedModelUuid) {
            options.aivisCloudModelUuid = trimmedModelUuid;
          } else if (selectedSpeaker) {
            options.aivisCloudModelUuid = String(selectedSpeaker);
          }

          if (aivisCloudSpeakerUuid.trim()) {
            options.aivisCloudSpeakerUuid = aivisCloudSpeakerUuid.trim();
          }

          const parsedStyleId = Number.parseInt(aivisCloudStyleId, 10);
          if (!Number.isNaN(parsedStyleId)) {
            options.aivisCloudStyleId = parsedStyleId;
          } else if (aivisCloudStyleName.trim()) {
            options.aivisCloudStyleName = aivisCloudStyleName.trim();
          }

          if (aivisCloudUseSsml !== 'default') {
            options.aivisCloudUseSSML = aivisCloudUseSsml === 'true';
          }

          if (aivisCloudLanguage.trim()) {
            options.aivisCloudLanguage = aivisCloudLanguage.trim();
          }

          const parsedSpeakingRate = Number.parseFloat(aivisCloudSpeakingRate);
          if (!Number.isNaN(parsedSpeakingRate)) {
            options.aivisCloudSpeakingRate = parsedSpeakingRate;
          }

          const parsedEmotionalIntensity = Number.parseFloat(
            aivisCloudEmotionalIntensity,
          );
          if (!Number.isNaN(parsedEmotionalIntensity)) {
            options.aivisCloudEmotionalIntensity = parsedEmotionalIntensity;
          }

          const parsedTempoDynamics = Number.parseFloat(
            aivisCloudTempoDynamics,
          );
          if (!Number.isNaN(parsedTempoDynamics)) {
            options.aivisCloudTempoDynamics = parsedTempoDynamics;
          }

          const parsedPitch = Number.parseFloat(aivisCloudPitch);
          if (!Number.isNaN(parsedPitch)) {
            options.aivisCloudPitch = parsedPitch;
          }

          const parsedVolume = Number.parseFloat(aivisCloudVolume);
          if (!Number.isNaN(parsedVolume)) {
            options.aivisCloudVolume = parsedVolume;
          }

          const parsedLeadingSilence = Number.parseFloat(
            aivisCloudLeadingSilence,
          );
          if (!Number.isNaN(parsedLeadingSilence)) {
            options.aivisCloudLeadingSilence = parsedLeadingSilence;
          }

          const parsedTrailingSilence = Number.parseFloat(
            aivisCloudTrailingSilence,
          );
          if (!Number.isNaN(parsedTrailingSilence)) {
            options.aivisCloudTrailingSilence = parsedTrailingSilence;
          }

          const parsedLineBreakSilence = Number.parseFloat(
            aivisCloudLineBreakSilence,
          );
          if (!Number.isNaN(parsedLineBreakSilence)) {
            options.aivisCloudLineBreakSilence = parsedLineBreakSilence;
          }

          if (aivisCloudOutputFormat !== 'default') {
            options.aivisCloudOutputFormat = aivisCloudOutputFormat as Exclude<
              AivisCloudOutputFormatOption,
              'default'
            >;
          }

          if (aivisCloudOutputBitrate.trim()) {
            const parsedBitrate = Number.parseInt(aivisCloudOutputBitrate, 10);
            if (!Number.isNaN(parsedBitrate)) {
              options.aivisCloudOutputBitrate = parsedBitrate;
            }
          }

          if (aivisCloudOutputSamplingRate !== 'default') {
            options.aivisCloudOutputSamplingRate = Number(
              aivisCloudOutputSamplingRate,
            ) as 8000 | 11025 | 12000 | 16000 | 22050 | 24000 | 44100 | 48000;
          }

          if (aivisCloudOutputChannels !== 'default') {
            options.aivisCloudOutputChannels = aivisCloudOutputChannels as
              | 'mono'
              | 'stereo';
          }

          if (aivisCloudUserDictionaryUuid.trim()) {
            options.aivisCloudUserDictionaryUuid =
              aivisCloudUserDictionaryUuid.trim();
          }

          if (aivisCloudEnableBillingLogs !== 'default') {
            options.aivisCloudEnableBillingLogs =
              aivisCloudEnableBillingLogs === 'true';
          }
          break;
        }
        case 'voicepeak': {
          if (voicepeakEmotionMode === 'weighted') {
            const weightedEmotion: VoicepeakEmotionWeights = {};

            for (const key of VOICEPEAK_WEIGHTED_EMOTION_KEYS) {
              const parsedWeight = Number.parseInt(
                voicepeakEmotionWeights[key],
                10,
              );
              if (
                !Number.isNaN(parsedWeight) &&
                parsedWeight >= 0 &&
                parsedWeight <= 100
              ) {
                weightedEmotion[key] = parsedWeight;
              }
            }

            options.voicepeakEmotion = weightedEmotion;
          } else {
            options.voicepeakEmotion = voicepeakEmotion;
          }

          const parsedSpeed = Number.parseInt(voicepeakSpeed, 10);
          if (!Number.isNaN(parsedSpeed)) {
            options.voicepeakSpeed = parsedSpeed;
          }

          const parsedPitch = Number.parseInt(voicepeakPitch, 10);
          if (!Number.isNaN(parsedPitch)) {
            options.voicepeakPitch = parsedPitch;
          }
          break;
        }
        case 'voicevox': {
          const voicevoxOverrides: VoiceVoxQueryParameterOverrides = {};

          const parsedSpeedScale = Number.parseFloat(voicevoxSpeedScale);
          if (!Number.isNaN(parsedSpeedScale)) {
            options.voicevoxSpeedScale = parsedSpeedScale;
            voicevoxOverrides.speedScale = parsedSpeedScale;
          }

          const parsedPitchScale = Number.parseFloat(voicevoxPitchScale);
          if (!Number.isNaN(parsedPitchScale)) {
            options.voicevoxPitchScale = parsedPitchScale;
            voicevoxOverrides.pitchScale = parsedPitchScale;
          }

          const parsedIntonationScale = Number.parseFloat(
            voicevoxIntonationScale,
          );
          if (!Number.isNaN(parsedIntonationScale)) {
            options.voicevoxIntonationScale = parsedIntonationScale;
            voicevoxOverrides.intonationScale = parsedIntonationScale;
          }

          const parsedVolumeScale = Number.parseFloat(voicevoxVolumeScale);
          if (!Number.isNaN(parsedVolumeScale)) {
            options.voicevoxVolumeScale = parsedVolumeScale;
            voicevoxOverrides.volumeScale = parsedVolumeScale;
          }

          const parsedPrePhonemeLength = Number.parseFloat(
            voicevoxPrePhonemeLength,
          );
          if (!Number.isNaN(parsedPrePhonemeLength)) {
            options.voicevoxPrePhonemeLength = parsedPrePhonemeLength;
            voicevoxOverrides.prePhonemeLength = parsedPrePhonemeLength;
          }

          const parsedPostPhonemeLength = Number.parseFloat(
            voicevoxPostPhonemeLength,
          );
          if (!Number.isNaN(parsedPostPhonemeLength)) {
            options.voicevoxPostPhonemeLength = parsedPostPhonemeLength;
            voicevoxOverrides.postPhonemeLength = parsedPostPhonemeLength;
          }

          const parsedPauseLength = Number.parseFloat(voicevoxPauseLength);
          if (!Number.isNaN(parsedPauseLength)) {
            options.voicevoxPauseLength = parsedPauseLength;
            voicevoxOverrides.pauseLength = parsedPauseLength;
          }

          const parsedPauseLengthScale = Number.parseFloat(
            voicevoxPauseLengthScale,
          );
          if (!Number.isNaN(parsedPauseLengthScale)) {
            options.voicevoxPauseLengthScale = parsedPauseLengthScale;
            voicevoxOverrides.pauseLengthScale = parsedPauseLengthScale;
          }

          if (voicevoxOutputSamplingRate !== 'default') {
            const parsedSamplingRate = Number.parseInt(
              voicevoxOutputSamplingRate,
              10,
            );
            if (!Number.isNaN(parsedSamplingRate)) {
              options.voicevoxOutputSamplingRate = parsedSamplingRate;
              voicevoxOverrides.outputSamplingRate = parsedSamplingRate;
            }
          }

          if (voicevoxOutputStereo !== 'default') {
            const stereo = voicevoxOutputStereo === 'stereo';
            options.voicevoxOutputStereo = stereo;
            voicevoxOverrides.outputStereo = stereo;
          }

          if (voicevoxEnableKatakanaEnglish !== 'default') {
            options.voicevoxEnableKatakanaEnglish =
              voicevoxEnableKatakanaEnglish === 'true';
          }

          if (voicevoxEnableInterrogativeUpspeak !== 'default') {
            options.voicevoxEnableInterrogativeUpspeak =
              voicevoxEnableInterrogativeUpspeak === 'true';
          }

          if (voicevoxCoreVersion.trim()) {
            options.voicevoxCoreVersion = voicevoxCoreVersion.trim();
          }

          if (Object.keys(voicevoxOverrides).length > 0) {
            options.voicevoxQueryParameters = voicevoxOverrides;
          }

          break;
        }
        case 'aivisSpeech': {
          const aivisOverrides: AivisSpeechQueryParameterOverrides = {};

          const parsedSpeedScale = Number.parseFloat(aivisSpeedScale);
          if (!Number.isNaN(parsedSpeedScale)) {
            options.aivisSpeechSpeedScale = parsedSpeedScale;
            aivisOverrides.speedScale = parsedSpeedScale;
          }

          const parsedPitchScale = Number.parseFloat(aivisPitchScale);
          if (!Number.isNaN(parsedPitchScale)) {
            options.aivisSpeechPitchScale = parsedPitchScale;
            aivisOverrides.pitchScale = parsedPitchScale;
          }

          const parsedIntonationScale = Number.parseFloat(aivisIntonationScale);
          if (!Number.isNaN(parsedIntonationScale)) {
            options.aivisSpeechIntonationScale = parsedIntonationScale;
            aivisOverrides.intonationScale = parsedIntonationScale;
          }

          const parsedTempoDynamicsScale = Number.parseFloat(
            aivisTempoDynamicsScale,
          );
          if (!Number.isNaN(parsedTempoDynamicsScale)) {
            options.aivisSpeechTempoDynamicsScale = parsedTempoDynamicsScale;
            aivisOverrides.tempoDynamicsScale = parsedTempoDynamicsScale;
          }

          const parsedVolumeScale = Number.parseFloat(aivisVolumeScale);
          if (!Number.isNaN(parsedVolumeScale)) {
            options.aivisSpeechVolumeScale = parsedVolumeScale;
            aivisOverrides.volumeScale = parsedVolumeScale;
          }

          const parsedPrePhonemeLength = Number.parseFloat(
            aivisPrePhonemeLength,
          );
          if (!Number.isNaN(parsedPrePhonemeLength)) {
            options.aivisSpeechPrePhonemeLength = parsedPrePhonemeLength;
            aivisOverrides.prePhonemeLength = parsedPrePhonemeLength;
          }

          const parsedPostPhonemeLength = Number.parseFloat(
            aivisPostPhonemeLength,
          );
          if (!Number.isNaN(parsedPostPhonemeLength)) {
            options.aivisSpeechPostPhonemeLength = parsedPostPhonemeLength;
            aivisOverrides.postPhonemeLength = parsedPostPhonemeLength;
          }

          const parsedPauseLength = Number.parseFloat(aivisPauseLength);
          if (!Number.isNaN(parsedPauseLength)) {
            options.aivisSpeechPauseLength = parsedPauseLength;
            aivisOverrides.pauseLength = parsedPauseLength;
          }

          const parsedPauseLengthScale = Number.parseFloat(
            aivisPauseLengthScale,
          );
          if (!Number.isNaN(parsedPauseLengthScale)) {
            options.aivisSpeechPauseLengthScale = parsedPauseLengthScale;
            aivisOverrides.pauseLengthScale = parsedPauseLengthScale;
          }

          if (aivisOutputSamplingRate !== 'default') {
            const parsedSamplingRate = Number.parseInt(
              aivisOutputSamplingRate,
              10,
            );
            if (!Number.isNaN(parsedSamplingRate)) {
              options.aivisSpeechOutputSamplingRate = parsedSamplingRate;
              aivisOverrides.outputSamplingRate = parsedSamplingRate;
            }
          }

          if (aivisOutputStereo !== 'default') {
            const stereo = aivisOutputStereo === 'stereo';
            options.aivisSpeechOutputStereo = stereo;
            aivisOverrides.outputStereo = stereo;
          }

          if (Object.keys(aivisOverrides).length > 0) {
            options.aivisSpeechQueryParameters = aivisOverrides;
          }

          break;
        }
        case 'minimax':
          if (config.defaultParams?.endpoint) {
            options.endpoint = config.defaultParams.endpoint;
          }
          options.minimaxModel = minimaxModel;

          if (minimaxLanguageBoost.trim()) {
            options.minimaxLanguageBoost = minimaxLanguageBoost.trim();
          }

          const voiceSettings: {
            speed?: number;
            vol?: number;
            pitch?: number;
          } = {};

          const parsedSpeed = Number.parseFloat(minimaxSpeed);
          if (!Number.isNaN(parsedSpeed)) {
            options.minimaxSpeed = parsedSpeed;
            voiceSettings.speed = parsedSpeed;
          }

          const parsedVolume = Number.parseFloat(minimaxVolume);
          if (!Number.isNaN(parsedVolume)) {
            options.minimaxVolume = parsedVolume;
            voiceSettings.vol = parsedVolume;
          }

          const parsedPitch = Number.parseFloat(minimaxPitch);
          if (!Number.isNaN(parsedPitch)) {
            options.minimaxPitch = parsedPitch;
            voiceSettings.pitch = parsedPitch;
          }

          if (Object.keys(voiceSettings).length > 0) {
            options.minimaxVoiceSettings = voiceSettings;
          }

          const audioSettings: {
            sampleRate?: number;
            bitrate?: number;
            format?: MinimaxAudioFormat;
            channel?: 1 | 2;
          } = {};

          const parsedSampleRate = Number.parseInt(minimaxSampleRate, 10);
          if (!Number.isNaN(parsedSampleRate)) {
            options.minimaxSampleRate = parsedSampleRate;
            audioSettings.sampleRate = parsedSampleRate;
          }

          const parsedBitrate = Number.parseInt(minimaxBitrate, 10);
          if (!Number.isNaN(parsedBitrate)) {
            options.minimaxBitrate = parsedBitrate;
            audioSettings.bitrate = parsedBitrate;
          }

          if (minimaxAudioFormat) {
            options.minimaxAudioFormat = minimaxAudioFormat;
            audioSettings.format = minimaxAudioFormat;
          }

          const parsedChannel = Number.parseInt(minimaxAudioChannel, 10);
          if (
            !Number.isNaN(parsedChannel) &&
            (parsedChannel === 1 || parsedChannel === 2)
          ) {
            options.minimaxAudioChannel = parsedChannel as 1 | 2;
            audioSettings.channel = parsedChannel as 1 | 2;
          }

          if (Object.keys(audioSettings).length > 0) {
            options.minimaxAudioSettings = audioSettings;
          }

          break;
        case 'xai': {
          if (xaiLanguage.trim()) {
            options.xaiLanguage = xaiLanguage.trim();
          }

          if (xaiCodec) {
            options.xaiCodec = xaiCodec;
          }

          const parsedSampleRate = Number.parseInt(xaiSampleRate, 10);
          if (!Number.isNaN(parsedSampleRate)) {
            options.xaiSampleRate = parsedSampleRate;
          }

          if (xaiCodec === 'mp3') {
            const parsedBitRate = Number.parseInt(xaiBitRate, 10);
            if (!Number.isNaN(parsedBitRate)) {
              options.xaiBitRate = parsedBitRate;
            }
          }

          break;
        }
        case 'unrealSpeech': {
          if (unrealSpeechBitrate.trim()) {
            options.unrealSpeechBitrate = unrealSpeechBitrate.trim();
          }

          const parsedSpeed = Number.parseFloat(unrealSpeechSpeed);
          if (!Number.isNaN(parsedSpeed)) {
            options.unrealSpeechSpeed = parsedSpeed;
          }

          const parsedPitch = Number.parseFloat(unrealSpeechPitch);
          if (!Number.isNaN(parsedPitch)) {
            options.unrealSpeechPitch = parsedPitch;
          }

          options.unrealSpeechCodec = unrealSpeechCodec;

          const parsedTemperature = Number.parseFloat(unrealSpeechTemperature);
          if (!Number.isNaN(parsedTemperature)) {
            options.unrealSpeechTemperature = parsedTemperature;
          }

          break;
        }
        case 'elevenLabs': {
          if (elevenLabsModel.trim()) {
            options.elevenLabsModel = elevenLabsModel.trim();
          }
          if (elevenLabsOutputFormat.trim()) {
            options.elevenLabsOutputFormat = elevenLabsOutputFormat.trim();
          }
          if (elevenLabsLanguageCode.trim()) {
            options.elevenLabsLanguageCode = elevenLabsLanguageCode.trim();
          }

          const parsedStability = Number.parseFloat(elevenLabsStability);
          if (!Number.isNaN(parsedStability)) {
            options.elevenLabsStability = parsedStability;
          }

          const parsedSimilarityBoost = Number.parseFloat(
            elevenLabsSimilarityBoost,
          );
          if (!Number.isNaN(parsedSimilarityBoost)) {
            options.elevenLabsSimilarityBoost = parsedSimilarityBoost;
          }

          const parsedStyle = Number.parseFloat(elevenLabsStyle);
          if (!Number.isNaN(parsedStyle)) {
            options.elevenLabsStyle = parsedStyle;
          }

          if (elevenLabsUseSpeakerBoost !== 'default') {
            options.elevenLabsUseSpeakerBoost =
              elevenLabsUseSpeakerBoost === 'true';
          }

          const parsedSpeed = Number.parseFloat(elevenLabsSpeed);
          if (!Number.isNaN(parsedSpeed)) {
            options.elevenLabsSpeed = parsedSpeed;
          }

          const parsedSeed = Number.parseInt(elevenLabsSeed, 10);
          if (!Number.isNaN(parsedSeed)) {
            options.elevenLabsSeed = parsedSeed;
          }

          if (elevenLabsApplyTextNormalization !== 'default') {
            options.elevenLabsApplyTextNormalization =
              elevenLabsApplyTextNormalization;
          }

          break;
        }
        case 'inworld': {
          if (inworldModel.trim()) {
            options.inworldModel = inworldModel.trim();
          }
          options.inworldAudioEncoding = inworldAudioEncoding;

          const parsedSampleRate = Number.parseInt(inworldSampleRateHertz, 10);
          if (!Number.isNaN(parsedSampleRate)) {
            options.inworldSampleRateHertz = parsedSampleRate;
          }

          const parsedBitRate = Number.parseInt(inworldBitRate, 10);
          if (!Number.isNaN(parsedBitRate)) {
            options.inworldBitRate = parsedBitRate;
          }

          const parsedSpeakingRate = Number.parseFloat(inworldSpeakingRate);
          if (!Number.isNaN(parsedSpeakingRate)) {
            options.inworldSpeakingRate = parsedSpeakingRate;
          }

          if (inworldLanguage.trim()) {
            options.inworldLanguage = inworldLanguage.trim();
          }

          if (inworldDeliveryMode !== 'default') {
            options.inworldDeliveryMode = inworldDeliveryMode;
          }

          const parsedTemperature = Number.parseFloat(inworldTemperature);
          if (!Number.isNaN(parsedTemperature)) {
            options.inworldTemperature = parsedTemperature;
          }

          break;
        }
        case 'gradium': {
          options.gradiumOutputFormat = gradiumOutputFormat;

          const parsedTemperature = Number.parseFloat(gradiumTemperature);
          if (!Number.isNaN(parsedTemperature)) {
            options.gradiumTemperature = parsedTemperature;
          }

          const parsedVoiceSimilarity =
            Number.parseFloat(gradiumVoiceSimilarity);
          if (!Number.isNaN(parsedVoiceSimilarity)) {
            options.gradiumVoiceSimilarity = parsedVoiceSimilarity;
          }

          const parsedPaddingBonus = Number.parseFloat(gradiumPaddingBonus);
          if (!Number.isNaN(parsedPaddingBonus)) {
            options.gradiumPaddingBonus = parsedPaddingBonus;
          }

          if (gradiumRewriteRules.trim()) {
            options.gradiumRewriteRules = gradiumRewriteRules.trim();
          }

          break;
        }
        case 'piperPlus': {
          options.piperPlusBasePath = PIPER_PLUS_BASE_PATH;
          options.piperPlusModelConfigFile = PIPER_PLUS_MODEL_CONFIG_FILE;
          options.piperPlusModelFile = PIPER_PLUS_MODEL_FILE;
          options.piperPlusVoiceFile = PIPER_PLUS_VOICE_FILE;

          const parsedSpeed = Number.parseFloat(piperPlusSpeed);
          if (!Number.isNaN(parsedSpeed)) {
            options.piperPlusSpeed = parsedSpeed;
          }

          const parsedNoiseScale = Number.parseFloat(piperPlusNoiseScale);
          if (!Number.isNaN(parsedNoiseScale)) {
            options.piperPlusNoiseScale = parsedNoiseScale;
          }

          break;
        }
      }

      return options;
    };

    const voiceOptions = createVoiceOptions();

    // create options
    const shouldEnableTools =
      chatProvider !== 'openai-compatible' && chatProvider !== 'gemini-nano';
    const aituberOptions: AITuberOnAirCoreOptions = {
      chatProvider,
      apiKey: trimmedApiKey,
      model: trimmedModel,
      chatOptions: {
        systemPrompt: systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
        responseLength,
      },
      providerOptions,
      tools: shouldEnableTools
        ? [{ definition: randomIntTool, handler: randomIntHandler }]
        : undefined,
      mcpServers: enableDeepWikiMcp ? mcpServers : [],
      voiceOptions,
      speechChunking: {
        enabled: true,
        minWords: 40,
        locale: 'all',
      },
      debug: true,
    };

    // create new instance
    const newAITuber = new AITuberOnAirCore(aituberOptions);

    // register event listeners
    setupEventListeners(newAITuber);

    // store the instance
    aituberRef.current = newAITuber;

    // if there is existing chat history, set it
    if (messagesRef.current.length > 0) {
      newAITuber.setChatHistory(
        convertMessagesToApiFormat(messagesRef.current),
      );
    }

    // set the configured flag to true
    setIsConfigured(true);

    console.log('AITuberOnAirCore initialized with options:', aituberOptions);
    alert(CORE_SETTINGS_APPLIED_MESSAGE);
  };

  /**
   * register event listeners
   */
  const setupEventListeners = (instance: AITuberOnAirCore) => {
    instance.on(AITuberOnAirCoreEvent.PROCESSING_START, (data: any) => {
      console.log('Processing started:', data);
    });

    instance.on(AITuberOnAirCoreEvent.PROCESSING_END, () => {
      console.log('Processing completed');

      // if processing is completed, get the latest chat history
      if (aituberRef.current) {
        const updatedHistory = aituberRef.current.getChatHistory();
        console.log('Updated chat history:', updatedHistory);
      }
    });

    instance.on(
      AITuberOnAirCoreEvent.ASSISTANT_PARTIAL,
      (partialText: string) => {
        console.log('Assistant partial:', partialText);
        updateAssistantPartial(partialText);
      },
    );

    instance.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, async (data: any) => {
      const { message } = data;
      console.log('Assistant response completed:', message.content);
      removeAssistantPartial();

      addMessageToUI({
        id: nextId(),
        role: 'assistant',
        kind: 'text',
        content: message.content,
      });

      // Generate avatar image if enabled
      if (enableAvatarGeneration && geminiImageApiKey.trim()) {
        try {
          setIsGeneratingAvatar(true);
          const prompt = createAvatarPrompt(message.content);
          const imageUrl = await generateAvatarImage({
            apiKey: geminiImageApiKey,
            prompt,
            baseImageUrl: avatarImageUrl, // Pass the current avatar image as the base
          });

          // Clean up previous generated image
          if (generatedAvatarImage) {
            revokeObjectUrl(generatedAvatarImage);
          }

          setGeneratedAvatarImage(imageUrl);
          setAvatarImageUrl(imageUrl); // Automatically update the avatar image
          console.log('Avatar image generated and updated successfully');
        } catch (error) {
          console.error('Failed to generate avatar image:', error);
        } finally {
          setIsGeneratingAvatar(false);
        }
      }
    });

    instance.on(AITuberOnAirCoreEvent.ERROR, (error: any) => {
      console.error('An error occurred:', error);
      alert(`An error occurred:: ${error}`);
    });

    instance.on(AITuberOnAirCoreEvent.TOOL_USE, (data: any) => {
      console.log('Tool use:', data);
    });

    instance.on(AITuberOnAirCoreEvent.TOOL_RESULT, (data: any) => {
      console.log('Tool result:', data);
    });

    instance.on(AITuberOnAirCoreEvent.SPEECH_START, (data: any) => {
      console.log('Speech started:', data);
      setIsSpeaking(true);
    });

    instance.on(AITuberOnAirCoreEvent.SPEECH_END, () => {
      console.log('Speech ended');
      setIsSpeaking(false);
    });
  };

  const handleOpenRouterMaxCandidatesChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    setOpenRouterDynamicState((prev) => ({
      ...prev,
      maxCandidates: normalizeMaxCandidates(
        Number.isFinite(parsed) ? parsed : undefined,
      ),
    }));
  };

  const handleRefreshOpenRouterFreeModels = async () => {
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setOpenRouterRefreshError('OpenRouter API key is required.');
      return;
    }

    setIsFetchingOpenRouterFreeModels(true);
    setOpenRouterRefreshError('');

    try {
      const trimmedBaseUrl = openRouterBaseUrl.trim();
      const endpoint = trimmedBaseUrl
        ? buildOpenRouterEndpoint(trimmedBaseUrl, '/chat/completions')
        : undefined;
      const modelsEndpoint = trimmedBaseUrl
        ? buildOpenRouterEndpoint(trimmedBaseUrl, '/models')
        : undefined;

      const result = await refreshOpenRouterFreeModels({
        apiKey: trimmedApiKey,
        endpoint,
        modelsEndpoint,
        maxCandidates: openRouterDynamicState.maxCandidates,
        maxWorking: DEFAULT_OPENROUTER_MAX_WORKING,
      });

      setOpenRouterDynamicState((prev) => ({
        ...prev,
        models: normalizeOpenRouterModelIds(result.working),
        fetchedAt: result.fetchedAt,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOpenRouterRefreshError(message);
    } finally {
      setIsFetchingOpenRouterFreeModels(false);
    }
  };

  /**
   * send message
   */
  const handleSendMessage = async () => {
    // if not configured, return
    if (!isConfigured) {
      alert(DO_NOT_SETTINGS_MESSAGE);
      return;
    }
    if (!aituberRef.current) {
      alert(CORE_NOT_INITIALIZED_MESSAGE);
      return;
    }

    // get user input and image data URL
    const userMessage = userInput.trim();
    const attachedImageUrl = imageDataUrl;

    if (!userMessage && !attachedImageUrl) return;

    const canUseVision = Boolean(attachedImageUrl && supportsVision);
    if (attachedImageUrl && visionSupportLevel === 'unsupported') {
      alert('選択中のモデルは画像入力に対応していません。');
      setImageDataUrl(null);
      if (!userMessage) {
        return;
      }
    }

    const drafts: Message[] = [];
    if (canUseVision && attachedImageUrl)
      drafts.push({
        id: nextId(),
        role: 'user',
        kind: 'image',
        dataUrl: attachedImageUrl,
      });
    if (userMessage)
      drafts.push({
        id: nextId(),
        role: 'user',
        kind: 'text',
        content: userMessage,
      });

    setMessages((prev) => {
      const newMessages = [...prev, ...drafts];
      aituberRef.current!.setChatHistory(
        convertMessagesToApiFormat(newMessages),
      );
      return newMessages;
    });

    setUserInput('');
    setPartialTextBuffer('');
    setImageDataUrl(null);

    // if image is attached, call vision API
    // if only text, call normal chat API
    if (canUseVision && attachedImageUrl) {
      // send image to AITuberOnAirCore (Vision API)
      console.log('Calling processVisionChat with image...');
      await aituberRef.current.processVisionChat(attachedImageUrl, userMessage);
    } else {
      // send text to AITuberOnAirCore
      console.log('Calling processChat with text...');
      await aituberRef.current.processChat(userMessage);
    }
  };

  /**
   * clear chat history
   */
  const clearChatHistory = () => {
    if (aituberRef.current) {
      aituberRef.current.setChatHistory([]);
      setMessages([]);
      messagesRef.current = [];
      console.log('Chat history cleared');
    }
  };

  /**
   * add message to UI
   */
  const addMessageToUI = (msg: Message) =>
    setMessages((prev) => [...prev, msg]);

  const updateAssistantPartial = (partialText: string) => {
    setPartialTextBuffer((prev) => prev + partialText);
  };

  const removeAssistantPartial = () => {
    setPartialTextBuffer('');
  };

  /**
   * file input onChange: convert selected image to DataURL and store it in state
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageDataUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setImageDataUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * avatar image upload onChange: convert selected image to DataURL and store it in state
   */
  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setAvatarImageUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * apply settings
   */
  const handleApplySettings = () => {
    initializeAITuber();
    setShowSettings(false);
  };

  const handleCancelSettings = () => {
    setShowSettings(false);
  };

  const isOpenAIGPT5ModelSelected = Boolean(
    chatProvider === 'openai' && model && isGPT5Model(model),
  );
  const isResponsesOnlyOpenAIGPT5ModelSelected = Boolean(
    chatProvider === 'openai' && model && isResponsesOnlyGPT5Model(model),
  );
  const allowsNoneReasoningEffort = Boolean(
    chatProvider === 'openai' && model && allowsReasoningNone(model),
  );
  const allowsMinimalReasoningEffort = Boolean(
    chatProvider === 'openai' && model && allowsReasoningMinimal(model),
  );
  const allowsLowReasoningEffort = Boolean(
    chatProvider === 'openai' && model && allowsReasoningLow(model),
  );
  const allowsXHighReasoningEffort = Boolean(
    chatProvider === 'openai' && model && allowsReasoningXHigh(model),
  );
  const getResponseLengthOptionLabel = (length: ChatResponseLength): string => {
    const label = RESPONSE_LENGTH_LABELS[length];
    const baseTokens = RESPONSE_LENGTH_BASE_TOKENS[length];

    if (!isOpenAIGPT5ModelSelected) {
      return `${label} (${baseTokens} tokens)`;
    }

    return `${label} (GPT-5 auto, starts at ${baseTokens})`;
  };

  return (
    <>
      <header>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1>Simple AI Chat</h1>
          <div>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                backgroundColor: '#2e997d',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                marginRight: '8px',
              }}
            >
              設定
            </button>
            <button
              onClick={clearChatHistory}
              style={{
                backgroundColor: '#e01e5a',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
              }}
            >
              履歴クリア
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div id="chat-container" className="section">
          <h2>チャット</h2>
          <div>
            選択中のモデル：{chatProvider} / {model}
          </div>
          {visionSupportLevel === 'unknown' && (
            <div style={{ color: '#6b7280' }}>
              この endpoint / model
              の画像対応は事前判定できません。画像送信は試せますが、実行時に失敗する場合があります。
            </div>
          )}
          {selectedVoiceEngine !== 'none' && (
            <div style={{ color: '#2e997d' }}>
              音声合成: 有効 ({VOICE_ENGINE_CONFIGS[selectedVoiceEngine].name})
            </div>
          )}
          {enableAvatarGeneration && geminiImageApiKey && (
            <div style={{ color: '#28a745' }}>
              AI画像生成: 有効 (Gemini-2.5-Flash-Image)
            </div>
          )}
          {isSpeaking && (
            <div style={{ color: '#1e90ff', fontWeight: 'bold' }}>
              🔊 音声再生中...
            </div>
          )}
          {isGeneratingAvatar && (
            <div style={{ color: '#28a745', fontWeight: 'bold' }}>
              🎨 アバター画像を生成中...
            </div>
          )}
          {requiresApiKey && !apiKey && (
            <div style={{ color: '#e01e5a' }}>
              API Keyが設定されていません。
            </div>
          )}

          {/* チャットメッセージの表示 */}
          <div id="messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <img
                  src={msg.role === 'user' ? defaultUserIcon : avatarImageUrl}
                  alt={`${msg.role} avatar`}
                  className="message-avatar"
                />
                <div className="message-content">
                  {msg.kind === 'text' && <div>{msg.content}</div>}
                  {msg.kind === 'image' && (
                    <img
                      src={msg.dataUrl}
                      alt="Attached"
                      style={{
                        maxWidth: '200px',
                        display: 'block',
                        marginTop: '8px',
                        borderRadius: '8px',
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
            {/* assistant's partial response */}
            {partialTextBuffer && (
              <div className="message assistant assistant-partial">
                <img
                  src={avatarImageUrl}
                  alt="assistant avatar"
                  className="message-avatar"
                />
                <div className="message-content">{partialTextBuffer}</div>
              </div>
            )}
          </div>

          <div className="input-area" style={{ marginTop: '1rem' }}>
            <input
              type="text"
              id="user-input"
              placeholder={
                isConfigured ? 'メッセージを入力...' : '設定を完了してください'
              }
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={!isConfigured}
            />

            {/* 画像添付 */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={!isConfigured || visionSupportLevel === 'unsupported'}
              style={{ width: '180px' }}
            />

            {/* 送信ボタン */}
            <button
              id="send-btn"
              onClick={handleSendMessage}
              disabled={!isConfigured}
            >
              送信
            </button>
          </div>
          {imageDataUrl && <img src={imageDataUrl} alt="preview" />}
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              height: '80vh',
              maxHeight: '90vh',
              minHeight: '500px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2 style={{ marginBottom: '16px' }}>設定</h2>

            {/* Tab Headers */}
            <div
              style={{
                display: 'flex',
                borderBottom: '2px solid #ddd',
                marginBottom: '20px',
              }}
            >
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor:
                    activeTab === 'llm' ? '#2e997d' : 'transparent',
                  color: activeTab === 'llm' ? '#fff' : '#333',
                  border: 'none',
                  borderBottom:
                    activeTab === 'llm' ? '3px solid #2e997d' : 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeTab === 'llm' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setActiveTab('llm')}
              >
                LLM設定
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor:
                    activeTab === 'voice' ? '#2e997d' : 'transparent',
                  color: activeTab === 'voice' ? '#fff' : '#333',
                  border: 'none',
                  borderBottom:
                    activeTab === 'voice' ? '3px solid #2e997d' : 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeTab === 'voice' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setActiveTab('voice')}
              >
                音声設定
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor:
                    activeTab === 'avatar' ? '#2e997d' : 'transparent',
                  color: activeTab === 'avatar' ? '#fff' : '#333',
                  border: 'none',
                  borderBottom:
                    activeTab === 'avatar' ? '3px solid #2e997d' : 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeTab === 'avatar' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setActiveTab('avatar')}
              >
                アバター設定
              </button>
            </div>

            {/* Tab Content */}
            <div
              style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                paddingRight: '8px',
                minHeight: '0',
              }}
            >
              {activeTab === 'llm' ? (
                <div>
                  {/* LLM Settings */}
                  {chatProvider === 'gemini-nano' ? (
                    <div style={{ marginBottom: '12px', color: '#495057' }}>
                      Gemini Nano はブラウザ内蔵 AI を使うため API Key
                      は不要です。
                    </div>
                  ) : (
                    <>
                      <label htmlFor="apiKey">
                        {requiresApiKey ? 'API Key:' : 'API Key (optional):'}
                      </label>
                      <input
                        type="password"
                        id="apiKey"
                        placeholder={
                          requiresApiKey ? '...' : '未入力で送信可能'
                        }
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </>
                  )}

                  <label htmlFor="systemPrompt">System Prompt:</label>
                  <textarea
                    id="systemPrompt"
                    placeholder="あなたはフレンドリーなAITuberです..."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />

                  <label htmlFor="chatProvider">Chat Provider:</label>
                  <select
                    id="chatProvider"
                    value={chatProvider}
                    onChange={(e) =>
                      setChatProvider(e.target.value as ChatProvider)
                    }
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="gemini-nano">Gemini Nano</option>
                    <option value="claude">Claude</option>
                    <option value="zai">Z.ai</option>
                    <option value="kimi">Kimi</option>
                    <option value="xai">xAI</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="mistral">Mistral</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="openai-compatible">OpenAI-Compatible</option>
                  </select>

                  <label htmlFor="model">Model:</label>
                  {chatProvider === 'openai-compatible' ? (
                    <input
                      id="model"
                      type="text"
                      placeholder={OPENAI_COMPATIBLE_DEFAULT_MODEL}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  ) : (
                    <select
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    >
                      {chatProvider === 'openai' &&
                        openaiModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {chatProvider === 'gemini' &&
                        geminiModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {chatProvider === 'gemini-nano' &&
                        geminiNanoModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {chatProvider === 'claude' &&
                        claudeModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {chatProvider === 'zai' &&
                        zaiModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {chatProvider === 'kimi' &&
                        kimiModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {chatProvider === 'xai' &&
                        xaiModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {chatProvider === 'deepseek' &&
                        deepseekModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {chatProvider === 'mistral' &&
                        mistralModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {chatProvider === 'openrouter' &&
                        openRouterAvailableModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                    </select>
                  )}

                  {chatProvider === 'gemini-nano' && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '6px' }}>
                        Chrome Built-in AI
                      </div>
                      <div style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
                        API Key は不要です。Chrome 138+ で Built-in AI
                        を有効化して利用します。
                      </div>
                      <div style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
                        {geminiNano.statusText ||
                          'Built-in AI の状態を確認中です。'}
                      </div>
                      {geminiNano.status === 'downloadable' && (
                        <button
                          type="button"
                          onClick={geminiNano.prepareModel}
                          disabled={geminiNano.isPreparing}
                        >
                          Prepare Model
                        </button>
                      )}
                      {geminiNano.status === 'downloading' &&
                        geminiNano.downloadProgress != null && (
                          <div style={{ marginTop: '8px' }}>
                            Download progress: {geminiNano.downloadProgress}%
                          </div>
                        )}
                      <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                        Chrome 138+ が必要です。`chrome://flags` を開き、
                        `#optimization-guide-on-device-model` と
                        `#prompt-api-for-gemini-nano` を `Enabled`
                        に設定してから Chrome を再起動してください。
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                        フラグ有効化後に `Prepare Model` を押すとモデルの
                        ダウンロードが始まります。初回ダウンロードには数分かかる
                        場合があります。
                      </div>
                    </div>
                  )}

                  {chatProvider === 'openai-compatible' && (
                    <>
                      <label htmlFor="openAICompatibleEndpoint">
                        Endpoint URL:
                      </label>
                      <input
                        id="openAICompatibleEndpoint"
                        type="text"
                        placeholder={OPENAI_COMPATIBLE_DEFAULT_ENDPOINT}
                        value={openAICompatibleEndpoint}
                        onChange={(e) =>
                          setOpenAICompatibleEndpoint(e.target.value)
                        }
                      />
                    </>
                  )}

                  {chatProvider === 'kimi' && (
                    <>
                      <label htmlFor="kimiBaseUrl">Base URL (optional):</label>
                      <input
                        id="kimiBaseUrl"
                        type="text"
                        placeholder="https://api.moonshot.ai/v1"
                        value={kimiBaseUrl}
                        onChange={(e) => setKimiBaseUrl(e.target.value)}
                      />
                    </>
                  )}

                  {chatProvider === 'openrouter' && (
                    <>
                      <label htmlFor="openRouterBaseUrl">
                        Base URL (optional):
                      </label>
                      <input
                        id="openRouterBaseUrl"
                        type="text"
                        placeholder="https://openrouter.ai/api/v1"
                        value={openRouterBaseUrl}
                        onChange={(e) => setOpenRouterBaseUrl(e.target.value)}
                      />
                      <label htmlFor="openRouterMaxCandidates">
                        Max candidates:
                      </label>
                      <input
                        id="openRouterMaxCandidates"
                        type="number"
                        min={1}
                        value={openRouterDynamicState.maxCandidates}
                        onChange={(e) =>
                          handleOpenRouterMaxCandidatesChange(e.target.value)
                        }
                        disabled={isFetchingOpenRouterFreeModels}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void handleRefreshOpenRouterFreeModels();
                        }}
                        disabled={
                          isFetchingOpenRouterFreeModels || !apiKey.trim()
                        }
                        style={{ marginTop: '8px' }}
                      >
                        {isFetchingOpenRouterFreeModels
                          ? 'Fetching...'
                          : 'Fetch free models'}
                      </button>
                      {!apiKey.trim() && (
                        <p
                          style={{
                            marginTop: '6px',
                            color: '#666',
                            fontSize: '12px',
                          }}
                        >
                          Set OpenRouter API key to fetch free models.
                        </p>
                      )}
                      {openRouterRefreshError && (
                        <p
                          style={{
                            marginTop: '6px',
                            color: '#d9534f',
                            fontSize: '12px',
                          }}
                        >
                          {openRouterRefreshError}
                        </p>
                      )}
                      <p
                        style={{
                          marginTop: '6px',
                          color: '#666',
                          fontSize: '12px',
                        }}
                      >
                        Dynamic free models:{' '}
                        {openRouterDynamicState.models.length}
                      </p>
                      {openRouterDynamicState.fetchedAt > 0 && (
                        <p
                          style={{
                            marginTop: '6px',
                            color: '#666',
                            fontSize: '12px',
                          }}
                        >
                          Last fetched:{' '}
                          {new Date(
                            openRouterDynamicState.fetchedAt,
                          ).toLocaleString()}
                        </p>
                      )}
                    </>
                  )}

                  <label htmlFor="responseLength">Response Length:</label>
                  <select
                    id="responseLength"
                    value={responseLength}
                    onChange={(e) =>
                      setResponseLength(e.target.value as ChatResponseLength)
                    }
                  >
                    <option value={CHAT_RESPONSE_LENGTH.VERY_SHORT}>
                      {getResponseLengthOptionLabel(
                        CHAT_RESPONSE_LENGTH.VERY_SHORT,
                      )}
                    </option>
                    <option value={CHAT_RESPONSE_LENGTH.SHORT}>
                      {getResponseLengthOptionLabel(CHAT_RESPONSE_LENGTH.SHORT)}
                    </option>
                    <option value={CHAT_RESPONSE_LENGTH.MEDIUM}>
                      {getResponseLengthOptionLabel(
                        CHAT_RESPONSE_LENGTH.MEDIUM,
                      )}
                    </option>
                    <option value={CHAT_RESPONSE_LENGTH.LONG}>
                      {getResponseLengthOptionLabel(CHAT_RESPONSE_LENGTH.LONG)}
                    </option>
                    <option value={CHAT_RESPONSE_LENGTH.VERY_LONG}>
                      {getResponseLengthOptionLabel(
                        CHAT_RESPONSE_LENGTH.VERY_LONG,
                      )}
                    </option>
                    <option value={CHAT_RESPONSE_LENGTH.DEEP}>
                      {getResponseLengthOptionLabel(CHAT_RESPONSE_LENGTH.DEEP)}
                    </option>
                  </select>
                  {isOpenAIGPT5ModelSelected && (
                    <div
                      style={{
                        marginTop: '6px',
                        color: '#666',
                        fontSize: '12px',
                      }}
                    >
                      GPT-5系では途中終了を減らすため、実際の出力上限は model と
                      reasoning effort に応じて自動補正されます。
                    </div>
                  )}

                  {/* GPT-5 specific settings */}
                  {isOpenAIGPT5ModelSelected && (
                    <div style={{ marginTop: '16px' }}>
                      <hr />
                      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                        <h3 style={{ marginTop: 0 }}>GPT-5 Settings</h3>

                        <label htmlFor="gpt5Preset">Preset:</label>
                        <select
                          id="gpt5Preset"
                          value={gpt5Preset}
                          onChange={(e) =>
                            setGpt5Preset(
                              e.target.value as GPT5PresetKey | 'custom',
                            )
                          }
                        >
                          <option value="casual">
                            Casual - Lowest supported reasoning for quick chats
                          </option>
                          <option value="balanced">
                            Balanced - For business tasks and problem solving
                          </option>
                          <option value="expert">
                            Expert - Deep reasoning for complex analysis
                          </option>
                          <option value="custom">
                            Custom - Configure manually
                          </option>
                        </select>

                        {gpt5Preset === 'custom' && (
                          <>
                            <label htmlFor="verbosity">Verbosity:</label>
                            <select
                              id="verbosity"
                              value={verbosity}
                              onChange={(e) =>
                                setVerbosity(
                                  e.target.value as 'low' | 'medium' | 'high',
                                )
                              }
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>

                            <label htmlFor="reasoning_effort">
                              Reasoning Effort:
                            </label>
                            <select
                              id="reasoning_effort"
                              value={reasoning_effort}
                              onChange={(e) =>
                                setReasoningEffort(
                                  e.target.value as ReasoningEffortLevel,
                                )
                              }
                            >
                              {allowsNoneReasoningEffort ? (
                                <option value="none">None</option>
                              ) : allowsMinimalReasoningEffort ? (
                                <option value="minimal">Minimal</option>
                              ) : null}
                              {allowsLowReasoningEffort && (
                                <option value="low">Low</option>
                              )}
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              {allowsXHighReasoningEffort && (
                                <option value="xhigh">XHigh</option>
                              )}
                            </select>
                          </>
                        )}

                        <label htmlFor="gpt5EndpointPreference">
                          Endpoint Preference:
                        </label>
                        <select
                          id="gpt5EndpointPreference"
                          value={
                            isResponsesOnlyOpenAIGPT5ModelSelected
                              ? 'responses'
                              : gpt5EndpointPreference
                          }
                          onChange={(e) =>
                            setGpt5EndpointPreference(
                              e.target.value as 'chat' | 'responses',
                            )
                          }
                          disabled={isResponsesOnlyOpenAIGPT5ModelSelected}
                        >
                          <option value="chat">Chat Completions API</option>
                          <option value="responses">Responses API</option>
                        </select>
                        {isResponsesOnlyOpenAIGPT5ModelSelected && (
                          <div
                            style={{
                              marginTop: '6px',
                              color: '#666',
                              fontSize: '12px',
                            }}
                          >
                            GPT-5.4 ProはResponses API専用です。
                          </div>
                        )}
                      </div>
                      <hr />
                    </div>
                  )}

                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor="enableDeepWikiMcp">
                      DeepWiki MCPを有効にする:
                    </label>
                    <input
                      type="checkbox"
                      id="enableDeepWikiMcp"
                      checked={enableDeepWikiMcp}
                      onChange={(e) => setEnableDeepWikiMcp(e.target.checked)}
                      disabled={!isMcpSupportedProvider}
                      style={{ marginLeft: '8px' }}
                    />
                    {!isMcpSupportedProvider && (
                      <div style={{ color: '#e01e5a', marginTop: '4px' }}>
                        現在のプロバイダーはMCP非対応のため使用できません。
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'voice' ? (
                <div>
                  {/* Voice Settings */}
                  <h3 style={{ marginTop: '0', marginBottom: '16px' }}>
                    音声設定
                  </h3>

                  <label
                    htmlFor="voiceEngine"
                    style={{ marginTop: '16px', display: 'block' }}
                  >
                    音声エンジン:
                  </label>
                  <select
                    id="voiceEngine"
                    value={selectedVoiceEngine}
                    onChange={(e) =>
                      setSelectedVoiceEngine(e.target.value as VoiceEngineType)
                    }
                    style={{ width: '100%', marginBottom: '12px' }}
                  >
                    {Object.entries(VOICE_ENGINE_CONFIGS).map(
                      ([key, config]) => (
                        <option key={key} value={key}>
                          {config.name}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedVoiceEngine !== 'none' &&
                    VOICE_ENGINE_CONFIGS[selectedVoiceEngine].needsApiKey && (
                      <>
                        <label
                          htmlFor="voiceApiKey"
                          style={{ marginTop: '16px', display: 'block' }}
                        >
                          {selectedVoiceEngine === 'minimax'
                            ? 'MiniMax API Key:'
                            : `${VOICE_ENGINE_CONFIGS[selectedVoiceEngine].name} API Key:`}
                        </label>
                        <input
                          type="password"
                          id="voiceApiKey"
                          placeholder={
                            selectedVoiceEngine === 'minimax'
                              ? 'xxx...'
                              : VOICE_ENGINE_CONFIGS[selectedVoiceEngine]
                                  .placeholder
                          }
                          value={voiceApiKeys[selectedVoiceEngine] || ''}
                          onChange={(e) =>
                            setVoiceApiKeys((prev) => ({
                              ...prev,
                              [selectedVoiceEngine]: e.target.value,
                            }))
                          }
                          style={{ width: '100%', marginBottom: '8px' }}
                        />

                        {selectedVoiceEngine === 'minimax' && (
                          <>
                            <label
                              htmlFor="minimaxGroupId"
                              style={{ marginTop: '8px', display: 'block' }}
                            >
                              MiniMax Group ID:
                            </label>
                            <input
                              type="password"
                              id="minimaxGroupId"
                              placeholder="1234567890"
                              value={minimaxGroupId}
                              onChange={(e) =>
                                setMinimaxGroupId(e.target.value)
                              }
                              style={{ width: '100%', marginBottom: '8px' }}
                            />

                            <label
                              htmlFor="minimaxModel"
                              style={{ marginTop: '8px', display: 'block' }}
                            >
                              MiniMax Model:
                            </label>
                            <select
                              id="minimaxModel"
                              value={minimaxModel}
                              onChange={(e) =>
                                setMinimaxModel(e.target.value as MinimaxModel)
                              }
                              style={{ width: '100%', marginBottom: '8px' }}
                            >
                              {Object.entries(MINIMAX_MODELS).map(([model]) => (
                                <option key={model} value={model}>
                                  {model}
                                </option>
                              ))}
                            </select>
                            <div
                              style={{
                                fontSize: '0.85em',
                                color: '#666',
                                marginBottom: '8px',
                              }}
                            >
                              {MINIMAX_MODELS[minimaxModel]}
                            </div>

                            <div
                              style={{
                                marginTop: '12px',
                                padding: '12px',
                                backgroundColor: '#f8f9ff',
                                borderRadius: '8px',
                                border: '1px solid #dbe4ff',
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 'bold',
                                  marginBottom: '8px',
                                  color: '#3b5bdb',
                                }}
                              >
                                MiniMax 音声パラメータ
                              </div>

                              <label
                                htmlFor="minimaxLanguageBoost"
                                style={{
                                  marginTop: '4px',
                                  display: 'block',
                                }}
                              >
                                Language Boost:
                              </label>
                              <input
                                type="text"
                                id="minimaxLanguageBoost"
                                placeholder="例: Japanese（未入力で既定のまま）"
                                value={minimaxLanguageBoost}
                                onChange={(e) =>
                                  setMinimaxLanguageBoost(e.target.value)
                                }
                                style={{ width: '100%', marginBottom: '8px' }}
                              />

                              <label
                                htmlFor="minimaxSpeed"
                                style={{ marginTop: '4px', display: 'block' }}
                              >
                                スピード (1.0 = 標準):
                              </label>
                              <input
                                type="number"
                                id="minimaxSpeed"
                                step="0.05"
                                min="0.1"
                                max="3.0"
                                placeholder="未指定でスタイルに応じた自動値"
                                value={minimaxSpeed}
                                onChange={(e) =>
                                  setMinimaxSpeed(e.target.value)
                                }
                                style={{ width: '100%', marginBottom: '8px' }}
                              />

                              <label
                                htmlFor="minimaxVolume"
                                style={{ marginTop: '4px', display: 'block' }}
                              >
                                ボリューム (1.0 = 標準):
                              </label>
                              <input
                                type="number"
                                id="minimaxVolume"
                                step="0.05"
                                min="0.1"
                                max="3.0"
                                placeholder="未指定で1.0"
                                value={minimaxVolume}
                                onChange={(e) =>
                                  setMinimaxVolume(e.target.value)
                                }
                                style={{ width: '100%', marginBottom: '8px' }}
                              />

                              <label
                                htmlFor="minimaxPitch"
                                style={{ marginTop: '4px', display: 'block' }}
                              >
                                ピッチ (半音単位):
                              </label>
                              <input
                                type="number"
                                id="minimaxPitch"
                                step="1"
                                min="-12"
                                max="12"
                                placeholder="未指定で0"
                                value={minimaxPitch}
                                onChange={(e) =>
                                  setMinimaxPitch(e.target.value)
                                }
                                style={{ width: '100%', marginBottom: '8px' }}
                              />

                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: '8px',
                                }}
                              >
                                <div>
                                  <label
                                    htmlFor="minimaxSampleRate"
                                    style={{
                                      marginTop: '4px',
                                      display: 'block',
                                    }}
                                  >
                                    サンプルレート:
                                  </label>
                                  <select
                                    id="minimaxSampleRate"
                                    value={minimaxSampleRate}
                                    onChange={(e) =>
                                      setMinimaxSampleRate(e.target.value)
                                    }
                                    style={{
                                      width: '100%',
                                      marginBottom: '8px',
                                    }}
                                  >
                                    <option value="8000">8,000 Hz</option>
                                    <option value="16000">16,000 Hz</option>
                                    <option value="22050">22,050 Hz</option>
                                    <option value="24000">24,000 Hz</option>
                                    <option value="32000">32,000 Hz</option>
                                    <option value="44100">44,100 Hz</option>
                                  </select>
                                </div>
                                <div>
                                  <label
                                    htmlFor="minimaxBitrate"
                                    style={{
                                      marginTop: '4px',
                                      display: 'block',
                                    }}
                                  >
                                    ビットレート (bps):
                                  </label>
                                  <select
                                    id="minimaxBitrate"
                                    value={minimaxBitrate}
                                    onChange={(e) =>
                                      setMinimaxBitrate(e.target.value)
                                    }
                                    style={{
                                      width: '100%',
                                      marginBottom: '8px',
                                    }}
                                  >
                                    <option value="32000">32,000</option>
                                    <option value="64000">64,000</option>
                                    <option value="128000">128,000</option>
                                    <option value="256000">256,000</option>
                                  </select>
                                </div>
                                <div>
                                  <label
                                    htmlFor="minimaxAudioFormat"
                                    style={{
                                      marginTop: '4px',
                                      display: 'block',
                                    }}
                                  >
                                    オーディオ形式:
                                  </label>
                                  <select
                                    id="minimaxAudioFormat"
                                    value={minimaxAudioFormat}
                                    onChange={(e) =>
                                      setMinimaxAudioFormat(
                                        e.target.value as MinimaxAudioFormat,
                                      )
                                    }
                                    style={{
                                      width: '100%',
                                      marginBottom: '8px',
                                    }}
                                  >
                                    <option value="mp3">MP3</option>
                                    <option value="wav">WAV</option>
                                    <option value="aac">AAC</option>
                                    <option value="pcm">PCM</option>
                                    <option value="flac">FLAC</option>
                                    <option value="ogg">OGG</option>
                                  </select>
                                </div>
                                <div>
                                  <label
                                    htmlFor="minimaxAudioChannel"
                                    style={{
                                      marginTop: '4px',
                                      display: 'block',
                                    }}
                                  >
                                    チャンネル:
                                  </label>
                                  <select
                                    id="minimaxAudioChannel"
                                    value={minimaxAudioChannel}
                                    onChange={(e) =>
                                      setMinimaxAudioChannel(
                                        e.target.value === '2' ? '2' : '1',
                                      )
                                    }
                                    style={{
                                      width: '100%',
                                      marginBottom: '8px',
                                    }}
                                  >
                                    <option value="1">モノラル (1ch)</option>
                                    <option value="2">ステレオ (2ch)</option>
                                  </select>
                                </div>
                              </div>

                              <div
                                style={{
                                  fontSize: '0.8em',
                                  color: '#5c677d',
                                }}
                              >
                                値を空欄にすると MiniMax
                                の既定値（または感情に応じた自動調整）
                                が利用されます。
                              </div>
                            </div>
                          </>
                        )}

                        {selectedVoiceEngine === 'xai' && (
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '12px',
                              backgroundColor: '#f8f9ff',
                              borderRadius: '8px',
                              border: '1px solid #dbe4ff',
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 'bold',
                                marginBottom: '8px',
                                color: '#3b5bdb',
                              }}
                            >
                              xAI TTS parameters
                            </div>

                            <label
                              htmlFor="xaiLanguage"
                              style={{ marginTop: '4px', display: 'block' }}
                            >
                              Language:
                            </label>
                            <input
                              type="text"
                              id="xaiLanguage"
                              placeholder="auto"
                              value={xaiLanguage}
                              onChange={(e) => setXaiLanguage(e.target.value)}
                              style={{ width: '100%', marginBottom: '8px' }}
                            />

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                              }}
                            >
                              <div>
                                <label
                                  htmlFor="xaiCodec"
                                  style={{
                                    marginTop: '4px',
                                    display: 'block',
                                  }}
                                >
                                  Codec:
                                </label>
                                <select
                                  id="xaiCodec"
                                  value={xaiCodec}
                                  onChange={(e) => setXaiCodec(e.target.value)}
                                  style={{
                                    width: '100%',
                                    marginBottom: '8px',
                                  }}
                                >
                                  <option value="mp3">MP3</option>
                                  <option value="wav">WAV</option>
                                  <option value="pcm">PCM</option>
                                  <option value="mulaw">Mu-Law</option>
                                  <option value="alaw">A-Law</option>
                                </select>
                              </div>
                              <div>
                                <label
                                  htmlFor="xaiSampleRate"
                                  style={{
                                    marginTop: '4px',
                                    display: 'block',
                                  }}
                                >
                                  Sample Rate:
                                </label>
                                <select
                                  id="xaiSampleRate"
                                  value={xaiSampleRate}
                                  onChange={(e) =>
                                    setXaiSampleRate(e.target.value)
                                  }
                                  style={{
                                    width: '100%',
                                    marginBottom: '8px',
                                  }}
                                >
                                  <option value="8000">8,000 Hz</option>
                                  <option value="16000">16,000 Hz</option>
                                  <option value="22050">22,050 Hz</option>
                                  <option value="24000">24,000 Hz</option>
                                  <option value="44100">44,100 Hz</option>
                                  <option value="48000">48,000 Hz</option>
                                </select>
                              </div>
                            </div>

                            {xaiCodec === 'mp3' && (
                              <>
                                <label
                                  htmlFor="xaiBitRate"
                                  style={{
                                    marginTop: '4px',
                                    display: 'block',
                                  }}
                                >
                                  Bit Rate (bps):
                                </label>
                                <select
                                  id="xaiBitRate"
                                  value={xaiBitRate}
                                  onChange={(e) =>
                                    setXaiBitRate(e.target.value)
                                  }
                                  style={{
                                    width: '100%',
                                    marginBottom: '8px',
                                  }}
                                >
                                  <option value="32000">32,000</option>
                                  <option value="64000">64,000</option>
                                  <option value="96000">96,000</option>
                                  <option value="128000">128,000</option>
                                  <option value="192000">192,000</option>
                                </select>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}

                  {selectedVoiceEngine === 'unrealSpeech' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#fff4e6',
                        borderRadius: '8px',
                        border: '1px solid #ffd8a8',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#d9480f',
                        }}
                      >
                        Unreal Speech パラメータ
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="unrealSpeechBitrate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Bitrate:
                          </label>
                          <input
                            id="unrealSpeechBitrate"
                            type="text"
                            value={unrealSpeechBitrate}
                            onChange={(e) =>
                              setUnrealSpeechBitrate(e.target.value)
                            }
                            placeholder="192k"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="unrealSpeechCodec"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Codec:
                          </label>
                          <select
                            id="unrealSpeechCodec"
                            value={unrealSpeechCodec}
                            onChange={(e) =>
                              setUnrealSpeechCodec(
                                e.target.value as UnrealSpeechCodec,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="libmp3lame">MP3</option>
                            <option value="pcm_mulaw">PCM μ-law</option>
                            <option value="pcm_s16le">PCM 16-bit</option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="unrealSpeechSpeed"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Speed:
                          </label>
                          <input
                            id="unrealSpeechSpeed"
                            type="number"
                            step="0.05"
                            value={unrealSpeechSpeed}
                            onChange={(e) =>
                              setUnrealSpeechSpeed(e.target.value)
                            }
                            placeholder="既定値"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="unrealSpeechPitch"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Pitch:
                          </label>
                          <input
                            id="unrealSpeechPitch"
                            type="number"
                            step="0.05"
                            value={unrealSpeechPitch}
                            onChange={(e) =>
                              setUnrealSpeechPitch(e.target.value)
                            }
                            placeholder="既定値"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="unrealSpeechTemperature"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Temperature:
                          </label>
                          <input
                            id="unrealSpeechTemperature"
                            type="number"
                            step="0.05"
                            value={unrealSpeechTemperature}
                            onChange={(e) =>
                              setUnrealSpeechTemperature(e.target.value)
                            }
                            placeholder="既定値"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'elevenLabs' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f3f0ff',
                        borderRadius: '8px',
                        border: '1px solid #d0bfff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#5f3dc4',
                        }}
                      >
                        ElevenLabs パラメータ
                      </div>

                      <label
                        htmlFor="elevenLabsSpeaker"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Voice:
                      </label>
                      <select
                        id="elevenLabsSpeaker"
                        value={String(selectedSpeakers.elevenLabs || '')}
                        onChange={(e) =>
                          setSelectedSpeakers((prev) => ({
                            ...prev,
                            elevenLabs: e.target.value,
                          }))
                        }
                        disabled={
                          !voiceApiKeys.elevenLabs ||
                          isFetchingElevenLabsVoices ||
                          elevenLabsVoices.length === 0
                        }
                        style={{ width: '100%', marginBottom: '8px' }}
                      >
                        {!voiceApiKeys.elevenLabs && (
                          <option value="">API Keyを入力してください</option>
                        )}
                        {voiceApiKeys.elevenLabs &&
                          isFetchingElevenLabsVoices && (
                            <option value="">取得中...</option>
                          )}
                        {voiceApiKeys.elevenLabs &&
                          !isFetchingElevenLabsVoices &&
                          elevenLabsVoices.length === 0 && (
                            <option value="">
                              音声一覧を取得できませんでした
                            </option>
                          )}
                        {elevenLabsVoices.map((voice) => (
                          <option key={voice.voice_id} value={voice.voice_id}>
                            {voice.category
                              ? `${voice.name} (${voice.category})`
                              : voice.name}
                          </option>
                        ))}
                      </select>
                      {elevenLabsVoiceFetchError && (
                        <div
                          style={{
                            fontSize: '0.8em',
                            color: '#c92a2a',
                            marginBottom: '8px',
                          }}
                        >
                          {elevenLabsVoiceFetchError}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="elevenLabsModel"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Model:
                          </label>
                          <select
                            id="elevenLabsModel"
                            value={elevenLabsModel}
                            onChange={(e) => setElevenLabsModel(e.target.value)}
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            {ELEVENLABS_MODELS.map((ttsModel) => (
                              <option key={ttsModel} value={ttsModel}>
                                {ttsModel}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="elevenLabsOutputFormat"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Output Format:
                          </label>
                          <select
                            id="elevenLabsOutputFormat"
                            value={elevenLabsOutputFormat}
                            onChange={(e) =>
                              setElevenLabsOutputFormat(e.target.value)
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            {ELEVENLABS_OUTPUT_FORMATS.map((format) => (
                              <option key={format} value={format}>
                                {format}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <label
                        htmlFor="elevenLabsLanguageCode"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Language Code:
                      </label>
                      <input
                        id="elevenLabsLanguageCode"
                        type="text"
                        value={elevenLabsLanguageCode}
                        onChange={(e) =>
                          setElevenLabsLanguageCode(e.target.value)
                        }
                        placeholder="ja"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          value={elevenLabsStability}
                          onChange={(e) =>
                            setElevenLabsStability(e.target.value)
                          }
                          placeholder="Stability"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          value={elevenLabsSimilarityBoost}
                          onChange={(e) =>
                            setElevenLabsSimilarityBoost(e.target.value)
                          }
                          placeholder="Similarity"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          value={elevenLabsStyle}
                          onChange={(e) => setElevenLabsStyle(e.target.value)}
                          placeholder="Style"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <input
                          type="number"
                          min="0.7"
                          max="1.2"
                          step="0.01"
                          value={elevenLabsSpeed}
                          onChange={(e) => setElevenLabsSpeed(e.target.value)}
                          placeholder="Speed"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <input
                          type="number"
                          value={elevenLabsSeed}
                          onChange={(e) => setElevenLabsSeed(e.target.value)}
                          placeholder="Seed"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <select
                          value={elevenLabsUseSpeakerBoost}
                          onChange={(e) =>
                            setElevenLabsUseSpeakerBoost(
                              e.target.value as 'default' | 'true' | 'false',
                            )
                          }
                          style={{ width: '100%', marginBottom: '8px' }}
                        >
                          <option value="default">Speaker boost default</option>
                          <option value="true">Speaker boost on</option>
                          <option value="false">Speaker boost off</option>
                        </select>
                      </div>

                      <select
                        value={elevenLabsApplyTextNormalization}
                        onChange={(e) =>
                          setElevenLabsApplyTextNormalization(
                            e.target.value as
                              | 'default'
                              | ElevenLabsApplyTextNormalization,
                          )
                        }
                        style={{ width: '100%', marginBottom: '8px' }}
                      >
                        <option value="default">
                          Text normalization default
                        </option>
                        <option value="auto">auto</option>
                        <option value="on">on</option>
                        <option value="off">off</option>
                      </select>
                    </div>
                  )}

                  {selectedVoiceEngine === 'inworld' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#e7f5ff',
                        borderRadius: '8px',
                        border: '1px solid #a5d8ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#1864ab',
                        }}
                      >
                        Inworld パラメータ
                      </div>

                      <label
                        htmlFor="inworldSpeaker"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Voice:
                      </label>
                      <select
                        id="inworldSpeaker"
                        value={String(selectedSpeakers.inworld || '')}
                        onChange={(e) =>
                          setSelectedSpeakers((prev) => ({
                            ...prev,
                            inworld: e.target.value,
                          }))
                        }
                        disabled={
                          !voiceApiKeys.inworld ||
                          isFetchingInworldVoices ||
                          inworldVoices.length === 0
                        }
                        style={{ width: '100%', marginBottom: '8px' }}
                      >
                        {!voiceApiKeys.inworld && (
                          <option value="">API Keyを入力してください</option>
                        )}
                        {voiceApiKeys.inworld && isFetchingInworldVoices && (
                          <option value="">取得中...</option>
                        )}
                        {voiceApiKeys.inworld &&
                          !isFetchingInworldVoices &&
                          inworldVoices.length === 0 && (
                            <option value="">
                              音声一覧を取得できませんでした
                            </option>
                          )}
                        {inworldVoices.map((voice) => (
                          <option key={voice.voiceId} value={voice.voiceId}>
                            {voice.displayName || voice.voiceId}
                            {voice.langCode ? ` (${voice.langCode})` : ''}
                          </option>
                        ))}
                      </select>
                      {inworldVoiceFetchError && (
                        <div
                          style={{
                            fontSize: '0.8em',
                            color: '#c92a2a',
                            marginBottom: '8px',
                          }}
                        >
                          {inworldVoiceFetchError}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="inworldModel"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Model:
                          </label>
                          <select
                            id="inworldModel"
                            value={inworldModel}
                            onChange={(e) => setInworldModel(e.target.value)}
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            {INWORLD_MODELS.map((ttsModel) => (
                              <option key={ttsModel} value={ttsModel}>
                                {ttsModel}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="inworldAudioEncoding"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Audio Encoding:
                          </label>
                          <select
                            id="inworldAudioEncoding"
                            value={inworldAudioEncoding}
                            onChange={(e) =>
                              setInworldAudioEncoding(
                                e.target.value as InworldAudioEncoding,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            {INWORLD_AUDIO_ENCODINGS.map((encoding) => (
                              <option key={encoding} value={encoding}>
                                {encoding}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <input
                          type="number"
                          value={inworldSampleRateHertz}
                          onChange={(e) =>
                            setInworldSampleRateHertz(e.target.value)
                          }
                          placeholder="Sample rate"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <input
                          type="number"
                          value={inworldBitRate}
                          onChange={(e) => setInworldBitRate(e.target.value)}
                          placeholder="Bit rate"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <input
                          type="number"
                          step="0.05"
                          value={inworldSpeakingRate}
                          onChange={(e) =>
                            setInworldSpeakingRate(e.target.value)
                          }
                          placeholder="Speaking rate"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <input
                          type="text"
                          value={inworldLanguage}
                          onChange={(e) => setInworldLanguage(e.target.value)}
                          placeholder="ja-JP"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <select
                          value={inworldDeliveryMode}
                          onChange={(e) =>
                            setInworldDeliveryMode(
                              e.target.value as 'default' | InworldDeliveryMode,
                            )
                          }
                          style={{ width: '100%', marginBottom: '8px' }}
                        >
                          <option value="default">Delivery mode default</option>
                          {INWORLD_DELIVERY_MODES.map((mode) => (
                            <option key={mode} value={mode}>
                              {mode}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.05"
                          value={inworldTemperature}
                          onChange={(e) =>
                            setInworldTemperature(e.target.value)
                          }
                          placeholder="Temperature"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'gradium' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#fff4e6',
                        borderRadius: '8px',
                        border: '1px solid #ffd8a8',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#d9480f',
                        }}
                      >
                        Gradium パラメータ
                      </div>

                      <label
                        htmlFor="gradiumOutputFormat"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Output Format:
                      </label>
                      <select
                        id="gradiumOutputFormat"
                        value={gradiumOutputFormat}
                        onChange={(e) =>
                          setGradiumOutputFormat(
                            e.target.value as GradiumOutputFormat,
                          )
                        }
                        style={{ width: '100%', marginBottom: '8px' }}
                      >
                        {GRADIUM_OUTPUT_FORMATS.map((format) => (
                          <option key={format} value={format}>
                            {format}
                          </option>
                        ))}
                      </select>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          max="1.4"
                          step="0.05"
                          value={gradiumTemperature}
                          onChange={(e) =>
                            setGradiumTemperature(e.target.value)
                          }
                          placeholder="Temperature"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <input
                          type="number"
                          min="1"
                          max="4"
                          step="0.05"
                          value={gradiumVoiceSimilarity}
                          onChange={(e) =>
                            setGradiumVoiceSimilarity(e.target.value)
                          }
                          placeholder="Similarity"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <input
                          type="number"
                          min="-2"
                          max="2"
                          step="0.05"
                          value={gradiumPaddingBonus}
                          onChange={(e) =>
                            setGradiumPaddingBonus(e.target.value)
                          }
                          placeholder="Padding"
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                      </div>

                      <input
                        type="text"
                        value={gradiumRewriteRules}
                        onChange={(e) => setGradiumRewriteRules(e.target.value)}
                        placeholder="Rewrite rules"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />
                    </div>
                  )}

                  {selectedVoiceEngine === 'openai' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#e6f6ff',
                        borderRadius: '8px',
                        border: '1px solid #b5e3f5',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#0b7285',
                        }}
                      >
                        OpenAI TTS パラメータ
                      </div>

                      <label
                        htmlFor="openaiSpeed"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Speed (0.25 - 4.0):
                      </label>
                      <input
                        id="openaiSpeed"
                        type="number"
                        min="0.25"
                        max="4"
                        step="0.05"
                        value={openaiSpeed}
                        onChange={(e) => setOpenaiSpeed(e.target.value)}
                        placeholder="例: 1.25（未入力で既定値1.0）"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div style={{ fontSize: '0.8em', color: '#0b7285' }}>
                        速度以外は `gpt-4o-mini-tts` の instructions
                        で自然言語指定するか、 生成後に加工してください。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'geminiTts' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#eef7ff',
                        borderRadius: '8px',
                        border: '1px solid #cfe8ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#1864ab',
                        }}
                      >
                        Gemini TTS パラメータ
                      </div>

                      <label
                        htmlFor="geminiTtsModel"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Model:
                      </label>
                      <select
                        id="geminiTtsModel"
                        value={geminiTtsModel}
                        onChange={(e) => setGeminiTtsModel(e.target.value)}
                        style={{ width: '100%', marginBottom: '8px' }}
                      >
                        {GEMINI_TTS_MODELS.map((ttsModel) => (
                          <option key={ttsModel} value={ttsModel}>
                            {ttsModel}
                          </option>
                        ))}
                      </select>

                      <label
                        htmlFor="geminiTtsLanguageCode"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Language Code:
                      </label>
                      <input
                        id="geminiTtsLanguageCode"
                        type="text"
                        value={geminiTtsLanguageCode}
                        onChange={(e) =>
                          setGeminiTtsLanguageCode(e.target.value)
                        }
                        placeholder="ja-JP"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="geminiTtsPrompt"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Style / Audio-tag Prompt (optional):
                      </label>
                      <input
                        id="geminiTtsPrompt"
                        type="text"
                        value={geminiTtsPrompt}
                        onChange={(e) => setGeminiTtsPrompt(e.target.value)}
                        placeholder="明るく元気な声で話してください"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div style={{ fontSize: '0.8em', color: '#1864ab' }}>
                        Google の Gemini TTS API を利用します。音声は下の
                        Speaker から選択でき、style / audio-tag 指示も渡せます。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'openaiCompatible' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#fff3bf',
                        borderRadius: '8px',
                        border: '1px solid #ffe066',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#e67700',
                        }}
                      >
                        OpenAI-Compatible TTS パラメータ
                      </div>

                      <label
                        htmlFor="openaiCompatibleApiKey"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        API Key (optional):
                      </label>
                      <input
                        id="openaiCompatibleApiKey"
                        type="password"
                        value={voiceApiKeys.openaiCompatible || ''}
                        onChange={(e) =>
                          setVoiceApiKeys((prev) => ({
                            ...prev,
                            openaiCompatible: e.target.value,
                          }))
                        }
                        placeholder="未入力なら Authorization ヘッダーなし"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="openaiCompatibleApiUrl"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Endpoint URL:
                      </label>
                      <input
                        id="openaiCompatibleApiUrl"
                        type="text"
                        value={openaiCompatibleApiUrl}
                        onChange={(e) =>
                          setOpenaiCompatibleApiUrl(e.target.value)
                        }
                        placeholder={OPENAI_COMPATIBLE_TTS_DEFAULT_ENDPOINT}
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="openaiCompatibleModel"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Model:
                      </label>
                      <input
                        id="openaiCompatibleModel"
                        type="text"
                        value={openaiCompatibleModel}
                        onChange={(e) =>
                          setOpenaiCompatibleModel(e.target.value)
                        }
                        placeholder={OPENAI_COMPATIBLE_DEFAULT_MODEL}
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="openaiCompatibleSpeaker"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Voice (optional):
                      </label>
                      <input
                        id="openaiCompatibleSpeaker"
                        type="text"
                        value={String(selectedSpeakers.openaiCompatible || '')}
                        onChange={(e) =>
                          setSelectedSpeakers((prev) => ({
                            ...prev,
                            openaiCompatible: e.target.value,
                          }))
                        }
                        placeholder="未入力なら voice フィールドを送信しません"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="openaiCompatibleSpeed"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Speed (0.25 - 4.0):
                      </label>
                      <input
                        id="openaiCompatibleSpeed"
                        type="number"
                        min="0.25"
                        max="4"
                        step="0.05"
                        value={openaiCompatibleSpeed}
                        onChange={(e) =>
                          setOpenaiCompatibleSpeed(e.target.value)
                        }
                        placeholder="例: 1.10（未入力で既定値1.0）"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div style={{ fontSize: '0.8em', color: '#99582a' }}>
                        `/v1/audio/speech` 互換のローカル・セルフホスト TTS
                        サーバーを想定しています。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'piperPlus' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f3f0ff',
                        borderRadius: '8px',
                        border: '1px solid #d0bfff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#5f3dc4',
                        }}
                      >
                        Piper Plus パラメータ
                      </div>

                      <label
                        htmlFor="piperPlusSpeed"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Speed:
                      </label>
                      <input
                        id="piperPlusSpeed"
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.05"
                        value={piperPlusSpeed}
                        onChange={(e) => setPiperPlusSpeed(e.target.value)}
                        placeholder="例: 1.10"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="piperPlusNoiseScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Noise Scale:
                      </label>
                      <input
                        id="piperPlusNoiseScale"
                        type="number"
                        min="0"
                        max="2"
                        step="0.05"
                        value={piperPlusNoiseScale}
                        onChange={(e) => setPiperPlusNoiseScale(e.target.value)}
                        placeholder="例: 0.667"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div style={{ fontSize: '0.8em', color: '#5f3dc4' }}>
                        Assets path: <code>{PIPER_PLUS_BASE_PATH}</code>
                      </div>
                      <div style={{ fontSize: '0.8em', color: '#5f3dc4' }}>
                        {piperPlus.loading
                          ? 'Piper Plus assets を確認中です...'
                          : piperPlus.available
                            ? 'Piper Plus assets を検出しました。'
                            : `Piper Plus assets が未検出です。public/piper/ を配置してください。${piperPlus.error ? ` (${piperPlus.error})` : ''}`}
                      </div>
                      <div style={{ fontSize: '0.8em', color: '#5f3dc4' }}>
                        Runtime assets
                        はサイズとサードパーティライセンスの都合で
                        同梱していません。README の Piper Plus Setup を参照し、
                        `public/piper/` 配下に `dist/`, `src/`, `assets/`,
                        `models/` を配置してください。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'voicevox' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f4f5ff',
                        borderRadius: '8px',
                        border: '1px solid #dbe4ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#364fc7',
                        }}
                      >
                        VOICEVOX パラメータ
                      </div>

                      <label
                        htmlFor="voicevoxSpeedScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        スピード倍率:
                      </label>
                      <input
                        id="voicevoxSpeedScale"
                        type="number"
                        step="0.05"
                        value={voicevoxSpeedScale}
                        onChange={(e) => setVoicevoxSpeedScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="voicevoxPitchScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        ピッチ倍率:
                      </label>
                      <input
                        id="voicevoxPitchScale"
                        type="number"
                        step="0.05"
                        value={voicevoxPitchScale}
                        onChange={(e) => setVoicevoxPitchScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="voicevoxIntonationScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        抑揚倍率:
                      </label>
                      <input
                        id="voicevoxIntonationScale"
                        type="number"
                        step="0.05"
                        value={voicevoxIntonationScale}
                        onChange={(e) =>
                          setVoicevoxIntonationScale(e.target.value)
                        }
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="voicevoxVolumeScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        音量倍率:
                      </label>
                      <input
                        id="voicevoxVolumeScale"
                        type="number"
                        step="0.05"
                        value={voicevoxVolumeScale}
                        onChange={(e) => setVoicevoxVolumeScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="voicevoxPrePhonemeLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            前無音 (秒):
                          </label>
                          <input
                            id="voicevoxPrePhonemeLength"
                            type="number"
                            step="0.01"
                            value={voicevoxPrePhonemeLength}
                            onChange={(e) =>
                              setVoicevoxPrePhonemeLength(e.target.value)
                            }
                            placeholder="例: 0.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="voicevoxPostPhonemeLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            後無音 (秒):
                          </label>
                          <input
                            id="voicevoxPostPhonemeLength"
                            type="number"
                            step="0.01"
                            value={voicevoxPostPhonemeLength}
                            onChange={(e) =>
                              setVoicevoxPostPhonemeLength(e.target.value)
                            }
                            placeholder="例: 0.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="voicevoxPauseLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            ポーズ長 (秒):
                          </label>
                          <input
                            id="voicevoxPauseLength"
                            type="number"
                            step="0.05"
                            value={voicevoxPauseLength}
                            onChange={(e) =>
                              setVoicevoxPauseLength(e.target.value)
                            }
                            placeholder="未指定で自動"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="voicevoxPauseLengthScale"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            ポーズ倍率:
                          </label>
                          <input
                            id="voicevoxPauseLengthScale"
                            type="number"
                            step="0.05"
                            value={voicevoxPauseLengthScale}
                            onChange={(e) =>
                              setVoicevoxPauseLengthScale(e.target.value)
                            }
                            placeholder="未指定で1.0"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="voicevoxOutputSamplingRate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            サンプリングレート:
                          </label>
                          <select
                            id="voicevoxOutputSamplingRate"
                            value={voicevoxOutputSamplingRate}
                            onChange={(e) =>
                              setVoicevoxOutputSamplingRate(e.target.value)
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値を使用</option>
                            <option value="8000">8,000 Hz</option>
                            <option value="11025">11,025 Hz</option>
                            <option value="16000">16,000 Hz</option>
                            <option value="22050">22,050 Hz</option>
                            <option value="24000">24,000 Hz</option>
                            <option value="44100">44,100 Hz</option>
                            <option value="48000">48,000 Hz</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="voicevoxOutputStereo"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            出力チャンネル:
                          </label>
                          <select
                            id="voicevoxOutputStereo"
                            value={voicevoxOutputStereo}
                            onChange={(e) =>
                              setVoicevoxOutputStereo(
                                e.target.value as 'default' | 'mono' | 'stereo',
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値を使用</option>
                            <option value="mono">モノラル (false)</option>
                            <option value="stereo">ステレオ (true)</option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="voicevoxEnableKatakanaEnglish"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            カタカナ英語化:
                          </label>
                          <select
                            id="voicevoxEnableKatakanaEnglish"
                            value={voicevoxEnableKatakanaEnglish}
                            onChange={(e) =>
                              setVoicevoxEnableKatakanaEnglish(
                                e.target.value as 'default' | 'true' | 'false',
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値 (true)</option>
                            <option value="true">有効</option>
                            <option value="false">無効</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="voicevoxEnableInterrogativeUpspeak"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            疑問文語尾調整:
                          </label>
                          <select
                            id="voicevoxEnableInterrogativeUpspeak"
                            value={voicevoxEnableInterrogativeUpspeak}
                            onChange={(e) =>
                              setVoicevoxEnableInterrogativeUpspeak(
                                e.target.value as 'default' | 'true' | 'false',
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値 (true)</option>
                            <option value="true">有効</option>
                            <option value="false">無効</option>
                          </select>
                        </div>
                      </div>

                      <label
                        htmlFor="voicevoxCoreVersion"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Core Version:
                      </label>
                      <input
                        id="voicevoxCoreVersion"
                        type="text"
                        value={voicevoxCoreVersion}
                        onChange={(e) => setVoicevoxCoreVersion(e.target.value)}
                        placeholder="例: 0.15.0（任意）"
                        style={{ width: '100%', marginBottom: '4px' }}
                      />

                      <div style={{ fontSize: '0.8em', color: '#5c677d' }}>
                        空欄の項目はVOICEVOX API側の既定値が利用されます。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'voicepeak' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f4f5ff',
                        borderRadius: '8px',
                        border: '1px solid #dbe4ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#364fc7',
                        }}
                      >
                        VOICEPEAK パラメータ
                      </div>

                      <label
                        htmlFor="voicepeakEmotionMode"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Emotion Input:
                      </label>
                      <select
                        id="voicepeakEmotionMode"
                        value={voicepeakEmotionMode}
                        onChange={(e) =>
                          setVoicepeakEmotionMode(
                            e.target.value as VoicePeakEmotionMode,
                          )
                        }
                        style={{ width: '100%', marginBottom: '8px' }}
                      >
                        <option value="single">single tag</option>
                        <option value="weighted">weighted map</option>
                      </select>

                      {voicepeakEmotionMode === 'single' ? (
                        <>
                          <label
                            htmlFor="voicepeakEmotion"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Emotion Override:
                          </label>
                          <select
                            id="voicepeakEmotion"
                            value={voicepeakEmotion}
                            onChange={(e) =>
                              setVoicepeakEmotion(
                                e.target.value as EmotionTypeForVoicepeak,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="neutral">neutral</option>
                            <option value="happy">happy</option>
                            <option value="fun">fun</option>
                            <option value="angry">angry</option>
                            <option value="sad">sad</option>
                            <option value="surprised">surprised</option>
                          </select>
                        </>
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            marginBottom: '12px',
                          }}
                        >
                          {VOICEPEAK_WEIGHTED_EMOTION_KEYS.map((emotionKey) => (
                            <div key={emotionKey}>
                              <label
                                htmlFor={`voicepeakWeight-${emotionKey}`}
                                style={{
                                  display: 'block',
                                  marginBottom: '6px',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {emotionKey} (0-100):
                              </label>
                              <input
                                id={`voicepeakWeight-${emotionKey}`}
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={voicepeakEmotionWeights[emotionKey]}
                                onChange={(e) =>
                                  setVoicepeakEmotionWeights((prev) => ({
                                    ...prev,
                                    [emotionKey]: e.target.value,
                                  }))
                                }
                                placeholder="未入力で送信しない"
                                style={{ width: '100%' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <label
                        htmlFor="voicepeakSpeed"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Speed (50-200):
                      </label>
                      <input
                        id="voicepeakSpeed"
                        type="number"
                        min={50}
                        max={200}
                        step={1}
                        value={voicepeakSpeed}
                        onChange={(e) => setVoicepeakSpeed(e.target.value)}
                        placeholder="整数のみ（未入力で既定値）"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="voicepeakPitch"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Pitch (-300〜300):
                      </label>
                      <input
                        id="voicepeakPitch"
                        type="number"
                        min={-300}
                        max={300}
                        step={1}
                        value={voicepeakPitch}
                        onChange={(e) => setVoicepeakPitch(e.target.value)}
                        placeholder="整数のみ（未入力で既定値）"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div style={{ fontSize: '0.8em', color: '#364fc7' }}>
                        {voicepeakEmotionMode === 'single'
                          ? 'single tag は従来どおり 1 つの感情をそのまま vpeakserver へ送信します。'
                          : 'weighted map は vpeakserver v0.2.0 以降で利用できます。neutral は送信対象外で、未入力キーは送信されません。'}{' '}
                        Speed と Pitch を空欄にすると vpeakserver
                        のデフォルト値が利用されます。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'aivisCloud' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f4f5ff',
                        borderRadius: '8px',
                        border: '1px solid #dbe4ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#364fc7',
                        }}
                      >
                        Aivis Cloud パラメータ
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudModelUuid"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Model UUID (override):
                          </label>
                          <input
                            id="aivisCloudModelUuid"
                            type="text"
                            value={aivisCloudModelUuid}
                            onChange={(e) =>
                              setAivisCloudModelUuid(e.target.value)
                            }
                            placeholder="空欄なら選択中のモデルを使用"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudSpeakerUuid"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Speaker UUID:
                          </label>
                          <input
                            id="aivisCloudSpeakerUuid"
                            type="text"
                            value={aivisCloudSpeakerUuid}
                            onChange={(e) =>
                              setAivisCloudSpeakerUuid(e.target.value)
                            }
                            placeholder="複数話者モデルで指定 (任意)"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudStyleId"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Style ID (0-31):
                          </label>
                          <input
                            id="aivisCloudStyleId"
                            type="number"
                            min="0"
                            max="31"
                            step="1"
                            value={aivisCloudStyleId}
                            onChange={(e) =>
                              setAivisCloudStyleId(e.target.value)
                            }
                            placeholder="スタイルIDを使用する場合"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudStyleName"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Style Name:
                          </label>
                          <input
                            id="aivisCloudStyleName"
                            type="text"
                            value={aivisCloudStyleName}
                            onChange={(e) =>
                              setAivisCloudStyleName(e.target.value)
                            }
                            placeholder="スタイル名を直接指定 (IDと併用不可)"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudUseSsml"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Use SSML:
                          </label>
                          <select
                            id="aivisCloudUseSsml"
                            value={aivisCloudUseSsml}
                            onChange={(e) =>
                              setAivisCloudUseSsml(
                                e.target.value as AivisCloudBooleanOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値（true）</option>
                            <option value="true">有効</option>
                            <option value="false">無効</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudLanguage"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Language:
                          </label>
                          <input
                            id="aivisCloudLanguage"
                            type="text"
                            value={aivisCloudLanguage}
                            onChange={(e) =>
                              setAivisCloudLanguage(e.target.value)
                            }
                            placeholder="例: ja （現状日本語のみ）"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudSpeakingRate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Speaking Rate:
                          </label>
                          <input
                            id="aivisCloudSpeakingRate"
                            type="number"
                            min="0.5"
                            max="2"
                            step="0.05"
                            value={aivisCloudSpeakingRate}
                            onChange={(e) =>
                              setAivisCloudSpeakingRate(e.target.value)
                            }
                            placeholder="例: 1.05"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudEmotionalIntensity"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Emotional Intensity:
                          </label>
                          <input
                            id="aivisCloudEmotionalIntensity"
                            type="number"
                            min="0"
                            max="2"
                            step="0.05"
                            value={aivisCloudEmotionalIntensity}
                            onChange={(e) =>
                              setAivisCloudEmotionalIntensity(e.target.value)
                            }
                            placeholder="例: 1.2"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudTempoDynamics"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Tempo Dynamics:
                          </label>
                          <input
                            id="aivisCloudTempoDynamics"
                            type="number"
                            min="0"
                            max="2"
                            step="0.05"
                            value={aivisCloudTempoDynamics}
                            onChange={(e) =>
                              setAivisCloudTempoDynamics(e.target.value)
                            }
                            placeholder="話速の緩急"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudPitch"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Pitch:
                          </label>
                          <input
                            id="aivisCloudPitch"
                            type="number"
                            min="-1"
                            max="1"
                            step="0.05"
                            value={aivisCloudPitch}
                            onChange={(e) => setAivisCloudPitch(e.target.value)}
                            placeholder="例: 0.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudVolume"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Volume:
                          </label>
                          <input
                            id="aivisCloudVolume"
                            type="number"
                            min="0"
                            max="2"
                            step="0.05"
                            value={aivisCloudVolume}
                            onChange={(e) =>
                              setAivisCloudVolume(e.target.value)
                            }
                            placeholder="例: 1.0"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudLeadingSilence"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Leading Silence (sec):
                          </label>
                          <input
                            id="aivisCloudLeadingSilence"
                            type="number"
                            min="0"
                            max="60"
                            step="0.05"
                            value={aivisCloudLeadingSilence}
                            onChange={(e) =>
                              setAivisCloudLeadingSilence(e.target.value)
                            }
                            placeholder="0.0〜60.0"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudTrailingSilence"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Trailing Silence (sec):
                          </label>
                          <input
                            id="aivisCloudTrailingSilence"
                            type="number"
                            min="0"
                            max="60"
                            step="0.05"
                            value={aivisCloudTrailingSilence}
                            onChange={(e) =>
                              setAivisCloudTrailingSilence(e.target.value)
                            }
                            placeholder="0.0〜60.0"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudLineBreakSilence"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Line Break Silence (sec):
                          </label>
                          <input
                            id="aivisCloudLineBreakSilence"
                            type="number"
                            min="0"
                            max="60"
                            step="0.05"
                            value={aivisCloudLineBreakSilence}
                            onChange={(e) =>
                              setAivisCloudLineBreakSilence(e.target.value)
                            }
                            placeholder="改行毎の無音"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudOutputFormat"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Output Format:
                          </label>
                          <select
                            id="aivisCloudOutputFormat"
                            value={aivisCloudOutputFormat}
                            onChange={(e) =>
                              setAivisCloudOutputFormat(
                                e.target.value as AivisCloudOutputFormatOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値（mp3）</option>
                            <option value="wav">wav</option>
                            <option value="flac">flac</option>
                            <option value="mp3">mp3</option>
                            <option value="aac">aac</option>
                            <option value="opus">opus</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudOutputBitrate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Output Bitrate (kbps):
                          </label>
                          <input
                            id="aivisCloudOutputBitrate"
                            type="number"
                            min="8"
                            max="320"
                            step="8"
                            value={aivisCloudOutputBitrate}
                            onChange={(e) =>
                              setAivisCloudOutputBitrate(e.target.value)
                            }
                            placeholder="例: 192（mp3/aac/opusのみ）"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudOutputSamplingRate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Output Sampling Rate:
                          </label>
                          <select
                            id="aivisCloudOutputSamplingRate"
                            value={aivisCloudOutputSamplingRate}
                            onChange={(e) =>
                              setAivisCloudOutputSamplingRate(
                                e.target
                                  .value as AivisCloudOutputSamplingRateOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値</option>
                            <option value="8000">8,000 Hz</option>
                            <option value="11025">11,025 Hz</option>
                            <option value="12000">12,000 Hz</option>
                            <option value="16000">16,000 Hz</option>
                            <option value="22050">22,050 Hz</option>
                            <option value="24000">24,000 Hz</option>
                            <option value="44100">44,100 Hz</option>
                            <option value="48000">48,000 Hz</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudOutputChannels"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Output Channels:
                          </label>
                          <select
                            id="aivisCloudOutputChannels"
                            value={aivisCloudOutputChannels}
                            onChange={(e) =>
                              setAivisCloudOutputChannels(
                                e.target.value as AivisCloudOutputChannelOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値（mono）</option>
                            <option value="mono">モノラル</option>
                            <option value="stereo">ステレオ</option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudUserDictionaryUuid"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            User Dictionary UUID:
                          </label>
                          <input
                            id="aivisCloudUserDictionaryUuid"
                            type="text"
                            value={aivisCloudUserDictionaryUuid}
                            onChange={(e) =>
                              setAivisCloudUserDictionaryUuid(e.target.value)
                            }
                            placeholder="適用するユーザー辞書がある場合"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudEnableBillingLogs"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Billing Logs:
                          </label>
                          <select
                            id="aivisCloudEnableBillingLogs"
                            value={aivisCloudEnableBillingLogs}
                            onChange={(e) =>
                              setAivisCloudEnableBillingLogs(
                                e.target.value as AivisCloudBooleanOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値（false）</option>
                            <option value="true">ログを出力する</option>
                            <option value="false">ログを出力しない</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8em', color: '#5c677d' }}>
                        スタイル ID
                        とスタイル名はどちらか片方のみ指定してください。 SSML
                        を有効にすると改行や &lt;break&gt;
                        タグに応じて音声が分割されます。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'aivisSpeech' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f4f5ff',
                        borderRadius: '8px',
                        border: '1px solid #dbe4ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#364fc7',
                        }}
                      >
                        AivisSpeech パラメータ
                      </div>

                      <label
                        htmlFor="aivisSpeedScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Speed Scale:
                      </label>
                      <input
                        id="aivisSpeedScale"
                        type="number"
                        step="0.05"
                        value={aivisSpeedScale}
                        onChange={(e) => setAivisSpeedScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="aivisPitchScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        ピッチ倍率:
                      </label>
                      <input
                        id="aivisPitchScale"
                        type="number"
                        step="0.05"
                        value={aivisPitchScale}
                        onChange={(e) => setAivisPitchScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="aivisIntonationScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Intonation Scale (0.0 ~ 2.0):
                      </label>
                      <input
                        id="aivisIntonationScale"
                        type="number"
                        step="0.05"
                        value={aivisIntonationScale}
                        onChange={(e) =>
                          setAivisIntonationScale(e.target.value)
                        }
                        placeholder="感情の強さ"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="aivisTempoDynamicsScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Tempo Dynamics Scale:
                      </label>
                      <input
                        id="aivisTempoDynamicsScale"
                        type="number"
                        step="0.05"
                        value={aivisTempoDynamicsScale}
                        onChange={(e) =>
                          setAivisTempoDynamicsScale(e.target.value)
                        }
                        placeholder="話速の緩急"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="aivisVolumeScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        音量倍率:
                      </label>
                      <input
                        id="aivisVolumeScale"
                        type="number"
                        step="0.05"
                        value={aivisVolumeScale}
                        onChange={(e) => setAivisVolumeScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisPrePhonemeLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            前無音 (秒):
                          </label>
                          <input
                            id="aivisPrePhonemeLength"
                            type="number"
                            step="0.01"
                            value={aivisPrePhonemeLength}
                            onChange={(e) =>
                              setAivisPrePhonemeLength(e.target.value)
                            }
                            placeholder="例: 0.15"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisPostPhonemeLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            後無音 (秒):
                          </label>
                          <input
                            id="aivisPostPhonemeLength"
                            type="number"
                            step="0.01"
                            value={aivisPostPhonemeLength}
                            onChange={(e) =>
                              setAivisPostPhonemeLength(e.target.value)
                            }
                            placeholder="例: 0.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisPauseLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            ポーズ長 (秒):
                          </label>
                          <input
                            id="aivisPauseLength"
                            type="number"
                            step="0.05"
                            value={aivisPauseLength}
                            onChange={(e) =>
                              setAivisPauseLength(e.target.value)
                            }
                            placeholder="例: 0.4"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisPauseLengthScale"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            ポーズ倍率:
                          </label>
                          <input
                            id="aivisPauseLengthScale"
                            type="number"
                            step="0.05"
                            value={aivisPauseLengthScale}
                            onChange={(e) =>
                              setAivisPauseLengthScale(e.target.value)
                            }
                            placeholder="例: 1.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisOutputSamplingRate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            サンプリングレート:
                          </label>
                          <select
                            id="aivisOutputSamplingRate"
                            value={aivisOutputSamplingRate}
                            onChange={(e) =>
                              setAivisOutputSamplingRate(e.target.value)
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値を使用</option>
                            <option value="8000">8,000 Hz</option>
                            <option value="11025">11,025 Hz</option>
                            <option value="16000">16,000 Hz</option>
                            <option value="22050">22,050 Hz</option>
                            <option value="24000">24,000 Hz</option>
                            <option value="44100">44,100 Hz</option>
                            <option value="48000">48,000 Hz</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="aivisOutputStereo"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            出力チャンネル:
                          </label>
                          <select
                            id="aivisOutputStereo"
                            value={aivisOutputStereo}
                            onChange={(e) =>
                              setAivisOutputStereo(
                                e.target.value as 'default' | 'mono' | 'stereo',
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値を使用</option>
                            <option value="mono">モノラル (false)</option>
                            <option value="stereo">ステレオ (true)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8em', color: '#5c677d' }}>
                        tempoDynamicsScale はテンポの緩急、Intonation Scale
                        は感情表現の強さを制御します。空欄の場合は既定値が利用されます。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine !== 'none' &&
                    VOICE_ENGINE_CONFIGS[selectedVoiceEngine].apiUrl && (
                      <div
                        style={{
                          fontSize: '0.9em',
                          color: '#666',
                          marginBottom: '12px',
                        }}
                      >
                        <strong>API URL:</strong>{' '}
                        {VOICE_ENGINE_CONFIGS[selectedVoiceEngine].apiUrl}
                      </div>
                    )}

                  {/* Speaker Selection */}
                  {selectedVoiceEngine !== 'none' &&
                    selectedVoiceEngine !== 'openaiCompatible' &&
                    selectedVoiceEngine !== 'elevenLabs' &&
                    selectedVoiceEngine !== 'inworld' && (
                      <>
                        <label
                          htmlFor="voiceSpeaker"
                          style={{ marginTop: '16px', display: 'block' }}
                        >
                          音声:
                        </label>
                        <select
                          id="voiceSpeaker"
                          value={String(
                            selectedSpeakers[selectedVoiceEngine] || '',
                          )}
                          onChange={(e) => {
                            const value =
                              selectedVoiceEngine === 'voicevox' ||
                              selectedVoiceEngine === 'aivisSpeech'
                                ? Number(e.target.value)
                                : e.target.value;
                            setSelectedSpeakers((prev) => ({
                              ...prev,
                              [selectedVoiceEngine]: value,
                            }));
                          }}
                          style={{ width: '100%', marginBottom: '12px' }}
                        >
                          {/* OpenAI TTS */}
                          {selectedVoiceEngine === 'openai' &&
                            OPENAI_TTS_SPEAKERS.map((speaker) => (
                              <option key={speaker.id} value={speaker.id}>
                                {speaker.name}{' '}
                                {speaker.description &&
                                  `- ${speaker.description}`}
                              </option>
                            ))}

                          {selectedVoiceEngine === 'geminiTts' &&
                            GEMINI_TTS_SPEAKERS.map((speaker) => (
                              <option key={speaker} value={speaker}>
                                {speaker}
                              </option>
                            ))}

                          {/* VOICEVOX */}
                          {selectedVoiceEngine === 'voicevox' &&
                          availableSpeakers.voicevox
                            ? availableSpeakers.voicevox.flatMap(
                                (speaker: any) =>
                                  speaker.styles?.map((style: any) => (
                                    <option
                                      key={`${speaker.speaker_uuid}-${style.id}`}
                                      value={style.id}
                                    >
                                      {speaker.name} - {style.name}
                                    </option>
                                  )) || [],
                              )
                            : selectedVoiceEngine === 'voicevox' && (
                                <option value="">
                                  ローカルサーバーから取得中...
                                </option>
                              )}

                          {/* Aivis Speech */}
                          {selectedVoiceEngine === 'aivisSpeech' &&
                          availableSpeakers.aivisSpeech
                            ? availableSpeakers.aivisSpeech.flatMap(
                                (speaker: any) =>
                                  speaker.styles?.map((style: any) => (
                                    <option
                                      key={`${speaker.speaker_uuid}-${style.id}`}
                                      value={style.id}
                                    >
                                      {speaker.name} - {style.name}
                                    </option>
                                  )) || [],
                              )
                            : selectedVoiceEngine === 'aivisSpeech' && (
                                <option value="">
                                  ローカルサーバーから取得中...
                                </option>
                              )}

                          {/* Aivis Cloud */}
                          {selectedVoiceEngine === 'aivisCloud' &&
                            AIVIS_CLOUD_MODELS.map((model) => (
                              <option
                                key={model.aivm_model_uuid}
                                value={model.aivm_model_uuid}
                              >
                                {model.name}
                              </option>
                            ))}

                          {/* VoicePeak */}
                          {selectedVoiceEngine === 'voicepeak' &&
                            VOICEPEAK_SPEAKERS.map((speaker) => (
                              <option key={speaker.id} value={speaker.id}>
                                {speaker.name}
                              </option>
                            ))}

                          {/* MiniMax */}
                          {selectedVoiceEngine === 'minimax' &&
                            Object.entries(MINIMAX_VOICES).map(
                              ([voiceId, description]) => (
                                <option key={voiceId} value={voiceId}>
                                  {description}
                                </option>
                              ),
                            )}

                          {selectedVoiceEngine === 'xai' &&
                            XAI_TTS_SPEAKERS.map((speaker) => (
                              <option key={speaker} value={speaker}>
                                {speaker}
                              </option>
                            ))}

                          {selectedVoiceEngine === 'unrealSpeech' &&
                            UNREAL_SPEECH_SPEAKERS.map((speaker) => (
                              <option key={speaker} value={speaker}>
                                {speaker}
                              </option>
                            ))}

                          {selectedVoiceEngine === 'gradium' &&
                            Object.entries(GRADIUM_VOICES).map(
                              ([voiceId, label]) => (
                                <option key={voiceId} value={voiceId}>
                                  {label}
                                </option>
                              ),
                            )}

                          {selectedVoiceEngine === 'piperPlus' && (
                            <option value="default">default</option>
                          )}
                        </select>
                      </>
                    )}

                  {selectedVoiceEngine !== 'none' && (
                    <div
                      style={{
                        fontSize: '0.9em',
                        color: '#666',
                        marginBottom: '12px',
                      }}
                    >
                      {selectedVoiceEngine === 'minimax'
                        ? 'MiniMaxでは速度・音質のパラメータを調整できます'
                        : selectedVoiceEngine === 'geminiTts'
                          ? 'Gemini TTSでは model / language code / style prompt / audio-tag prompt を設定できます'
                          : selectedVoiceEngine === 'xai'
                            ? 'xAI TTSでは language / codec / sample rate / bit rate を設定できます'
                            : selectedVoiceEngine === 'unrealSpeech'
                              ? 'Unreal Speechでは v8 /stream endpoint の bitrate / codec / speed / pitch / temperature を設定できます'
                              : selectedVoiceEngine === 'elevenLabs'
                                ? 'ElevenLabsでは voice ID / model / output format / voice settings を設定できます'
                                : selectedVoiceEngine === 'inworld'
                                  ? 'Inworldでは voice / model / audio config / delivery mode を設定できます'
                                  : selectedVoiceEngine === 'gradium'
                                    ? 'Gradiumではプリセット音声と output format / temperature / similarity を設定できます'
                                    : selectedVoiceEngine === 'voicevox'
                                      ? 'VOICEVOXでは話速や抑揚・無音長などを細かく調整できます'
                                      : selectedVoiceEngine === 'openai'
                                        ? 'OpenAI TTSでは speed（0.25〜4.0）のみ数値指定が可能です'
                                        : selectedVoiceEngine ===
                                            'openaiCompatible'
                                          ? 'OpenAI-Compatible TTSでは endpoint / model / 任意voice / speed を設定できます'
                                          : selectedVoiceEngine === 'piperPlus'
                                            ? 'Piper Plusでは public/piper/ 配下のWASM assetsを使ってブラウザ内で音声合成します'
                                            : selectedVoiceEngine ===
                                                'aivisCloud'
                                              ? 'Aivis CloudではモデルUUIDや各種出力パラメータを任意に指定できます'
                                              : selectedVoiceEngine ===
                                                  'aivisSpeech'
                                                ? 'AivisSpeechでは抑揚やテンポ緩急など独自パラメータを設定できます'
                                                : '※ 音声パラメータは最適な値に固定されています'}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Avatar Settings */}
                  <h3 style={{ marginTop: '0', marginBottom: '16px' }}>
                    アバター設定
                  </h3>

                  <div style={{ marginBottom: '24px' }}>
                    <img
                      src={avatarImageUrl}
                      alt="Avatar preview"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #e0e0e0',
                        display: 'block',
                        marginBottom: '12px',
                      }}
                    />
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      現在のアバター画像
                    </div>
                  </div>

                  <label
                    htmlFor="avatarUpload"
                    style={{ marginTop: '16px', display: 'block' }}
                  >
                    アバター画像をアップロード:
                  </label>
                  <input
                    type="file"
                    id="avatarUpload"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ marginBottom: '8px', width: '100%' }}
                  />
                  <div
                    style={{
                      fontSize: '0.9em',
                      color: '#666',
                      marginBottom: '16px',
                    }}
                  >
                    ※ 画像は自動的に円形にクロップされます
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      marginTop: '16px',
                    }}
                  >
                    <div style={{ fontSize: '0.9em', color: '#495057' }}>
                      <strong>ヒント：</strong>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>正方形に近い画像がベストです</li>
                        <li>推奨サイズ：200px × 200px 以上</li>
                        <li>対応形式：JPG、PNG、WebP</li>
                      </ul>
                    </div>
                  </div>

                  {/* Avatar Image Generation Settings */}
                  <div
                    style={{
                      marginTop: '24px',
                      padding: '16px',
                      backgroundColor: '#fff3cd',
                      borderRadius: '8px',
                      border: '1px solid #ffeaa7',
                    }}
                  >
                    <h4
                      style={{
                        marginTop: '0',
                        marginBottom: '12px',
                        color: '#856404',
                      }}
                    >
                      AI画像生成機能
                    </h4>

                    <div style={{ marginBottom: '16px' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={enableAvatarGeneration}
                          onChange={(e) =>
                            setEnableAvatarGeneration(e.target.checked)
                          }
                          style={{ marginRight: '8px' }}
                        />
                        アシスタントの返答に基づいてアバター画像を自動生成する
                      </label>
                    </div>

                    {enableAvatarGeneration && (
                      <div>
                        <label
                          htmlFor="geminiImageApiKey"
                          style={{ display: 'block', marginBottom: '8px' }}
                        >
                          Gemini API Key（画像生成用）:
                        </label>
                        <input
                          type="password"
                          id="geminiImageApiKey"
                          placeholder="Gemini API Key for image generation..."
                          value={geminiImageApiKey}
                          onChange={(e) => setGeminiImageApiKey(e.target.value)}
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <div
                          style={{
                            fontSize: '0.85em',
                            color: '#6c757d',
                            marginBottom: '12px',
                          }}
                        >
                          ※ この機能にはGemini-2.5-Flash-Image-Preview
                          APIが使用されます
                        </div>

                        {generatedAvatarImage && (
                          <div>
                            <div
                              style={{
                                fontSize: '0.9em',
                                marginBottom: '8px',
                                fontWeight: 'bold',
                              }}
                            >
                              最後に生成された画像:
                            </div>
                            <img
                              src={generatedAvatarImage}
                              alt="Generated avatar"
                              style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid #28a745',
                                display: 'block',
                                marginBottom: '8px',
                              }}
                            />
                            <button
                              onClick={() => {
                                setAvatarImageUrl(generatedAvatarImage);
                                alert(
                                  '生成された画像をアバターに設定しました！',
                                );
                              }}
                              style={{
                                backgroundColor: '#28a745',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.85em',
                              }}
                            >
                              この画像をアバターに設定
                            </button>
                          </div>
                        )}

                        {isGeneratingAvatar && (
                          <div
                            style={{
                              color: '#28a745',
                              fontWeight: 'bold',
                              marginTop: '8px',
                            }}
                          >
                            🎨 アバター画像を生成中...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '16px',
                textAlign: 'right',
                borderTop: '1px solid #ccc',
                paddingTop: '16px',
                flexShrink: 0,
              }}
            >
              <button
                style={{ marginRight: '8px', backgroundColor: '#666' }}
                onClick={handleCancelSettings}
              >
                キャンセル
              </button>
              <button
                onClick={handleApplySettings}
                style={{ backgroundColor: '#2e997d' }}
              >
                設定を反映
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
