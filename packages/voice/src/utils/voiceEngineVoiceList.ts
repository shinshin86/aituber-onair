import {
  AIVIS_CLOUD_AIVM_MODELS_SEARCH_API_URL,
  AIVIS_SPEECH_API_URL,
  ELEVENLABS_VOICES_API_URL,
  GRADIUM_VOICES_API_URL,
  INWORLD_VOICES_API_URL,
  VOICE_VOX_API_URL,
  XAI_VOICES_API_URL,
} from '../constants/voiceEngine';
import type {
  VoiceEngineVoice,
  VoiceEngineVoiceListOptions,
} from '../types/capabilities';
import type { VoiceEngineType } from '../types/voiceEngine';
import { fetchWithTimeout } from '../engines/internal/utils';
import { getWebSpeechVoiceList } from '../engines/WebSpeechEngine';

interface LocalSpeakerStyleResponse {
  id: number | string;
  name: string;
}

interface LocalSpeakerResponse {
  name: string;
  styles?: LocalSpeakerStyleResponse[];
}

interface XaiVoiceResponse {
  voice_id: string;
  name: string;
}

interface XaiVoiceListResponse {
  voices?: XaiVoiceResponse[];
}

interface ElevenLabsVoiceResponse {
  voice_id: string;
  name: string;
  category?: string;
}

interface ElevenLabsVoiceListResponse {
  voices?: ElevenLabsVoiceResponse[];
}

interface InworldVoiceResponse {
  voiceId: string;
  displayName?: string;
  langCode?: string;
  promptLanguages?: string[];
  gender?: string;
}

interface InworldVoiceListResponse {
  voices?: InworldVoiceResponse[];
  nextPageToken?: string;
}

interface GradiumVoiceResponse {
  uid: string;
  name: string;
  is_catalog?: boolean;
  is_pro_clone?: boolean;
  language?: string | null;
}

interface AivisCloudStyleResponse {
  local_id: number;
  name: string;
}

interface AivisCloudSpeakerResponse {
  aivm_speaker_uuid: string;
  name: string;
  supported_languages?: string[];
  styles?: AivisCloudStyleResponse[];
}

interface AivisCloudModelResponse {
  aivm_model_uuid: string;
  name: string;
  category?: string;
  voice_timbre?: string;
  speakers?: AivisCloudSpeakerResponse[];
}

interface AivisCloudModelSearchResponse {
  aivm_models?: AivisCloudModelResponse[];
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function requireApiKey(engineName: string, apiKey?: string): string {
  const trimmed = apiKey?.trim();

  if (!trimmed) {
    throw new Error(`${engineName} API key is required`);
  }

  return trimmed;
}

function requireApiUrl(defaultApiUrl: string, apiUrl?: string): string {
  const normalizedApiUrl = trimTrailingSlash(apiUrl?.trim() || defaultApiUrl);

  if (!normalizedApiUrl) {
    throw new Error('API URL is required');
  }

  return normalizedApiUrl;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  errorLabel: string,
): Promise<T> {
  const response = await fetchWithTimeout(url, init);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      errorText
        ? `Failed to fetch ${errorLabel}: ${response.status} - ${errorText}`
        : `Failed to fetch ${errorLabel}: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

function isNonEmptyString(value?: string): value is string {
  return Boolean(value);
}

function formatInworldLanguage(voice: InworldVoiceResponse): string {
  const languages = [voice.langCode, ...(voice.promptLanguages ?? [])].filter(
    isNonEmptyString,
  );
  const uniqueLanguages = Array.from(
    new Set(
      languages.map((language) =>
        language.includes('_') ? language.replace('_', '-') : language,
      ),
    ),
  );

  return uniqueLanguages.join(', ') || 'unknown';
}

function isJapaneseInworldVoice(voice: InworldVoiceResponse): boolean {
  const languages = [voice.langCode, ...(voice.promptLanguages ?? [])]
    .filter(isNonEmptyString)
    .map((language) => language.toLowerCase().replace('_', '-'));

  return languages.some((language) => language.startsWith('ja'));
}

async function getLocalSpeakerList(
  engineType: 'voicevox' | 'aivisSpeech',
  options: VoiceEngineVoiceListOptions,
): Promise<VoiceEngineVoice[]> {
  const defaultApiUrl =
    engineType === 'voicevox' ? VOICE_VOX_API_URL : AIVIS_SPEECH_API_URL;
  const apiUrl = requireApiUrl(defaultApiUrl, options.apiUrl);
  const speakers = await fetchJson<LocalSpeakerResponse[]>(
    `${apiUrl}/speakers`,
    { method: 'GET' },
    'speakers',
  );

  return speakers.flatMap((voice) =>
    (voice.styles ?? []).map((style) => ({
      id: String(style.id),
      label: `${voice.name} - ${style.name}`,
    })),
  );
}

async function getXaiVoiceList(
  options: VoiceEngineVoiceListOptions,
): Promise<VoiceEngineVoice[]> {
  const apiKey = requireApiKey('xAI', options.apiKey);
  const url = options.voiceListApiUrl?.trim() || XAI_VOICES_API_URL;
  const result = await fetchJson<XaiVoiceListResponse>(
    url,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
    'speakers',
  );

  return (result.voices ?? []).map((voice) => ({
    id: voice.voice_id,
    label: voice.name,
  }));
}

async function getElevenLabsVoiceList(
  options: VoiceEngineVoiceListOptions,
): Promise<VoiceEngineVoice[]> {
  const apiKey = requireApiKey('ElevenLabs', options.apiKey);
  const url = options.voiceListApiUrl?.trim() || ELEVENLABS_VOICES_API_URL;
  const result = await fetchJson<ElevenLabsVoiceListResponse>(
    url,
    {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    },
    'speakers',
  );

  return (result.voices ?? []).map((voice) => ({
    id: voice.voice_id,
    label: voice.category ? `${voice.name} (${voice.category})` : voice.name,
    metadata: voice.category ? { category: voice.category } : undefined,
  }));
}

async function getInworldVoiceList(
  options: VoiceEngineVoiceListOptions,
): Promise<VoiceEngineVoice[]> {
  const apiKey = requireApiKey('Inworld', options.apiKey);
  const voices: InworldVoiceResponse[] = [];
  let pageToken = '';

  do {
    const url = new URL(
      options.voiceListApiUrl?.trim() || INWORLD_VOICES_API_URL,
    );
    url.searchParams.set('orderBy', 'display_name asc');
    url.searchParams.set('pageSize', String(options.pageSize ?? 2000));

    if (options.language && options.language !== 'all') {
      url.searchParams.set('filter', `lang_code = "${options.language}"`);
    }

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const result = await fetchJson<InworldVoiceListResponse>(
      url.toString(),
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${apiKey}`,
        },
      },
      'speakers',
    );

    voices.push(...(result.voices ?? []));
    pageToken = result.nextPageToken ?? '';
  } while (pageToken);

  return voices
    .sort((a, b) => {
      const languagePriority =
        Number(isJapaneseInworldVoice(b)) - Number(isJapaneseInworldVoice(a));

      if (languagePriority !== 0) {
        return languagePriority;
      }

      return (a.displayName ?? a.voiceId).localeCompare(
        b.displayName ?? b.voiceId,
      );
    })
    .map((voice) => {
      const language = formatInworldLanguage(voice);
      const metadata = [language, voice.gender].filter(Boolean).join(' / ');

      return {
        id: voice.voiceId,
        label: metadata
          ? `${voice.displayName ?? voice.voiceId} (${metadata})`
          : (voice.displayName ?? voice.voiceId),
        metadata: {
          language,
          ...(voice.gender ? { gender: voice.gender } : {}),
        },
      };
    });
}

async function getGradiumVoiceList(
  options: VoiceEngineVoiceListOptions,
): Promise<VoiceEngineVoice[]> {
  const apiKey = requireApiKey('Gradium', options.apiKey);
  const url = new URL(
    options.voiceListApiUrl?.trim() || GRADIUM_VOICES_API_URL,
  );
  url.searchParams.set(
    'include_catalog',
    String(options.includeCatalog ?? true),
  );

  if (options.limit !== undefined) {
    url.searchParams.set('limit', String(options.limit));
  }

  if (options.skip !== undefined) {
    url.searchParams.set('skip', String(options.skip));
  }

  const voices = await fetchJson<GradiumVoiceResponse[]>(
    url.toString(),
    {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    },
    'speakers',
  );

  return voices.map((voice) => ({
    id: voice.uid,
    label: voice.name,
    metadata: {
      ...(voice.language ? { language: voice.language } : {}),
      ...(voice.is_catalog !== undefined
        ? { catalog: String(voice.is_catalog) }
        : {}),
      ...(voice.is_pro_clone !== undefined
        ? { proClone: String(voice.is_pro_clone) }
        : {}),
    },
  }));
}

async function getAivisCloudVoiceList(
  options: VoiceEngineVoiceListOptions,
): Promise<VoiceEngineVoice[]> {
  const url = new URL(
    options.voiceListApiUrl?.trim() || AIVIS_CLOUD_AIVM_MODELS_SEARCH_API_URL,
  );

  if (options.limit !== undefined) {
    url.searchParams.set('limit', String(options.limit));
  }

  const headers: Record<string, string> = {};
  const apiKey = options.apiKey?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const result = await fetchJson<AivisCloudModelSearchResponse>(
    url.toString(),
    {
      method: 'GET',
      headers,
    },
    'speakers',
  );

  return (result.aivm_models ?? []).map((model) => {
    const speakers = model.speakers ?? [];
    const speakerNames = speakers.map((speaker) => speaker.name);
    const styleNames = speakers.flatMap((speaker) =>
      (speaker.styles ?? []).map((style) => style.name),
    );
    const languages = speakers.flatMap(
      (speaker) => speaker.supported_languages ?? [],
    );

    return {
      id: model.aivm_model_uuid,
      label: model.name,
      metadata: {
        ...(speakerNames.length > 0
          ? { speakers: Array.from(new Set(speakerNames)).join(', ') }
          : {}),
        ...(styleNames.length > 0
          ? { styles: Array.from(new Set(styleNames)).join(', ') }
          : {}),
        ...(languages.length > 0
          ? { languages: Array.from(new Set(languages)).join(', ') }
          : {}),
        ...(model.category ? { category: model.category } : {}),
        ...(model.voice_timbre ? { voiceTimbre: model.voice_timbre } : {}),
      },
    };
  });
}

async function getBrowserWebSpeechVoiceList(
  options: VoiceEngineVoiceListOptions,
): Promise<VoiceEngineVoice[]> {
  const voices = await getWebSpeechVoiceList({
    timeoutMs: options.timeoutMs,
  });

  return voices.map((voice) => ({
    id: voice.voiceURI || voice.name,
    label: `${voice.name}${voice.lang ? ` (${voice.lang})` : ''}`,
    metadata: {
      ...(voice.lang ? { language: voice.lang } : {}),
      ...(voice.localService !== undefined
        ? { localService: String(voice.localService) }
        : {}),
      ...(voice.default !== undefined
        ? { default: String(voice.default) }
        : {}),
    },
  }));
}

export async function getVoiceEngineVoiceList(
  engineType: VoiceEngineType,
  options: VoiceEngineVoiceListOptions = {},
): Promise<VoiceEngineVoice[]> {
  switch (engineType) {
    case 'voicevox':
    case 'aivisSpeech':
      return getLocalSpeakerList(engineType, options);
    case 'xai':
      return getXaiVoiceList(options);
    case 'elevenLabs':
      return getElevenLabsVoiceList(options);
    case 'inworld':
      return getInworldVoiceList(options);
    case 'gradium':
      return getGradiumVoiceList(options);
    case 'aivisCloud':
      return getAivisCloudVoiceList(options);
    case 'webSpeech':
      return getBrowserWebSpeechVoiceList(options);
    default:
      throw new Error(`Voice list is not supported for engine: ${engineType}`);
  }
}
