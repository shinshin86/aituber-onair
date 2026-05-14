import { INWORLD_TTS_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

export type InworldAudioEncoding =
  | 'MP3'
  | 'OGG_OPUS'
  | 'FLAC'
  | 'LINEAR16'
  | 'WAV'
  | 'PCM'
  | 'ALAW'
  | 'MULAW';

export type InworldDeliveryMode = 'STABLE' | 'BALANCED' | 'CREATIVE';

interface InworldSynthesizeSpeechResponse {
  audioContent?: string;
}

/**
 * Inworld text-to-speech engine.
 */
export class InworldEngine implements VoiceEngine {
  private apiEndpoint: string = INWORLD_TTS_API_URL;
  private model: string = 'inworld-tts-2';
  private audioEncoding: InworldAudioEncoding = 'MP3';
  private sampleRateHertz: number = 48000;
  private bitRate?: number;
  private speakingRate?: number;
  private language?: string;
  private deliveryMode?: InworldDeliveryMode;
  private temperature?: number;

  /**
   * Set Inworld TTS API endpoint URL.
   */
  setApiEndpoint(apiUrl: string): void {
    const trimmed = apiUrl.trim();
    this.apiEndpoint = trimmed || INWORLD_TTS_API_URL;
  }

  /**
   * Set Inworld TTS model ID.
   */
  setModel(model?: string): void {
    const trimmed = model?.trim();
    this.model = trimmed || 'inworld-tts-2';
  }

  /**
   * Set output audio encoding.
   */
  setAudioEncoding(encoding?: InworldAudioEncoding): void {
    this.audioEncoding = this.isSupportedAudioEncoding(encoding)
      ? encoding
      : 'MP3';
  }

  /**
   * Set output sample rate in hertz.
   */
  setSampleRateHertz(sampleRateHertz?: number): void {
    if (sampleRateHertz === undefined || !Number.isFinite(sampleRateHertz)) {
      this.sampleRateHertz = 48000;
      return;
    }

    this.sampleRateHertz = Math.trunc(sampleRateHertz);
  }

  /**
   * Set output bitrate in bps.
   */
  setBitRate(bitRate?: number): void {
    if (bitRate === undefined || !Number.isFinite(bitRate)) {
      this.bitRate = undefined;
      return;
    }

    this.bitRate = Math.trunc(bitRate);
  }

  /**
   * Set speaking rate.
   */
  setSpeakingRate(speakingRate?: number): void {
    if (speakingRate === undefined || !Number.isFinite(speakingRate)) {
      this.speakingRate = undefined;
      return;
    }

    this.speakingRate = speakingRate;
  }

  /**
   * Set optional BCP-47 language tag.
   */
  setLanguage(language?: string): void {
    const trimmed = language?.trim();
    this.language = trimmed || undefined;
  }

  /**
   * Set delivery mode for inworld-tts-2.
   */
  setDeliveryMode(deliveryMode?: InworldDeliveryMode): void {
    this.deliveryMode = this.isSupportedDeliveryMode(deliveryMode)
      ? deliveryMode
      : undefined;
  }

  /**
   * Set generation temperature for non TTS-2 models.
   */
  setTemperature(temperature?: number): void {
    if (temperature === undefined || !Number.isFinite(temperature)) {
      this.temperature = undefined;
      return;
    }

    this.temperature = temperature;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('Inworld API key is required');
    }

    if (!speaker) {
      throw new Error('Inworld voice ID is required');
    }

    const text = input.message.trim();

    if (!text) {
      throw new Error('Input text is empty');
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.createRequestBody(text, speaker)),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch TTS from Inworld: ${response.status}${errorText ? ` ${errorText}` : ''}`,
      );
    }

    const data = (await response.json()) as InworldSynthesizeSpeechResponse;
    if (!data.audioContent) {
      throw new Error('Failed to fetch TTS from Inworld: missing audioContent');
    }

    return this.base64ToArrayBuffer(data.audioContent);
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'Inworldを使用します';
  }

  private createRequestBody(
    text: string,
    speaker: string,
  ): Record<string, unknown> {
    const audioConfig: Record<string, number | string> = {
      audioEncoding: this.audioEncoding,
      sampleRateHertz: this.sampleRateHertz,
    };

    if (this.bitRate !== undefined) {
      audioConfig.bitRate = this.bitRate;
    }

    const body: Record<string, unknown> = {
      text,
      voiceId: speaker,
      modelId: this.model,
      audioConfig,
    };

    if (this.speakingRate !== undefined) {
      body.speakingRate = this.speakingRate;
    }
    if (this.language !== undefined) {
      body.language = this.language;
    }
    if (this.deliveryMode !== undefined) {
      body.deliveryMode = this.deliveryMode;
    }
    if (this.temperature !== undefined) {
      body.temperature = this.temperature;
    }

    return body;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary =
      typeof atob === 'function'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
  }

  private isSupportedAudioEncoding(
    encoding?: string,
  ): encoding is InworldAudioEncoding {
    return (
      encoding === 'MP3' ||
      encoding === 'OGG_OPUS' ||
      encoding === 'FLAC' ||
      encoding === 'LINEAR16' ||
      encoding === 'WAV' ||
      encoding === 'PCM' ||
      encoding === 'ALAW' ||
      encoding === 'MULAW'
    );
  }

  private isSupportedDeliveryMode(
    deliveryMode?: string,
  ): deliveryMode is InworldDeliveryMode {
    return (
      deliveryMode === 'STABLE' ||
      deliveryMode === 'BALANCED' ||
      deliveryMode === 'CREATIVE'
    );
  }
}
