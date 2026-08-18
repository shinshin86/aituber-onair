import type { TranscriptionProviderName } from './types';

interface TranscriptionNavigator extends Navigator {
  gpu?: unknown;
}

interface BrowserGlobal {
  isSecureContext?: boolean;
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
  navigator?: TranscriptionNavigator;
  RTCPeerConnection?: unknown;
  AudioContext?: unknown;
  webkitAudioContext?: unknown;
  AudioWorkletNode?: unknown;
  Worker?: unknown;
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

  if (provider === 'local-whisper') {
    return Boolean(
      browser.isSecureContext !== false &&
        browser.navigator?.mediaDevices?.getUserMedia &&
        (browser.AudioContext ?? browser.webkitAudioContext) &&
        browser.AudioWorkletNode &&
        browser.Worker &&
        browser.navigator?.gpu
    );
  }

  return Boolean(
    browser.isSecureContext !== false &&
      browser.RTCPeerConnection &&
      browser.navigator?.mediaDevices?.getUserMedia &&
      (browser.AudioContext ?? browser.webkitAudioContext)
  );
}
