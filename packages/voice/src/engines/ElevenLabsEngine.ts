import { ELEVENLABS_TTS_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { clampNumber } from './internal/utils';
import { VoiceEngine } from './VoiceEngine';

export type ElevenLabsApplyTextNormalization = 'auto' | 'on' | 'off';

export interface ElevenLabsVoiceSettingsOptions {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
}

/**
 * ElevenLabs text-to-speech engine.
 */
export class ElevenLabsEngine implements VoiceEngine {
  private apiEndpoint: string = ELEVENLABS_TTS_API_URL;
  private model: string = 'eleven_multilingual_v2';
  private outputFormat: string = 'mp3_44100_128';
  private languageCode?: string;
  private voiceSettings: ElevenLabsVoiceSettingsOptions = {};
  private seed?: number;
  private previousText?: string;
  private nextText?: string;
  private applyTextNormalization?: ElevenLabsApplyTextNormalization;
  private applyLanguageTextNormalization?: boolean;
  private enableLogging?: boolean;

  /**
   * Set ElevenLabs text-to-speech API base endpoint.
   */
  setApiEndpoint(apiUrl: string): void {
    const trimmed = apiUrl.trim();
    this.apiEndpoint = trimmed || ELEVENLABS_TTS_API_URL;
  }

  /**
   * Set ElevenLabs model ID.
   */
  setModel(model: string): void {
    const trimmed = model.trim();
    this.model = trimmed || 'eleven_multilingual_v2';
  }

  /**
   * Set output format, such as mp3_44100_128.
   */
  setOutputFormat(outputFormat?: string): void {
    const trimmed = outputFormat?.trim();
    this.outputFormat = trimmed || 'mp3_44100_128';
  }

  /**
   * Set optional language code.
   */
  setLanguageCode(languageCode?: string): void {
    const trimmed = languageCode?.trim();
    this.languageCode = trimmed || undefined;
  }

  /**
   * Set voice settings.
   */
  setVoiceSettings(settings: ElevenLabsVoiceSettingsOptions): void {
    this.voiceSettings = this.normalizeVoiceSettings(settings);
  }

  setStability(value?: number): void {
    this.updateVoiceSetting('stability', this.clampZeroToOne(value));
  }

  setSimilarityBoost(value?: number): void {
    this.updateVoiceSetting('similarityBoost', this.clampZeroToOne(value));
  }

  setStyle(value?: number): void {
    this.updateVoiceSetting('style', this.clampZeroToOne(value));
  }

  setUseSpeakerBoost(value?: boolean): void {
    this.updateVoiceSetting('useSpeakerBoost', value);
  }

  setSpeed(value?: number): void {
    this.updateVoiceSetting('speed', clampNumber(value, 0.7, 1.2));
  }

  setSeed(value?: number): void {
    if (value === undefined || !Number.isFinite(value)) {
      this.seed = undefined;
      return;
    }

    this.seed = Math.max(0, Math.min(4294967295, Math.trunc(value)));
  }

  setPreviousText(value?: string): void {
    const trimmed = value?.trim();
    this.previousText = trimmed || undefined;
  }

  setNextText(value?: string): void {
    const trimmed = value?.trim();
    this.nextText = trimmed || undefined;
  }

  setApplyTextNormalization(value?: ElevenLabsApplyTextNormalization): void {
    this.applyTextNormalization = this.isApplyTextNormalization(value)
      ? value
      : undefined;
  }

  setApplyLanguageTextNormalization(value?: boolean): void {
    this.applyLanguageTextNormalization = value;
  }

  setEnableLogging(value?: boolean): void {
    this.enableLogging = value;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    if (!speaker) {
      throw new Error('ElevenLabs voice ID is required');
    }

    const text = input.message.trim();

    if (!text) {
      throw new Error('Input text is empty');
    }

    const body: Record<string, unknown> = {
      text,
      model_id: this.model,
    };

    if (this.languageCode !== undefined) {
      body.language_code = this.languageCode;
    }

    const voiceSettings = this.createApiVoiceSettings();
    if (Object.keys(voiceSettings).length > 0) {
      body.voice_settings = voiceSettings;
    }

    if (this.seed !== undefined) {
      body.seed = this.seed;
    }
    if (this.previousText !== undefined) {
      body.previous_text = this.previousText;
    }
    if (this.nextText !== undefined) {
      body.next_text = this.nextText;
    }
    if (this.applyTextNormalization !== undefined) {
      body.apply_text_normalization = this.applyTextNormalization;
    }
    if (this.applyLanguageTextNormalization !== undefined) {
      body.apply_language_text_normalization =
        this.applyLanguageTextNormalization;
    }

    const response = await fetch(this.createRequestUrl(speaker), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(
        'Failed to fetch TTS from ElevenLabs:',
        response.status,
        errorText,
      );
      throw new Error('Failed to fetch TTS from ElevenLabs.');
    }

    const blob = await response.blob();
    return await blob.arrayBuffer();
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'ElevenLabsを使用します';
  }

  private createRequestUrl(voiceId: string): string {
    const baseEndpoint = this.apiEndpoint.replace(/\/+$/, '');
    const url = new URL(`${baseEndpoint}/${encodeURIComponent(voiceId)}`);

    if (this.outputFormat) {
      url.searchParams.set('output_format', this.outputFormat);
    }
    if (this.enableLogging !== undefined) {
      url.searchParams.set('enable_logging', String(this.enableLogging));
    }

    return url.toString();
  }

  private createApiVoiceSettings(): Record<string, number | boolean> {
    const settings: Record<string, number | boolean> = {};

    if (this.voiceSettings.stability !== undefined) {
      settings.stability = this.voiceSettings.stability;
    }
    if (this.voiceSettings.similarityBoost !== undefined) {
      settings.similarity_boost = this.voiceSettings.similarityBoost;
    }
    if (this.voiceSettings.style !== undefined) {
      settings.style = this.voiceSettings.style;
    }
    if (this.voiceSettings.useSpeakerBoost !== undefined) {
      settings.use_speaker_boost = this.voiceSettings.useSpeakerBoost;
    }
    if (this.voiceSettings.speed !== undefined) {
      settings.speed = this.voiceSettings.speed;
    }

    return settings;
  }

  private normalizeVoiceSettings(
    settings: ElevenLabsVoiceSettingsOptions,
  ): ElevenLabsVoiceSettingsOptions {
    return {
      stability: this.clampZeroToOne(settings.stability),
      similarityBoost: this.clampZeroToOne(settings.similarityBoost),
      style: this.clampZeroToOne(settings.style),
      useSpeakerBoost: settings.useSpeakerBoost,
      speed: clampNumber(settings.speed, 0.7, 1.2),
    };
  }

  private updateVoiceSetting<TKey extends keyof ElevenLabsVoiceSettingsOptions>(
    key: TKey,
    value: ElevenLabsVoiceSettingsOptions[TKey],
  ): void {
    if (value === undefined) {
      const nextSettings = { ...this.voiceSettings };
      delete nextSettings[key];
      this.voiceSettings = nextSettings;
      return;
    }

    this.voiceSettings = {
      ...this.voiceSettings,
      [key]: value,
    };
  }

  private clampZeroToOne(value?: number): number | undefined {
    return clampNumber(value, 0, 1);
  }

  private isApplyTextNormalization(
    value?: string,
  ): value is ElevenLabsApplyTextNormalization {
    return value === 'auto' || value === 'on' || value === 'off';
  }
}
