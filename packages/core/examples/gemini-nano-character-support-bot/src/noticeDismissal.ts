import type { GeminiNanoStatus } from './hooks/useGeminiNanoStatus';

export type VoiceNoticeKind =
  | 'webSpeechReady'
  | 'checkingAssets'
  | 'assetsReady'
  | 'initializing'
  | 'ready'
  | 'missing'
  | 'error'
  | 'runtimeError';

export const isModelNoticeDismissible = (status: GeminiNanoStatus): boolean =>
  status === 'available';

export const isVoiceNoticeDismissible = (kind: VoiceNoticeKind): boolean =>
  kind === 'assetsReady' || kind === 'ready' || kind === 'webSpeechReady';
