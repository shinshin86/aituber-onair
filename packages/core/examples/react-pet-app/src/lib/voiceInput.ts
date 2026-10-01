import {
  type RealtimeTranscriptionSession,
  createRealtimeTranscriptionSession,
} from '@aituber-onair/transcription';

export const VOICE_INPUT_MODES = ['once', 'continuous'] as const;
export type VoiceInputMode = (typeof VOICE_INPUT_MODES)[number];

export const VOICE_INPUT_SERVICES = ['browser', 'openai', 'gemini'] as const;
export type VoiceInputService = (typeof VOICE_INPUT_SERVICES)[number];
export type CloudVoiceInputService = Exclude<VoiceInputService, 'browser'>;

/**
 * `connecting` covers the time between pressing the mic and the service
 * accepting audio. Cloud services need a network handshake first, so speech
 * during this phase is not transcribed.
 */
export type VoiceInputPhase = 'idle' | 'connecting' | 'listening';

export type VoiceInputNotice =
  | { type: 'missing-key'; service: CloudVoiceInputService }
  | { type: 'permission' }
  | { type: 'auth'; service: CloudVoiceInputService }
  | { type: 'unsupported' }
  | { type: 'connection' };

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
  value === 'browser' || value === 'openai' || value === 'gemini';

export const isCloudVoiceInputService = (
  service: VoiceInputService,
): service is CloudVoiceInputService => service !== 'browser';

export const voiceInputServiceLabel = (service: VoiceInputService): string =>
  service === 'openai'
    ? 'OpenAI'
    : service === 'gemini'
      ? 'Gemini'
      : 'ブラウザ';

/**
 * Creates a transcription session for the selected service. Cloud services
 * use the end user's own API key directly from the browser.
 */
export const createVoiceInputSession = (
  service: VoiceInputService,
  getApiKey: () => Promise<string>,
): RealtimeTranscriptionSession => {
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
      return `${voiceInputServiceLabel(notice.service)} に接続できませんでした。API キーを確認してください。`;
    case 'unsupported':
      return 'このブラウザでは選んだ音声入力を使えません。';
    case 'connection':
      return '聞き取りの接続が切れたため、止めました。';
  }
};
