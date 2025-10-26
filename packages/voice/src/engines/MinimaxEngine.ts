import {
  MINIMAX_CHINA_API_URL,
  MINIMAX_CHINA_VOICE_LIST_URL,
  MINIMAX_GLOBAL_API_URL,
  MINIMAX_GLOBAL_VOICE_LIST_URL,
} from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * MiniMax endpoint types
 */
export type MinimaxEndpoint = 'global' | 'china';

/**
 * Available MiniMax TTS models
 */
export type MinimaxModel =
  | 'speech-2.5-hd-preview'
  | 'speech-2.5-turbo-preview'
  | 'speech-02-hd'
  | 'speech-02-turbo'
  | 'speech-01-hd'
  | 'speech-01-turbo';

/**
 * MiniMax voice speaker information
 */
export interface MinimaxVoiceSpeaker {
  voice_id: string;
  voice_name: string;
  gender: string;
  language: string;
  preview_audio?: string;
}

/**
 * MiniMax voice setting override options
 */
export interface MinimaxVoiceSettingsOptions {
  speed?: number;
  vol?: number;
  pitch?: number;
}

/**
 * MiniMax audio format options
 */
export type MinimaxAudioFormat = 'mp3' | 'wav' | 'aac' | 'pcm' | 'flac' | 'ogg';

/**
 * MiniMax audio setting override options
 */
export interface MinimaxAudioSettingsOptions {
  sampleRate?: number;
  bitrate?: number;
  format?: MinimaxAudioFormat;
  channel?: 1 | 2;
}

/**
 * MiniMax TTS voice synthesis engine
 */
export class MinimaxEngine implements VoiceEngine {
  private groupId?: string;
  private model: MinimaxModel = 'speech-2.5-hd-preview';
  private defaultVoiceId: string = 'male-qn-qingse';
  private language: string = 'Japanese';
  private endpoint: MinimaxEndpoint = 'global';
  private voiceOverrides: MinimaxVoiceSettingsOptions = {};
  private audioOverrides: MinimaxAudioSettingsOptions = {};

  /**
   * Set GroupId for MiniMax API
   *
   * GroupId is a unique identifier for the user group in MiniMax's system.
   * Unlike other TTS engines that only require an API key, MiniMax requires both
   * an API key and a GroupId for authentication and usage tracking.
   *
   * This GroupId is used by MiniMax for:
   * - User group management
   * - Usage statistics tracking
   * - Billing and quota management
   *
   * You must obtain this pre-generated value from your MiniMax account dashboard.
   *
   * @param groupId GroupId for MiniMax API (required for production synthesis)
   */
  setGroupId(groupId: string): void {
    this.groupId = groupId;
  }

  /**
   * Set endpoint region for MiniMax API
   * @param endpoint Endpoint region ('global' or 'china')
   */
  setEndpoint(endpoint: MinimaxEndpoint): void {
    this.endpoint = endpoint;
  }

  /**
   * Set model for MiniMax TTS
   * Available models:
   * - speech-2.5-hd-preview: Latest high-quality model (preview)
   * - speech-2.5-turbo-preview: Latest fast model (preview)
   * - speech-02-hd: High-quality model
   * - speech-02-turbo: Fast model
   * - speech-01-hd: Previous generation high-quality model
   * - speech-01-turbo: Previous generation fast model
   * @param model Model name
   */
  setModel(model: MinimaxModel): void {
    this.model = model;
  }

  /**
   * Set language boost
   * @param language Language to boost recognition
   */
  setLanguage(language: string): void {
    this.language = language;
  }

  /**
   * Set voice setting overrides (speed, volume, pitch)
   * @param settings Voice setting overrides
   */
  setVoiceSettings(settings: MinimaxVoiceSettingsOptions): void {
    this.updateVoiceOverrides(settings);
  }

  /**
   * Set speech speed multiplier
   * @param speed Speed multiplier
   */
  setSpeed(speed?: number): void {
    this.updateVoiceOverrides({ speed });
  }

  /**
   * Set output volume multiplier
   * @param vol Volume multiplier
   */
  setVolume(vol?: number): void {
    this.updateVoiceOverrides({ vol });
  }

  /**
   * Set pitch adjustment in semitones
   * @param pitch Pitch adjustment
   */
  setPitch(pitch?: number): void {
    this.updateVoiceOverrides({ pitch });
  }

  /**
   * Set audio encoding overrides (sample rate, bitrate, format, channel)
   * @param settings Audio setting overrides
   */
  setAudioSettings(settings: MinimaxAudioSettingsOptions): void {
    this.updateAudioOverrides(settings);
  }

  /**
   * Set audio sampling rate (Hz)
   * @param sampleRate Sampling rate
   */
  setSampleRate(sampleRate?: number): void {
    this.updateAudioOverrides({ sampleRate });
  }

  /**
   * Set audio bitrate (bps)
   * @param bitrate Bitrate
   */
  setBitrate(bitrate?: number): void {
    this.updateAudioOverrides({ bitrate });
  }

  /**
   * Set audio output format
   * @param format Audio format
   */
  setAudioFormat(format?: MinimaxAudioFormat): void {
    this.updateAudioOverrides({ format });
  }

  /**
   * Set audio channel count
   * @param channel Number of channels
   */
  setAudioChannel(channel?: 1 | 2): void {
    this.updateAudioOverrides({ channel });
  }

  /**
   * Alias for setLanguage to emphasize MiniMax terminology
   * @param language Language boost string
   */
  setLanguageBoost(language: string): void {
    this.setLanguage(language);
  }

  /**
   * Get current API endpoint URL based on selected endpoint
   * @returns API endpoint URL
   */
  private getTtsApiUrl(): string {
    return this.endpoint === 'china'
      ? MINIMAX_CHINA_API_URL
      : MINIMAX_GLOBAL_API_URL;
  }

  /**
   * Get current voice list API endpoint URL based on selected endpoint
   * @returns Voice list API endpoint URL
   */
  private getVoiceListApiUrl(): string {
    return this.endpoint === 'china'
      ? MINIMAX_CHINA_VOICE_LIST_URL
      : MINIMAX_GLOBAL_VOICE_LIST_URL;
  }

  /**
   * Get available voice speakers list
   * Requires only API key
   * @param apiKey MiniMax API key
   * @returns Promise<MinimaxVoiceSpeaker[]>
   */
  async getVoiceList(apiKey: string): Promise<MinimaxVoiceSpeaker[]> {
    if (!apiKey) {
      throw new Error('MiniMax API key is required');
    }

    const response = await fetch(this.getVoiceListApiUrl(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Failed to fetch voice list: ${response.status}`;
      try {
        const errorText = await response.text();
        console.error(
          'Failed to fetch voice list from MiniMax:',
          response.status,
          errorText,
        );
        errorMessage = `Failed to fetch voice list: ${response.status} - ${errorText}`;
      } catch (e) {
        console.error(
          'Failed to fetch voice list from MiniMax:',
          response.status,
          response.statusText,
        );
        errorMessage = `Failed to fetch voice list: ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    // Check base_resp for API errors
    if (result.base_resp && result.base_resp.status_code !== 0) {
      const errorMsg = result.base_resp.status_msg || 'Unknown error';
      throw new Error(
        `MiniMax API error: ${result.base_resp.status_code} - ${errorMsg}`,
      );
    }

    // Return voice speakers data
    return result.data?.speakers || [];
  }

  /**
   * Build MiniMax voice settings by merging emotion defaults with overrides
   * @param voiceId Target voice ID
   * @param defaults Default emotion-based values
   */
  private buildVoiceSetting(
    voiceId: string,
    defaults: { speed: number; vol: number; pitch: number },
  ): { voice_id: string; speed: number; vol: number; pitch: number } {
    return {
      voice_id: voiceId,
      speed:
        this.voiceOverrides.speed !== undefined
          ? this.voiceOverrides.speed
          : defaults.speed,
      vol:
        this.voiceOverrides.vol !== undefined
          ? this.voiceOverrides.vol
          : defaults.vol,
      pitch:
        this.voiceOverrides.pitch !== undefined
          ? this.voiceOverrides.pitch
          : defaults.pitch,
    };
  }

  /**
   * Build MiniMax audio settings from overrides
   */
  private buildAudioSetting(): {
    sample_rate: number;
    bitrate: number;
    format: string;
    channel: number;
  } {
    return {
      sample_rate: this.audioOverrides.sampleRate ?? 32000,
      bitrate: this.audioOverrides.bitrate ?? 128000,
      format: this.audioOverrides.format ?? 'mp3',
      channel: this.audioOverrides.channel ?? 1,
    };
  }

  /**
   * Test voice synthesis with minimal requirements
   * Requires API key and voice ID, but not GroupId
   * @param text Text to synthesize (shorter text recommended for testing)
   * @param voiceId Voice ID to test
   * @param apiKey MiniMax API key
   * @returns Promise<ArrayBuffer>
   */
  async testVoice(
    text: string,
    voiceId: string,
    apiKey: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('MiniMax API key is required');
    }

    if (!voiceId) {
      throw new Error('Voice ID is required');
    }

    // Limit test text length to avoid quota waste
    const testText = text.length > 100 ? text.substring(0, 100) + '...' : text;

    // Use a temporary GroupId for testing or make it optional
    const tempGroupId = this.groupId || '1';

    const requestBody = {
      model: this.model,
      text: testText,
      stream: false,
      voice_setting: this.buildVoiceSetting(voiceId, {
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
      }),
      audio_setting: this.buildAudioSetting(),
      language_boost: this.language,
    };

    const response = await fetch(
      `${this.getTtsApiUrl()}?GroupId=${tempGroupId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorText = await response.text();
        console.error(
          'Failed to test voice from MiniMax:',
          response.status,
          errorText,
        );
        errorMessage = `Failed to test voice: ${response.status} - ${errorText}`;
      } catch (e) {
        console.error(
          'Failed to test voice from MiniMax:',
          response.status,
          response.statusText,
        );
        errorMessage = `Failed to test voice: ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    // Check base_resp for API errors
    if (result.base_resp && result.base_resp.status_code !== 0) {
      const errorMsg = result.base_resp.status_msg || 'Unknown error';
      throw new Error(
        `MiniMax API error: ${result.base_resp.status_code} - ${errorMsg}`,
      );
    }

    // Get audio data from response
    if (!result.data || !result.data.audio) {
      console.error('Invalid response structure:', result);
      throw new Error('Audio data not found in MiniMax response');
    }

    // Convert hex string to ArrayBuffer
    try {
      return this.hexToArrayBuffer(result.data.audio);
    } catch (error) {
      console.error('Failed to convert hex audio data:', error);
      throw new Error(`Failed to process audio data: ${error}`);
    }
  }

  /**
   * Full production audio synthesis
   * Requires API key, voice ID, and GroupId
   * @param input Talk object
   * @param speaker Voice ID
   * @param apiKey MiniMax API key
   * @param voiceActor Not used for MiniMax (for interface compatibility)
   * @returns Promise<ArrayBuffer>
   */
  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
    voiceActor?: any,
  ): Promise<ArrayBuffer> {
    return this.fetchAudioWithOptions(input, speaker, apiKey, true);
  }

  /**
   * Audio synthesis with flexible GroupId requirement
   * @param input Talk object
   * @param speaker Voice ID
   * @param apiKey MiniMax API key
   * @param requireGroupId Whether to require GroupId (default: true)
   * @returns Promise<ArrayBuffer>
   */
  async fetchAudioWithOptions(
    input: Talk,
    speaker: string,
    apiKey?: string,
    requireGroupId: boolean = true,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('MiniMax API key is required');
    }

    if (requireGroupId && !this.groupId) {
      throw new Error(
        'MiniMax GroupId is required for production synthesis. Please set it using setGroupId(), or use testVoice() for testing.',
      );
    }

    const talk = input as Talk;
    const text = talk.message.trim();

    // Validate text length (max 5000 characters)
    if (text.length > 5000) {
      throw new Error('Text exceeds maximum length of 5000 characters');
    }

    // Get emotion from talk.style and adjust voice settings
    const emotionVoiceSettings = this.getVoiceSettings(talk.style || 'talk');

    const requestBody = {
      model: this.model,
      text: text,
      stream: false,
      voice_setting: this.buildVoiceSetting(
        speaker || this.defaultVoiceId,
        emotionVoiceSettings,
      ),
      audio_setting: this.buildAudioSetting(),
      language_boost: this.language,
    };

    // Use provided GroupId or temporary one for testing
    const groupIdToUse = this.groupId || '1';

    const response = await fetch(
      `${this.getTtsApiUrl()}?GroupId=${groupIdToUse}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorText = await response.text();
        console.error(
          'Failed to fetch TTS from MiniMax:',
          response.status,
          errorText,
        );
        errorMessage = `Failed to fetch TTS from MiniMax: ${response.status} - ${errorText}`;
      } catch (e) {
        console.error(
          'Failed to fetch TTS from MiniMax:',
          response.status,
          response.statusText,
        );
        errorMessage = `Failed to fetch TTS from MiniMax: ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    // Check base_resp for API errors
    if (result.base_resp && result.base_resp.status_code !== 0) {
      const errorMsg = result.base_resp.status_msg || 'Unknown error';
      throw new Error(
        `MiniMax API error: ${result.base_resp.status_code} - ${errorMsg}`,
      );
    }

    // Get audio data from response
    if (!result.data || !result.data.audio) {
      console.error('Invalid response structure:', result);
      throw new Error('Audio data not found in MiniMax response');
    }

    // Convert hex string to ArrayBuffer
    try {
      return this.hexToArrayBuffer(result.data.audio);
    } catch (error) {
      console.error('Failed to convert hex audio data:', error);
      throw new Error(`Failed to process audio data: ${error}`);
    }
  }

  /**
   * Check if GroupId is configured
   * @returns boolean
   */
  hasGroupId(): boolean {
    return !!this.groupId;
  }

  /**
   * Get current endpoint setting
   * @returns MinimaxEndpoint
   */
  getEndpoint(): MinimaxEndpoint {
    return this.endpoint;
  }

  /**
   * Set custom API endpoint URL (VoiceEngine interface compatibility)
   * @param apiUrl custom API endpoint URL
   */
  setApiEndpoint(apiUrl: string): void {
    // For MiniMax, we override the endpoint URLs directly
    if (apiUrl.includes('minimaxi.com')) {
      this.endpoint = 'china';
    } else {
      this.endpoint = 'global';
    }
  }

  /**
   * Get voice settings based on emotion
   * @param emotion Emotion type
   * @returns Voice settings
   */
  private getVoiceSettings(emotion: string): {
    speed: number;
    vol: number;
    pitch: number;
  } {
    // Default settings
    let speed = 1.0;
    let vol = 1.0;
    let pitch = 0;

    // Adjust settings based on emotion
    switch (emotion.toLowerCase()) {
      case 'happy':
        speed = 1.1;
        pitch = 1;
        break;
      case 'sad':
        speed = 0.9;
        pitch = -1;
        break;
      case 'angry':
        speed = 1.0;
        vol = 1.1;
        pitch = 0;
        break;
      case 'surprised':
        speed = 1.2;
        pitch = 2;
        break;
      default:
        // Keep default values
        break;
    }

    return { speed, vol, pitch };
  }

  /**
   * Merge incoming voice overrides into the current override map
   * Passing undefined removes the override and falls back to defaults
   * @param settings Voice setting overrides
   */
  private updateVoiceOverrides(settings: MinimaxVoiceSettingsOptions): void {
    for (const [key, value] of Object.entries(settings) as [
      keyof MinimaxVoiceSettingsOptions,
      number | undefined,
    ][]) {
      if (value === undefined || value === null) {
        delete this.voiceOverrides[key];
      } else {
        this.voiceOverrides[key] = value;
      }
    }
  }

  /**
   * Merge incoming audio overrides into the current override map
   * Passing undefined removes the override and falls back to defaults
   * @param settings Audio setting overrides
   */
  private updateAudioOverrides(settings: MinimaxAudioSettingsOptions): void {
    for (const [key, value] of Object.entries(settings) as [
      keyof MinimaxAudioSettingsOptions,
      (
        | MinimaxAudioSettingsOptions[keyof MinimaxAudioSettingsOptions]
        | undefined
      ),
    ][]) {
      if (value === undefined || value === null) {
        delete this.audioOverrides[key];
      } else {
        switch (key) {
          case 'sampleRate':
            this.audioOverrides.sampleRate = value as number;
            break;
          case 'bitrate':
            this.audioOverrides.bitrate = value as number;
            break;
          case 'format':
            this.audioOverrides.format = value as MinimaxAudioFormat;
            break;
          case 'channel':
            this.audioOverrides.channel = value as 1 | 2;
            break;
        }
      }
    }
  }

  /**
   * Convert hex string to ArrayBuffer
   * @param hex Hex string
   * @returns ArrayBuffer
   */
  private hexToArrayBuffer(hex: string): ArrayBuffer {
    // Remove any whitespace or newlines
    const cleanHex = hex.replace(/[\s\n]/g, '');

    // Ensure even number of characters
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Invalid hex string: odd number of characters');
    }

    // Validate hex string
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      throw new Error('Invalid hex string: contains non-hex characters');
    }

    const buffer = new ArrayBuffer(cleanHex.length / 2);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < cleanHex.length; i += 2) {
      view[i / 2] = Number.parseInt(cleanHex.substr(i, 2), 16);
    }

    return buffer;
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'MiniMax Audioを使用します';
  }
}
