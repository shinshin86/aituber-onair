import type { TranscriptionProviderName } from './types';

interface BrowserGlobal {
  isSecureContext?: boolean;
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
  navigator?: Navigator;
  RTCPeerConnection?: unknown;
  AudioContext?: unknown;
  webkitAudioContext?: unknown;
}

function browserGlobal(): BrowserGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return window as unknown as BrowserGlobal;
}

export function isTranscriptionProviderSupported(
  provider: TranscriptionProviderName
): boolean {
  const browser = browserGlobal();
  if (!browser) return false;

  if (provider === 'web-speech') {
    return Boolean(
      browser.SpeechRecognition ?? browser.webkitSpeechRecognition
    );
  }

  return Boolean(
    browser.isSecureContext !== false &&
      browser.RTCPeerConnection &&
      browser.navigator?.mediaDevices?.getUserMedia &&
      (browser.AudioContext ?? browser.webkitAudioContext)
  );
}
