import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  AIVIS_SPEECH_API_URL,
  ELEVENLABS_TTS_API_URL,
  GEMINI_TTS_API_URL,
  GRADIUM_TTS_API_URL,
  INWORLD_TTS_API_URL,
  OPENAI_COMPATIBLE_TTS_API_URL,
  UNREAL_SPEECH_TTS_API_URL,
  VOICEPEAK_API_URL,
  VOICE_VOX_API_URL,
  VoiceEngineAdapter,
  getAllVoiceEngineCapabilities,
  getVoiceEngineVoiceList,
} = require('@aituber-onair/voice');

const OPENAI_MODELS = ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'];
const OPENAI_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
];
const ELEVENLABS_MODELS = [
  'eleven_multilingual_v2',
  'eleven_flash_v2_5',
  'eleven_turbo_v2_5',
];
const INWORLD_MODELS = [
  'inworld-tts-2',
  'inworld-tts-1.5-mini',
  'inworld-tts-1.5-max',
];
const GEMINI_MODELS = [
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
];
const MINIMAX_MODELS = [
  'speech-2.6-hd',
  'speech-2.6-turbo',
  'speech-2.5-hd-preview',
  'speech-2.5-turbo-preview',
  'speech-02-hd',
  'speech-02-turbo',
  'speech-01-hd',
  'speech-01-turbo',
];

// These fields are presentation defaults that the capability API does not
// expose. Provider behavior and request shapes remain owned by the voice package.
const PROVIDER_METADATA = {
  voicevox: {
    label: 'VOICEVOX',
    defaultEndpoint: VOICE_VOX_API_URL,
    defaultModel: '',
    defaultVoice: '',
    models: [],
    voices: [],
    modelRequired: false,
    voiceRequired: true,
    acceptsApiKey: false,
    speed: { min: 0.5, max: 1.5, step: 0.05 },
  },
  voicepeak: {
    label: 'VOICEPEAK',
    defaultEndpoint: VOICEPEAK_API_URL,
    defaultModel: '',
    defaultVoice: 'f1',
    models: [],
    voices: [],
    modelRequired: false,
    voiceRequired: true,
    acceptsApiKey: false,
    speed: { min: 0.5, max: 2, step: 0.05 },
  },
  openai: {
    label: 'OpenAI',
    defaultEndpoint: '',
    defaultModel: 'gpt-4o-mini-tts',
    defaultVoice: 'coral',
    models: OPENAI_MODELS,
    voices: OPENAI_VOICES,
    modelRequired: true,
    voiceRequired: true,
    acceptsApiKey: true,
    speed: { min: 0.25, max: 4, step: 0.05 },
  },
  xai: {
    label: 'xAI',
    defaultEndpoint: '',
    defaultModel: '',
    defaultVoice: 'eve',
    models: [],
    voices: [],
    modelRequired: false,
    voiceRequired: true,
    acceptsApiKey: true,
  },
  unrealSpeech: {
    label: 'Unreal Speech',
    defaultEndpoint: UNREAL_SPEECH_TTS_API_URL,
    defaultModel: '',
    defaultVoice: 'af_bella',
    models: [],
    voices: [],
    modelRequired: false,
    voiceRequired: true,
    acceptsApiKey: true,
  },
  elevenLabs: {
    label: 'ElevenLabs',
    defaultEndpoint: ELEVENLABS_TTS_API_URL,
    defaultModel: 'eleven_multilingual_v2',
    defaultVoice: '',
    models: ELEVENLABS_MODELS,
    voices: [],
    modelRequired: true,
    voiceRequired: true,
    acceptsApiKey: true,
    speed: { min: 0.7, max: 1.2, step: 0.05 },
  },
  inworld: {
    label: 'Inworld',
    defaultEndpoint: INWORLD_TTS_API_URL,
    defaultModel: 'inworld-tts-2',
    defaultVoice: 'Ashley',
    models: INWORLD_MODELS,
    voices: [],
    modelRequired: true,
    voiceRequired: true,
    acceptsApiKey: true,
  },
  gradium: {
    label: 'Gradium',
    defaultEndpoint: GRADIUM_TTS_API_URL,
    defaultModel: '',
    defaultVoice: 'YTpq7expH9539ERJ',
    models: [],
    voices: [],
    modelRequired: false,
    voiceRequired: true,
    acceptsApiKey: true,
  },
  geminiTts: {
    label: 'Gemini TTS',
    defaultEndpoint: GEMINI_TTS_API_URL,
    defaultModel: 'gemini-3.1-flash-tts-preview',
    defaultVoice: 'Zephyr',
    models: GEMINI_MODELS,
    voices: [],
    modelRequired: true,
    voiceRequired: true,
    acceptsApiKey: true,
  },
  openaiCompatible: {
    label: 'OpenAI-Compatible',
    defaultEndpoint: OPENAI_COMPATIBLE_TTS_API_URL,
    defaultModel: 'tts-1',
    defaultVoice: '',
    models: [],
    voices: [],
    modelRequired: true,
    voiceRequired: false,
    acceptsApiKey: true,
    speed: { min: 0.25, max: 4, step: 0.05 },
  },
  aivisSpeech: {
    label: 'AivisSpeech',
    defaultEndpoint: AIVIS_SPEECH_API_URL,
    defaultModel: '',
    defaultVoice: '',
    models: [],
    voices: [],
    modelRequired: false,
    voiceRequired: true,
    acceptsApiKey: false,
    speed: { min: 0.5, max: 1.5, step: 0.05 },
  },
  aivisCloud: {
    label: 'Aivis Cloud API',
    defaultEndpoint: '',
    defaultModel: '',
    defaultVoice: 'a59cb814-0083-4369-8542-f51a29e72af7',
    models: [],
    voices: [],
    modelRequired: false,
    voiceRequired: true,
    acceptsApiKey: true,
    speed: { min: 0.5, max: 2, step: 0.05 },
  },
  minimax: {
    label: 'MiniMax',
    defaultEndpoint: '',
    defaultModel: 'speech-2.6-hd',
    defaultVoice: 'Japanese_IntellectualSenior',
    models: MINIMAX_MODELS,
    voices: [],
    modelRequired: true,
    voiceRequired: true,
    acceptsApiKey: true,
    requiresGroupId: true,
  },
};

export const EXCLUDED_SERVER_TTS_ENGINES = new Map([
  [
    'piperPlus',
    'Browser-only engine; it loads local browser assets and cannot run in this Node server.',
  ],
  [
    'webSpeech',
    'Browser-only engine; the Web Speech API does not return audio bytes to the server.',
  ],
  [
    'none',
    'The engine intentionally produces no audio bytes, so it cannot satisfy the speech endpoint.',
  ],
]);

const MOCK_PROVIDER = {
  provider: 'mock',
  label: 'Built-in mock (development)',
  models: ['mock-tts'],
  voices: ['miko'],
  defaultModel: 'mock-tts',
  defaultVoice: 'miko',
  defaultEndpoint: '',
  requiresApiKey: false,
  acceptsApiKey: false,
  supportsCustomEndpoint: false,
  supportsVoiceList: false,
  supportsSpeed: false,
  modelRequired: true,
  voiceRequired: true,
  requiresGroupId: false,
  developmentOnly: true,
};

const normalizeHttpUrl = (value, fallback) => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol)
      ? url.toString().replace(/\/+$/, '')
      : fallback;
  } catch {
    return fallback;
  }
};

const getSpeedRange = (provider) =>
  provider.speed ?? { min: 0.25, max: 4, step: 0.05 };

const clampSpeed = (value, provider) => {
  const { min, max } = getSpeedRange(provider);
  const speed = Number(value);
  return Number.isFinite(speed) ? Math.min(max, Math.max(min, speed)) : 1;
};

export const normalizeTtsProviderId = (provider) =>
  provider === 'openai-compatible' ? 'openaiCompatible' : provider;

export const getTtsProviderRecords = () => {
  const records = getAllVoiceEngineCapabilities()
    .filter(({ engineType, runtimes }) => {
      return (
        runtimes.includes('server') &&
        !EXCLUDED_SERVER_TTS_ENGINES.has(engineType)
      );
    })
    .map((capabilities) => {
      const metadata = PROVIDER_METADATA[capabilities.engineType];
      if (!metadata) {
        throw new Error(
          `Missing admin metadata for voice engine: ${capabilities.engineType}`,
        );
      }
      const speed = metadata.speed;
      return {
        provider: capabilities.engineType,
        label: metadata.label,
        models: [...metadata.models],
        voices: [...metadata.voices],
        defaultModel: metadata.defaultModel,
        defaultVoice: metadata.defaultVoice,
        defaultEndpoint: metadata.defaultEndpoint,
        requiresApiKey: capabilities.requiresApiKey,
        acceptsApiKey: metadata.acceptsApiKey,
        supportsCustomEndpoint: capabilities.supportsCustomEndpoint,
        supportsVoiceList: capabilities.supportsVoiceList,
        supportsSpeed: Boolean(speed),
        ...(speed
          ? {
              speedMin: speed.min,
              speedMax: speed.max,
              speedStep: speed.step,
            }
          : {}),
        modelRequired: metadata.modelRequired,
        voiceRequired: metadata.voiceRequired,
        requiresGroupId: metadata.requiresGroupId ?? false,
      };
    });

  return [...records, { ...MOCK_PROVIDER }];
};

export const getExcludedTtsProviderRecords = () =>
  getAllVoiceEngineCapabilities()
    .filter(({ engineType }) => EXCLUDED_SERVER_TTS_ENGINES.has(engineType))
    .map(({ engineType }) => ({
      provider: engineType,
      reason: EXCLUDED_SERVER_TTS_ENGINES.get(engineType),
    }));

export const getTtsProvider = (provider) => {
  const normalizedProvider = normalizeTtsProviderId(provider);
  return getTtsProviderRecords().find(
    (candidate) => candidate.provider === normalizedProvider,
  );
};

export const createDefaultTtsSettings = () => {
  const provider = getTtsProvider('openai');
  return {
    provider: provider.provider,
    model: provider.defaultModel,
    voice: provider.defaultVoice,
    apiKey: '',
    endpoint: provider.defaultEndpoint,
    speed: 1,
    groupId: '',
  };
};

export const normalizeStoredTtsSettings = (candidate) => {
  const provider =
    getTtsProvider(candidate?.provider) ?? getTtsProvider('openai');
  const candidateModel =
    typeof candidate?.model === 'string' ? candidate.model.trim() : '';
  const model =
    provider.models.length === 0 || provider.models.includes(candidateModel)
      ? candidateModel || provider.defaultModel
      : provider.defaultModel;
  const candidateVoice =
    typeof candidate?.voice === 'string' ? candidate.voice.trim() : '';

  return {
    provider: provider.provider,
    model,
    voice: candidateVoice || provider.defaultVoice,
    apiKey:
      typeof candidate?.apiKey === 'string' ? candidate.apiKey.trim() : '',
    endpoint: provider.supportsCustomEndpoint
      ? normalizeHttpUrl(candidate?.endpoint, provider.defaultEndpoint)
      : '',
    speed: provider.supportsSpeed ? clampSpeed(candidate?.speed, provider) : 1,
    groupId:
      typeof candidate?.groupId === 'string' ? candidate.groupId.trim() : '',
  };
};

const validateHttpUrl = (value, label) => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`${label} must be a full HTTP(S) URL.`);
  }
};

export const validateTtsSettings = (payload, currentSettings) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('TTS settings must be a JSON object.');
  }
  const allowedKeys = new Set([
    'provider',
    'model',
    'voice',
    'apiKey',
    'endpoint',
    'speed',
    'groupId',
  ]);
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
    throw new Error('TTS settings contains an unsupported field.');
  }

  const provider = getTtsProvider(payload.provider);
  if (!provider) throw new Error('Select a registered TTS provider.');
  for (const key of ['model', 'voice', 'apiKey', 'endpoint', 'groupId']) {
    if (payload[key] !== undefined && typeof payload[key] !== 'string') {
      throw new Error(`TTS ${key} must be text.`);
    }
  }

  const model = payload.model?.trim() ?? '';
  if (provider.modelRequired && !model) {
    throw new Error('A TTS model is required.');
  }
  if (provider.models.length > 0 && !provider.models.includes(model)) {
    throw new Error('Select a model registered for the TTS provider.');
  }

  const voice = payload.voice?.trim() || provider.defaultVoice;
  if (provider.voiceRequired && !voice) {
    throw new Error('A TTS voice or speaker ID is required.');
  }

  let speed = 1;
  if (provider.supportsSpeed) {
    speed = Number(payload.speed);
    const min = provider.speedMin;
    const max = provider.speedMax;
    if (!Number.isFinite(speed) || speed < min || speed > max) {
      throw new Error(`TTS speed must be between ${min} and ${max}.`);
    }
  }

  const endpoint = provider.supportsCustomEndpoint
    ? validateHttpUrl(
        payload.endpoint?.trim() || provider.defaultEndpoint,
        'The speech endpoint',
      )
    : '';
  const sameProvider = currentSettings?.provider === provider.provider;
  const apiKey =
    payload.apiKey?.trim() || (sameProvider ? currentSettings.apiKey : '');
  const groupId =
    payload.groupId?.trim() || (sameProvider ? currentSettings.groupId : '');

  if (provider.requiresApiKey && !apiKey) {
    throw new Error('The TTS provider requires a server-side API key.');
  }
  if (provider.requiresGroupId && !groupId) {
    throw new Error('The TTS provider requires a Group ID.');
  }

  return {
    provider: provider.provider,
    model,
    voice,
    apiKey,
    endpoint,
    speed,
    groupId,
  };
};

export const isTtsConfigured = (candidate) => {
  const provider = getTtsProvider(candidate.provider);
  if (!provider) return false;
  if (provider.modelRequired && !candidate.model) return false;
  if (provider.voiceRequired && !candidate.voice) return false;
  if (provider.supportsCustomEndpoint && !candidate.endpoint) return false;
  if (provider.requiresApiKey && !candidate.apiKey) return false;
  if (provider.requiresGroupId && !candidate.groupId) return false;
  return true;
};

export const getTtsVoiceList = async ({
  provider: providerId,
  endpoint,
  apiKey,
}) => {
  const provider = getTtsProvider(providerId);
  if (!provider || provider.provider === 'mock') {
    throw new Error('Select a registered voice-list provider.');
  }
  if (!provider.supportsVoiceList) {
    throw new Error('This TTS provider does not expose a voice-list API.');
  }
  const apiUrl = provider.supportsCustomEndpoint
    ? validateHttpUrl(
        endpoint?.trim() || provider.defaultEndpoint,
        'The speech endpoint',
      )
    : undefined;
  return getVoiceEngineVoiceList(provider.provider, {
    apiKey: apiKey?.trim() || undefined,
    apiUrl,
  });
};

export const createVoiceServiceOptions = (currentSettings, onPlay) => {
  const common = {
    engineType: currentSettings.provider,
    speaker: currentSettings.voice,
    apiKey: currentSettings.apiKey || undefined,
    onPlay,
  };

  switch (currentSettings.provider) {
    case 'voicevox':
      return {
        ...common,
        voicevoxApiUrl: currentSettings.endpoint,
        voicevoxSpeedScale: currentSettings.speed,
      };
    case 'voicepeak':
      return {
        ...common,
        voicepeakApiUrl: currentSettings.endpoint,
        voicepeakSpeed: Math.round(currentSettings.speed * 100),
      };
    case 'openai':
      return {
        ...common,
        openAiModel: currentSettings.model,
        openAiSpeed: currentSettings.speed,
      };
    case 'xai':
      return common;
    case 'unrealSpeech':
      return {
        ...common,
        unrealSpeechApiUrl: currentSettings.endpoint,
      };
    case 'elevenLabs':
      return {
        ...common,
        elevenLabsApiUrl: currentSettings.endpoint,
        elevenLabsModel: currentSettings.model,
        elevenLabsSpeed: currentSettings.speed,
      };
    case 'inworld':
      return {
        ...common,
        inworldApiUrl: currentSettings.endpoint,
        inworldModel: currentSettings.model,
      };
    case 'gradium':
      return {
        ...common,
        gradiumApiUrl: currentSettings.endpoint,
      };
    case 'geminiTts':
      return {
        ...common,
        geminiTtsApiUrl: currentSettings.endpoint,
        geminiTtsModel: currentSettings.model,
      };
    case 'openaiCompatible':
      return {
        ...common,
        openAiCompatibleApiUrl: currentSettings.endpoint,
        openAiCompatibleModel: currentSettings.model,
        openAiCompatibleSpeed: currentSettings.speed,
      };
    case 'aivisSpeech':
      return {
        ...common,
        aivisSpeechApiUrl: currentSettings.endpoint,
        aivisSpeechSpeedScale: currentSettings.speed,
      };
    case 'aivisCloud':
      return {
        ...common,
        aivisCloudModelUuid: currentSettings.voice,
        aivisCloudSpeakingRate: currentSettings.speed,
      };
    case 'minimax':
      return {
        ...common,
        groupId: currentSettings.groupId,
        minimaxModel: currentSettings.model,
      };
    default:
      throw new Error(
        `Unsupported server TTS provider: ${currentSettings.provider}`,
      );
  }
};

export const synthesizeTtsAudio = async (currentSettings, input) => {
  let audioBuffer;
  const service = new VoiceEngineAdapter(
    createVoiceServiceOptions(currentSettings, async (buffer) => {
      audioBuffer = buffer;
    }),
  );
  await service.speakText(input);
  if (!(audioBuffer instanceof ArrayBuffer)) {
    throw new Error('The voice engine did not return audio bytes.');
  }
  return Buffer.from(audioBuffer);
};

export const detectAudioContentType = (audio) => {
  if (
    audio.length >= 12 &&
    audio.subarray(0, 4).toString('ascii') === 'RIFF' &&
    audio.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    return 'audio/wav';
  }
  if (audio.length >= 4 && audio.subarray(0, 4).toString('ascii') === 'OggS') {
    return 'audio/ogg';
  }
  if (audio.length >= 4 && audio.subarray(0, 4).toString('ascii') === 'fLaC') {
    return 'audio/flac';
  }
  if (audio.length >= 3 && audio.subarray(0, 3).toString('ascii') === 'ID3') {
    return 'audio/mpeg';
  }
  if (audio.length >= 2 && audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg';
  }
  return 'application/octet-stream';
};
