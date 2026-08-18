import { FISH_AUDIO_TTS_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { clampNumber, fetchWithTimeout, throwApiError } from './internal/utils';
import { VoiceEngine } from './VoiceEngine';

export type FishAudioModel = 's2.1-pro' | 's2.1-pro-free' | 's2-pro' | 's1';
export type FishAudioFormat = 'mp3' | 'wav' | 'pcm' | 'opus';
export type FishAudioLatency = 'normal' | 'balanced' | 'low';

/** Fish Audio one-shot text-to-speech engine. */
export class FishAudioEngine implements VoiceEngine {
  private apiEndpoint = FISH_AUDIO_TTS_API_URL;
  private model: FishAudioModel = 's2-pro';
  private format: FishAudioFormat = 'mp3';
  private sampleRate?: number;
  private mp3Bitrate?: 64 | 128 | 192;
  private latency: FishAudioLatency = 'normal';
  private speed?: number;

  setApiEndpoint(apiUrl: string): void {
    this.apiEndpoint = apiUrl.trim() || FISH_AUDIO_TTS_API_URL;
  }

  setModel(model?: FishAudioModel): void {
    this.model = model ?? 's2-pro';
  }

  setFormat(format?: FishAudioFormat): void {
    this.format = format ?? 'mp3';
  }

  setSampleRate(sampleRate?: number): void {
    this.sampleRate =
      sampleRate !== undefined && Number.isFinite(sampleRate)
        ? Math.trunc(sampleRate)
        : undefined;
  }

  setMp3Bitrate(bitrate?: 64 | 128 | 192): void {
    this.mp3Bitrate = bitrate;
  }

  setLatency(latency?: FishAudioLatency): void {
    this.latency = latency ?? 'normal';
  }

  setSpeed(speed?: number): void {
    this.speed = clampNumber(speed, 0.5, 2);
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey?.trim()) {
      throw new Error('Fish Audio API key is required');
    }
    if (!speaker.trim()) {
      throw new Error('Fish Audio reference ID is required');
    }

    const text = input.message.trim();
    if (!text) {
      throw new Error('Input text is empty');
    }

    const body: Record<string, unknown> = {
      text,
      reference_id: speaker.trim(),
      format: this.format,
      latency: this.latency,
    };

    if (this.sampleRate !== undefined) {
      body.sample_rate = this.sampleRate;
    }
    if (this.format === 'mp3' && this.mp3Bitrate !== undefined) {
      body.mp3_bitrate = this.mp3Bitrate;
    }
    if (this.speed !== undefined) {
      body.prosody = { speed: this.speed };
    }

    const response = await fetchWithTimeout(this.apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        model: this.model,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return throwApiError('Fish Audio', response);
    }

    return response.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'Fish Audioを使用します';
  }
}
