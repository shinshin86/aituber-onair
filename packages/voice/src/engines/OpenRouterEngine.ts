import { OPENROUTER_TTS_API_URL } from '../constants/voiceEngine';
import type { Talk } from '../types/voice';
import { createPcm16Wav } from '../utils/wavHeader';
import {
  isOpenRouterVoice,
  requireOpenRouterModel,
  resolveOpenRouterUrl,
  type OpenRouterTtsModel,
} from './internal/openRouter';
import {
  createConfigurationError,
  fetchWithTimeout,
  throwApiError,
} from './internal/utils';
import type { VoiceEngine } from './VoiceEngine';
import { VoiceEngineError } from './VoiceEngineError';

export type { OpenRouterTtsModel } from './internal/openRouter';

/** One-shot PCM speech wrapped as WAV for the existing audio players. Both MAI models are public-preview, explicit opt-ins. */
export class OpenRouterEngine implements VoiceEngine {
  private apiEndpoint = OPENROUTER_TTS_API_URL;
  private model?: OpenRouterTtsModel;

  setApiEndpoint(apiUrl: string): void {
    this.apiEndpoint = apiUrl.trim() || OPENROUTER_TTS_API_URL;
  }

  setModel(model?: OpenRouterTtsModel): void {
    // Never fall back to a preview model, including after an option reset.
    this.model = model;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey?.trim()) {
      throw createConfigurationError('OpenRouter API key is required');
    }
    const model = requireOpenRouterModel(this.model);
    const voice = speaker.trim();
    if (!isOpenRouterVoice(voice, model)) {
      throw createConfigurationError(
        'OpenRouter speaker must be a full voice ID for the selected model; select a voice from its supported_voices list',
      );
    }
    const text = input.message.trim();
    if (!text) {
      throw createConfigurationError('Input text is empty');
    }

    const url = resolveOpenRouterUrl(this.apiEndpoint);
    const response = await fetchWithTimeout(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format: 'pcm',
      }),
    });

    if (!response.ok) {
      return throwApiError('OpenRouter', response);
    }
    const contentType = response.headers
      .get('content-type')
      ?.split(';')[0]
      .trim()
      .toLowerCase();
    if (contentType !== 'audio/pcm') {
      throw new VoiceEngineError('OpenRouter returned a non-PCM response', {
        kind: 'api',
        statusCode: response.status,
      });
    }
    const audio = await response.arrayBuffer();
    if (audio.byteLength === 0) {
      throw new VoiceEngineError('OpenRouter returned empty audio', {
        kind: 'api',
        statusCode: response.status,
      });
    }
    if (audio.byteLength % 2 !== 0) {
      throw new VoiceEngineError('OpenRouter returned incomplete PCM samples', {
        kind: 'api',
        statusCode: response.status,
      });
    }
    return createPcm16Wav(new Uint8Array(audio), 24000, 1);
  }

  getTestMessage(testVoiceText?: string): string {
    return testVoiceText || 'Hello! This is MAI Voice on OpenRouter.';
  }
}
