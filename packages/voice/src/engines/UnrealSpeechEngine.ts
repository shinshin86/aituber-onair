import { UNREAL_SPEECH_TTS_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { fetchWithTimeout } from './internal/utils';
import { VoiceEngine } from './VoiceEngine';

export type UnrealSpeechCodec = 'libmp3lame' | 'pcm_mulaw' | 'pcm_s16le';

/**
 * Unreal Speech voice synthesis engine.
 */
export class UnrealSpeechEngine implements VoiceEngine {
  private apiEndpoint: string = UNREAL_SPEECH_TTS_API_URL;
  private bitrate: string = '192k';
  private speed: number = 0;
  private pitch: number = 1;
  private codec: UnrealSpeechCodec = 'libmp3lame';
  private temperature?: number;

  /**
   * Set Unreal Speech /stream API endpoint URL.
   */
  setApiEndpoint(apiUrl: string): void {
    const trimmed = apiUrl.trim();
    this.apiEndpoint = trimmed || UNREAL_SPEECH_TTS_API_URL;
  }

  /**
   * Set audio bitrate such as 192k or 320k.
   */
  setBitrate(bitrate?: string): void {
    const trimmed = bitrate?.trim();
    this.bitrate = trimmed || '192k';
  }

  /**
   * Set speaking speed (-1.0 - 1.0).
   */
  setSpeed(speed?: number): void {
    if (speed === undefined || !Number.isFinite(speed)) {
      this.speed = 0;
      return;
    }

    this.speed = Math.max(-1, Math.min(1, speed));
  }

  /**
   * Set pitch (0.5 - 1.5).
   */
  setPitch(pitch?: number): void {
    if (pitch === undefined || !Number.isFinite(pitch)) {
      this.pitch = 1;
      return;
    }

    this.pitch = Math.max(0.5, Math.min(1.5, pitch));
  }

  /**
   * Set output codec.
   */
  setCodec(codec?: UnrealSpeechCodec): void {
    this.codec = this.isSupportedCodec(codec) ? codec : 'libmp3lame';
  }

  /**
   * Set generation temperature (0.1 - 0.8).
   */
  setTemperature(temperature?: number): void {
    if (temperature === undefined) {
      this.temperature = undefined;
      return;
    }

    if (!Number.isFinite(temperature)) {
      this.temperature = undefined;
      return;
    }

    this.temperature = Math.max(0.1, Math.min(0.8, temperature));
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('Unreal Speech API key is required');
    }

    if (!speaker) {
      throw new Error('Unreal Speech voice ID is required');
    }

    const text = input.message.trim();

    if (!text) {
      throw new Error('Input text is empty');
    }

    const body: Record<string, string | number> = {
      Text: text,
      VoiceId: speaker,
      Bitrate: this.bitrate,
      Speed: String(this.speed),
      Pitch: String(this.pitch),
      Codec: this.codec,
    };

    if (this.temperature !== undefined) {
      body.Temperature = this.temperature;
    }

    const response = await fetchWithTimeout(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(
        'Failed to fetch TTS from Unreal Speech:',
        response.status,
        errorText,
      );
      throw new Error('Failed to fetch TTS from Unreal Speech.');
    }

    const blob = await response.blob();
    return await blob.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'Unreal Speechを使用します';
  }

  private isSupportedCodec(codec?: string): codec is UnrealSpeechCodec {
    return (
      codec === 'libmp3lame' || codec === 'pcm_mulaw' || codec === 'pcm_s16le'
    );
  }
}
