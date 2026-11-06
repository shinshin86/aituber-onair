import {
  type RealtimeTranscriptionSession,
  createRealtimeTranscriptionSession,
} from '@aituber-onair/transcription';

export const VOICE_INPUT_MODES = ['once', 'continuous'] as const;
export type VoiceInputMode = (typeof VOICE_INPUT_MODES)[number];

export const VOICE_INPUT_SERVICES = [
  'browser',
  'openai',
  'gemini',
  'local',
] as const;
export type VoiceInputService = (typeof VOICE_INPUT_SERVICES)[number];
export type CloudVoiceInputService = 'openai' | 'gemini';

export interface LocalVoiceInputSettings {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export const DEFAULT_LOCAL_VOICE_INPUT: LocalVoiceInputSettings = {
  baseUrl: '',
  model: '',
  apiKey: '',
};

export const normalizeLocalVoiceInputSettings = (
  value: unknown,
): LocalVoiceInputSettings => {
  const saved = value as Partial<LocalVoiceInputSettings> | null | undefined;
  return {
    baseUrl: typeof saved?.baseUrl === 'string' ? saved.baseUrl : '',
    model: typeof saved?.model === 'string' ? saved.model : '',
    apiKey: typeof saved?.apiKey === 'string' ? saved.apiKey : '',
  };
};

/**
 * `connecting` covers the time between pressing the mic and the service
 * accepting audio. Cloud services need a network handshake first, so speech
 * during this phase is not transcribed.
 */
export type VoiceInputPhase = 'idle' | 'connecting' | 'listening';

export type VoiceInputNotice =
  | { type: 'missing-key'; service: CloudVoiceInputService }
  | { type: 'permission' }
  | { type: 'auth'; service: Exclude<VoiceInputService, 'browser'> }
  | { type: 'unsupported' }
  | { type: 'configuration' }
  | { type: 'connection'; service?: 'local' };

/** Wait before listening again so the tail of the reply is not picked up. */
export const VOICE_INPUT_RESTART_DELAY_MS = 800;

/** Continuous mode reconnects this many times after a dropped connection. */
export const VOICE_INPUT_RETRY_LIMIT = 2;

const FATAL_ERROR_CODES = new Set([
  'unsupported-provider',
  'insecure-context',
  'permission-denied',
  'authentication-failed',
  'client-secret-failed',
  'ephemeral-token-failed',
  'invalid-configuration',
  'session-disposed',
]);

export const isVoiceInputMode = (value: unknown): value is VoiceInputMode =>
  value === 'once' || value === 'continuous';

export const isVoiceInputService = (
  value: unknown,
): value is VoiceInputService =>
  value === 'browser' ||
  value === 'openai' ||
  value === 'gemini' ||
  value === 'local';

export const isCloudVoiceInputService = (
  service: VoiceInputService,
): service is CloudVoiceInputService =>
  service === 'openai' || service === 'gemini';

export const voiceInputServiceLabel = (service: VoiceInputService): string =>
  service === 'openai'
    ? 'OpenAI'
    : service === 'gemini'
      ? 'Gemini'
      : service === 'local'
        ? 'ローカルサーバー（OpenAI 互換）'
        : 'ブラウザ';

/**
 * Creates a transcription session for the selected service. Cloud services
 * use the end user's own API key directly from the browser.
 */
export const createVoiceInputSession = (
  service: VoiceInputService,
  getApiKey: () => Promise<string>,
  local: LocalVoiceInputSettings = DEFAULT_LOCAL_VOICE_INPUT,
): RealtimeTranscriptionSession => {
  if (service === 'local') {
    return createRealtimeTranscriptionSession({
      provider: 'openai-compatible',
      baseUrl: local.baseUrl.trim(),
      model: local.model.trim() || undefined,
      language: 'ja-JP',
      ...(local.apiKey.trim()
        ? {
            auth: {
              type: 'browser-api-key' as const,
              getApiKey: async () => local.apiKey.trim(),
              acknowledgeBrowserKeyRisk: true as const,
            },
          }
        : {}),
    });
  }
  if (service === 'openai') {
    return createRealtimeTranscriptionSession({
      provider: 'openai-realtime',
      auth: {
        type: 'browser-api-key',
        getApiKey,
        acknowledgeBrowserKeyRisk: true,
      },
      languages: ['ja'],
      delay: 'low',
    });
  }
  if (service === 'gemini') {
    return createRealtimeTranscriptionSession({
      provider: 'gemini-live',
      auth: {
        type: 'browser-api-key',
        getApiKey,
        acknowledgeBrowserKeyRisk: true,
      },
      languages: ['ja-JP'],
      mode: 'verbatim',
    });
  }
  return createRealtimeTranscriptionSession({
    provider: 'web-speech',
    language: 'ja-JP',
    // Stop after one utterance so the reply can be generated and spoken.
    continuous: false,
  });
};

/**
 * Only a continuous session that is still waiting for speech retries.
 * Permission, key, and browser support errors stop listening instead.
 */
export const shouldRetryVoiceInput = (input: {
  code: string;
  mode: VoiceInputMode;
  sessionActive: boolean;
  awaitingReply: boolean;
  retryCount: number;
}): boolean =>
  !FATAL_ERROR_CODES.has(input.code) &&
  input.mode === 'continuous' &&
  input.sessionActive &&
  !input.awaitingReply &&
  input.retryCount < VOICE_INPUT_RETRY_LIMIT;

export const voiceInputNoticeForError = (
  code: string,
  service: VoiceInputService,
): VoiceInputNotice => {
  if (code === 'permission-denied') return { type: 'permission' };
  if (code === 'unsupported-provider' || code === 'insecure-context') {
    return { type: 'unsupported' };
  }
  if (service === 'local') {
    if (code === 'invalid-configuration') return { type: 'configuration' };
    if (code === 'authentication-failed') return { type: 'auth', service };
    return { type: 'connection', service };
  }
  if (
    isCloudVoiceInputService(service) &&
    (code === 'authentication-failed' ||
      code === 'client-secret-failed' ||
      code === 'ephemeral-token-failed' ||
      code === 'invalid-configuration')
  ) {
    return { type: 'auth', service };
  }
  return { type: 'connection' };
};

export const voiceInputNoticeText = (notice: VoiceInputNotice): string => {
  switch (notice.type) {
    case 'missing-key':
      return `${voiceInputServiceLabel(notice.service)} の API キーがありません。音声入力の設定から入力してください。`;
    case 'permission':
      return 'マイクが許可されていないため、聞き取りを止めました。';
    case 'auth':
      if (notice.service === 'local') {
        return 'ローカルサーバーに接続できませんでした。API キーと、サーバーの CORS 設定でこのページの Origin が許可されているか確認してください。';
      }
      return `${voiceInputServiceLabel(notice.service)} に接続できませんでした。API キーを確認してください。`;
    case 'unsupported':
      return 'このブラウザでは選んだ音声入力を使えません。';
    case 'connection':
      if (notice.service === 'local') {
        return 'ローカルサーバーへの接続に失敗しました。サーバーの起動状態、URL、CORS 設定を確認してください。';
      }
      return '聞き取りの接続が切れたため、止めました。';
    case 'configuration':
      return '音声入力の設定で有効なサーバー URL（http:// または https://）を入力してください。認証情報・クエリ・フラグメントは含められません。';
  }
};
