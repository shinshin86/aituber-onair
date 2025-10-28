import { AIVIS_SPEECH_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * AivisSpeech audio query parameter overrides
 * Reference:
 * https://github.com/Aivis-Project/AivisSpeech-Engine?tab=readme-ov-file#voicevox-api-%E3%81%A8%E3%81%AE%E4%BA%92%E6%8F%9B%E6%80%A7%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6
 */
export interface AivisSpeechQueryParameterOverrides {
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  tempoDynamicsScale?: number;
  volumeScale?: number;
  prePhonemeLength?: number;
  postPhonemeLength?: number;
  pauseLength?: number | null;
  pauseLengthScale?: number;
  outputSamplingRate?: number;
  outputStereo?: boolean;
}

/**
 * AivisSpeech voice synthesis engine
 */
export class AivisSpeechEngine implements VoiceEngine {
  private apiEndpoint: string = AIVIS_SPEECH_API_URL;
  private queryOverrides: Partial<AivisSpeechQueryParameterOverrides> = {};

  async fetchAudio(input: Talk, speaker: string): Promise<ArrayBuffer> {
    const talk = input as Talk;
    // Get emotion from talk.style
    const emotion = talk.style || 'neutral';
    const text = talk.message.trim();

    const queryUrl = this.buildUrl('/audio_query', {
      speaker: String(speaker),
      text: text,
    });

    const ttsQueryResponse = await fetch(queryUrl, { method: 'POST' });

    if (!ttsQueryResponse.ok) {
      throw new Error('Failed to fetch TTS query from AivisSpeech Engine.');
    }

    const ttsQueryJson = await ttsQueryResponse.json();

    // adjust parameters according to emotion
    this.adjustEmotionParameters(ttsQueryJson, emotion);
    this.applyQueryOverrides(ttsQueryJson);

    const synthesisUrl = this.buildUrl('/synthesis', {
      speaker: String(speaker),
    });

    const synthesisResponse = await fetch(synthesisUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ttsQueryJson),
    });

    if (!synthesisResponse.ok) {
      throw new Error(
        'Failed to fetch TTS synthesis result from AivisSpeech Engine.',
      );
    }

    const blob = await synthesisResponse.blob();
    return await blob.arrayBuffer();
  }

  private adjustEmotionParameters(ttsQueryJson: any, emotion: string): void {
    // default values
    ttsQueryJson.speedScale = 1.0;
    ttsQueryJson.pitchScale = 0.0;
    ttsQueryJson.intonationScale = 1.0;
    ttsQueryJson.tempoDynamicsScale = 1.0;
    ttsQueryJson.volumeScale = 1.0;

    switch (emotion.toLowerCase()) {
      case 'happy':
        ttsQueryJson.speedScale = 1.1;
        ttsQueryJson.pitchScale = 0.05;
        ttsQueryJson.intonationScale = 1.2;
        ttsQueryJson.tempoDynamicsScale = 1.1;
        ttsQueryJson.volumeScale = 1.05;
        break;
      case 'sad':
        ttsQueryJson.speedScale = 0.9;
        ttsQueryJson.pitchScale = -0.03;
        ttsQueryJson.intonationScale = 0.8;
        ttsQueryJson.tempoDynamicsScale = 0.9;
        ttsQueryJson.volumeScale = 0.95;
        break;
      case 'angry':
        ttsQueryJson.speedScale = 1.0;
        ttsQueryJson.pitchScale = 0.0;
        ttsQueryJson.intonationScale = 1.4;
        ttsQueryJson.tempoDynamicsScale = 1.2;
        ttsQueryJson.volumeScale = 1.1;
        break;
      case 'surprised':
        ttsQueryJson.speedScale = 1.2;
        ttsQueryJson.pitchScale = 0.07;
        ttsQueryJson.intonationScale = 1.3;
        ttsQueryJson.tempoDynamicsScale = 1.0;
        ttsQueryJson.volumeScale = 1.05;
        break;
      // default: "neutral" etc. other than default values
    }
  }

  /**
   * Apply user-provided overrides to audio query payload
   */
  private applyQueryOverrides(ttsQueryJson: any): void {
    if (this.hasOverride('speedScale')) {
      ttsQueryJson.speedScale = this.queryOverrides.speedScale;
    }
    if (this.hasOverride('pitchScale')) {
      ttsQueryJson.pitchScale = this.queryOverrides.pitchScale;
    }
    if (this.hasOverride('intonationScale')) {
      ttsQueryJson.intonationScale = this.queryOverrides.intonationScale;
    }
    if (this.hasOverride('tempoDynamicsScale')) {
      ttsQueryJson.tempoDynamicsScale = this.queryOverrides.tempoDynamicsScale;
    }
    if (this.hasOverride('volumeScale')) {
      ttsQueryJson.volumeScale = this.queryOverrides.volumeScale;
    }
    if (this.hasOverride('prePhonemeLength')) {
      ttsQueryJson.prePhonemeLength = this.queryOverrides.prePhonemeLength;
    }
    if (this.hasOverride('postPhonemeLength')) {
      ttsQueryJson.postPhonemeLength = this.queryOverrides.postPhonemeLength;
    }
    if (this.hasOverride('pauseLength')) {
      ttsQueryJson.pauseLength = this.queryOverrides.pauseLength;
    }
    if (this.hasOverride('pauseLengthScale')) {
      ttsQueryJson.pauseLengthScale = this.queryOverrides.pauseLengthScale;
    }
    if (this.hasOverride('outputSamplingRate')) {
      ttsQueryJson.outputSamplingRate = this.queryOverrides.outputSamplingRate;
    }
    if (this.hasOverride('outputStereo')) {
      ttsQueryJson.outputStereo = this.queryOverrides.outputStereo;
    }
  }

  /**
   * Update override map while allowing undefined to reset values
   */
  private updateQueryOverrides(
    overrides: Partial<AivisSpeechQueryParameterOverrides>,
  ): void {
    for (const [key, value] of Object.entries(overrides) as [
      keyof AivisSpeechQueryParameterOverrides,
      AivisSpeechQueryParameterOverrides[keyof AivisSpeechQueryParameterOverrides],
    ][]) {
      if (value === undefined) {
        delete this.queryOverrides[key];
      } else {
        (
          this.queryOverrides as Record<
            keyof AivisSpeechQueryParameterOverrides,
            AivisSpeechQueryParameterOverrides[keyof AivisSpeechQueryParameterOverrides]
          >
        )[key] =
          value as AivisSpeechQueryParameterOverrides[keyof AivisSpeechQueryParameterOverrides];
      }
    }
  }

  private hasOverride(key: keyof AivisSpeechQueryParameterOverrides): boolean {
    return Object.prototype.hasOwnProperty.call(this.queryOverrides, key);
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'アイビススピーチを使用します';
  }

  /**
   * Set custom API endpoint URL
   * @param apiUrl custom API endpoint URL
   */
  setApiEndpoint(apiUrl: string): void {
    this.apiEndpoint = apiUrl;
  }

  /**
   * Set query parameter overrides in batch
   * @param overrides Audio query parameter overrides
   */
  setQueryParameters(overrides: AivisSpeechQueryParameterOverrides): void {
    this.queryOverrides = {};
    this.updateQueryOverrides(overrides);
  }

  setSpeedScale(speedScale?: number): void {
    this.updateQueryOverrides({ speedScale });
  }

  setPitchScale(pitchScale?: number): void {
    this.updateQueryOverrides({ pitchScale });
  }

  setIntonationScale(intonationScale?: number): void {
    this.updateQueryOverrides({ intonationScale });
  }

  setTempoDynamicsScale(tempoDynamicsScale?: number): void {
    this.updateQueryOverrides({ tempoDynamicsScale });
  }

  setVolumeScale(volumeScale?: number): void {
    this.updateQueryOverrides({ volumeScale });
  }

  setPrePhonemeLength(prePhonemeLength?: number): void {
    this.updateQueryOverrides({ prePhonemeLength });
  }

  setPostPhonemeLength(postPhonemeLength?: number): void {
    this.updateQueryOverrides({ postPhonemeLength });
  }

  setPauseLength(pauseLength?: number | null): void {
    this.updateQueryOverrides({ pauseLength });
  }

  setPauseLengthScale(pauseLengthScale?: number): void {
    this.updateQueryOverrides({ pauseLengthScale });
  }

  setOutputSamplingRate(outputSamplingRate?: number): void {
    this.updateQueryOverrides({ outputSamplingRate });
  }

  setOutputStereo(outputStereo?: boolean): void {
    this.updateQueryOverrides({ outputStereo });
  }

  /**
   * Build endpoint URL with optional query parameters
   */
  private buildUrl(
    path: string,
    params: Record<string, string | undefined>,
  ): string {
    const base = this.apiEndpoint.replace(/\/$/, '');
    const url = new URL(`${base}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }
}
