import { DEEPGRAM_TTS_API_URL } from '../constants/voiceEngine';
import type { Talk } from '../types/voice';
import {
  clampNumber,
  createConfigurationError,
  fetchWithTimeout,
  throwApiError,
} from './internal/utils';
import type { VoiceEngine } from './VoiceEngine';
import { VoiceEngineError } from './VoiceEngineError';

/** One-shot Flux TTS on /v2/speak. The speaker is a full English Flux model ID. */
export class DeepgramEngine implements VoiceEngine {
  private apiEndpoint = DEEPGRAM_TTS_API_URL;
  private speed?: number;

  setApiEndpoint(apiUrl: string): void {
    this.apiEndpoint = apiUrl.trim() || DEEPGRAM_TTS_API_URL;
  }

  /** Clamp and round to the documented 0.5–1.5 range in 0.05 increments. */
  setSpeed(speed?: number): void {
    const clamped = clampNumber(speed, 0.5, 1.5);
    this.speed =
      clamped === undefined ? undefined : Math.round(clamped * 20) / 20;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey?.trim()) {
      throw createConfigurationError('Deepgram API key is required');
    }

    const model = speaker.trim();
    if (!/^flux-[a-z0-9-]+-en$/.test(model)) {
      throw createConfigurationError(
        'Deepgram speaker must be an English Flux model ID (flux-{voice}-en)',
      );
    }

    const text = input.message.trim();
    if (!text) {
      throw createConfigurationError('Input text is empty');
    }

    const browserBaseUrl =
      typeof globalThis.location?.href === 'string'
        ? globalThis.location.href
        : undefined;
    let url: URL;
    try {
      url = new URL(this.apiEndpoint, browserBaseUrl);
    } catch {
      throw createConfigurationError(
        'Deepgram API URL must be a valid absolute URL outside the browser, or a same-origin browser URL',
      );
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw createConfigurationError('Deepgram API URL must use HTTP or HTTPS');
    }
    if (url.searchParams.has('callback')) {
      throw createConfigurationError(
        'Deepgram callback requests cannot be used for audio playback',
      );
    }
    url.searchParams.set('model', model);
    url.searchParams.set('encoding', 'mp3');
    if (this.speed !== undefined) {
      url.searchParams.set('speed', String(this.speed));
    }

    const response = await fetchWithTimeout(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return throwApiError('Deepgram', response);
    }
    if (response.headers.get('content-type')?.includes('application/json')) {
      throw new VoiceEngineError('Deepgram returned JSON instead of audio', {
        kind: 'api',
        statusCode: response.status,
      });
    }

    const audio = await response.arrayBuffer();
    if (audio.byteLength === 0) {
      throw new VoiceEngineError('Deepgram returned empty audio', {
        kind: 'api',
        statusCode: response.status,
      });
    }
    return audio;
  }

  getTestMessage(testVoiceText?: string): string {
    return testVoiceText || 'Hello! This is Deepgram Flux text to speech.';
  }
}
