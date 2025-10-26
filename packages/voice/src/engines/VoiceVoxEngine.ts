import { VOICE_VOX_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * VOICEVOX audio query parameter overrides
 * Reference: https://voicevox.github.io/voicevox_engine/api/#tag/音声合成/operation/synthesis
 */
export interface VoiceVoxQueryParameterOverrides {
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  volumeScale?: number;
  prePhonemeLength?: number;
  postPhonemeLength?: number;
  pauseLength?: number | null;
  pauseLengthScale?: number;
  outputSamplingRate?: number;
  outputStereo?: boolean;
}

/**
 * VoiceVox voice synthesis engine
 */
export class VoiceVoxEngine implements VoiceEngine {
  private apiEndpoint: string = VOICE_VOX_API_URL;
  private queryOverrides: Partial<VoiceVoxQueryParameterOverrides> = {};
  private enableKatakanaEnglish?: boolean;
  private enableInterrogativeUpspeak?: boolean;
  private coreVersion?: string;

  async fetchAudio(input: Talk, speaker: string): Promise<ArrayBuffer> {
    const talk = input as Talk;
    // get emotion from talk.style
    const emotion = talk.style || 'neutral';

    const ttsQueryUrl = this.buildUrl('/audio_query', {
      speaker: String(speaker),
      text: talk.message,
      enable_katakana_english:
        this.enableKatakanaEnglish === undefined
          ? undefined
          : String(this.enableKatakanaEnglish),
      core_version: this.coreVersion,
    });

    const ttsQueryResponse = await fetch(ttsQueryUrl, { method: 'POST' });

    if (!ttsQueryResponse.ok) {
      throw new Error('Failed to fetch TTS query.');
    }

    const ttsQueryJson = await ttsQueryResponse.json();
    // adjust parameters according to emotion
    this.adjustEmotionParameters(ttsQueryJson, emotion);
    this.applyQueryOverrides(ttsQueryJson);

    const synthesisUrl = this.buildUrl('/synthesis', {
      speaker: String(speaker),
      enable_interrogative_upspeak:
        this.enableInterrogativeUpspeak === undefined
          ? undefined
          : String(this.enableInterrogativeUpspeak),
      core_version: this.coreVersion,
    });

    const synthesisResponse = await fetch(synthesisUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ttsQueryJson),
    });

    if (!synthesisResponse.ok) {
      throw new Error('Failed to fetch TTS synthesis result.');
    }

    const blob = await synthesisResponse.blob();
    return await blob.arrayBuffer();
  }

  /**
   * Adjust parameters according to emotion
   */
  private adjustEmotionParameters(ttsQueryJson: any, emotion: string): void {
    // default values
    ttsQueryJson.speedScale = 1.16;
    ttsQueryJson.pitchScale = -0.02;
    ttsQueryJson.intonationScale = 1.26;

    switch (emotion.toLowerCase()) {
      case 'happy':
        ttsQueryJson.speedScale = 1.25;
        ttsQueryJson.pitchScale = 0.05;
        ttsQueryJson.intonationScale = 1.4;
        break;
      case 'sad':
        ttsQueryJson.speedScale = 1.0;
        ttsQueryJson.pitchScale = -0.1;
        ttsQueryJson.intonationScale = 1.0;
        break;
      case 'angry':
        ttsQueryJson.speedScale = 1.2;
        ttsQueryJson.pitchScale = -0.05;
        ttsQueryJson.intonationScale = 1.5;
        break;
      case 'surprised':
        ttsQueryJson.speedScale = 1.3;
        ttsQueryJson.pitchScale = 0.1;
        ttsQueryJson.intonationScale = 1.4;
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
    overrides: Partial<VoiceVoxQueryParameterOverrides>,
  ): void {
    for (const [key, value] of Object.entries(overrides) as [
      keyof VoiceVoxQueryParameterOverrides,
      VoiceVoxQueryParameterOverrides[keyof VoiceVoxQueryParameterOverrides],
    ][]) {
      if (value === undefined) {
        delete this.queryOverrides[key];
      } else {
        (
          this.queryOverrides as Record<
            keyof VoiceVoxQueryParameterOverrides,
            VoiceVoxQueryParameterOverrides[keyof VoiceVoxQueryParameterOverrides]
          >
        )[key] =
          value as VoiceVoxQueryParameterOverrides[keyof VoiceVoxQueryParameterOverrides];
      }
    }
  }

  private hasOverride(key: keyof VoiceVoxQueryParameterOverrides): boolean {
    return Object.prototype.hasOwnProperty.call(this.queryOverrides, key);
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'ボイスボックスを使用します';
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
  setQueryParameters(overrides: VoiceVoxQueryParameterOverrides): void {
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

  setEnableKatakanaEnglish(enable?: boolean): void {
    this.enableKatakanaEnglish = enable;
  }

  setEnableInterrogativeUpspeak(enable?: boolean): void {
    this.enableInterrogativeUpspeak = enable;
  }

  setCoreVersion(coreVersion?: string): void {
    const trimmed = coreVersion?.trim();
    this.coreVersion = trimmed ? trimmed : undefined;
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
