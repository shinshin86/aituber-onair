import { CARTESIA_TTS_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { fetchWithTimeout, throwApiError } from './internal/utils';
import { VoiceEngine } from './VoiceEngine';

export type CartesiaOutputContainer = 'wav' | 'mp3';
export type CartesiaLanguage =
  | 'en'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'zh'
  | 'ja'
  | 'hi'
  | 'it'
  | 'ko'
  | 'nl'
  | 'pl'
  | 'ru'
  | 'sv'
  | 'tr'
  | 'tl'
  | 'bg'
  | 'ro'
  | 'ar'
  | 'cs'
  | 'el'
  | 'fi'
  | 'hr'
  | 'ms'
  | 'sk'
  | 'da'
  | 'ta'
  | 'uk'
  | 'hu'
  | 'no'
  | 'vi'
  | 'bn'
  | 'th'
  | 'he'
  | 'ka'
  | 'id'
  | 'te'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'mr'
  | 'pa';

/** Cartesia synchronous byte-response text-to-speech engine. */
export class CartesiaEngine implements VoiceEngine {
  private apiEndpoint = CARTESIA_TTS_API_URL;
  private model = 'sonic-3.5';
  private language: CartesiaLanguage = 'ja';
  private outputContainer: CartesiaOutputContainer = 'wav';
  private sampleRate = 44100;
  private mp3Bitrate = 128000;

  setApiEndpoint(apiUrl: string): void {
    this.apiEndpoint = apiUrl.trim() || CARTESIA_TTS_API_URL;
  }

  setModel(model?: string): void {
    this.model = model?.trim() || 'sonic-3.5';
  }

  setLanguage(language?: CartesiaLanguage): void {
    this.language = language ?? 'ja';
  }

  setOutputContainer(container?: CartesiaOutputContainer): void {
    this.outputContainer = container ?? 'wav';
  }

  setSampleRate(sampleRate?: number): void {
    this.sampleRate =
      sampleRate !== undefined && Number.isFinite(sampleRate)
        ? Math.trunc(sampleRate)
        : 44100;
  }

  setMp3Bitrate(bitrate?: number): void {
    this.mp3Bitrate =
      bitrate !== undefined && Number.isFinite(bitrate)
        ? Math.trunc(bitrate)
        : 128000;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey?.trim()) {
      throw new Error('Cartesia API key is required');
    }
    if (!speaker.trim()) {
      throw new Error('Cartesia voice ID is required');
    }

    const transcript = input.message.trim();
    if (!transcript) {
      throw new Error('Input text is empty');
    }

    const outputFormat: Record<string, string | number> = {
      container: this.outputContainer,
      sample_rate: this.sampleRate,
    };
    if (this.outputContainer === 'wav') {
      outputFormat.encoding = 'pcm_s16le';
    } else {
      outputFormat.bit_rate = this.mp3Bitrate;
    }

    const response = await fetchWithTimeout(this.apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Cartesia-Version': '2026-03-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: this.model,
        transcript,
        voice: { id: speaker.trim() },
        output_format: outputFormat,
        language: this.language,
      }),
    });

    if (!response.ok) {
      return throwApiError('Cartesia', response);
    }

    return response.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'Cartesiaを使用します';
  }
}
