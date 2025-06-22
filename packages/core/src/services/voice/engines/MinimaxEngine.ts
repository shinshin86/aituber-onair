import { MINIMAX_API_URL } from '../../../constants';
import { Talk } from '../../../types';
import { VoiceEngine } from './VoiceEngine';

/**
 * MiniMax TTS voice synthesis engine
 */
export class MinimaxEngine implements VoiceEngine {
  private groupId?: string;
  private model: string = 'speech-02-hd';
  private defaultVoiceId: string = 'male-qn-qingse';
  private language: string = 'Japanese';

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
   * @param groupId GroupId for MiniMax API (required)
   */
  setGroupId(groupId: string): void {
    this.groupId = groupId;
  }

  /**
   * Set model for MiniMax TTS
   * @param model Model name (speech-02-hd, speech-02-turbo, etc.)
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Set language boost
   * @param language Language to boost recognition
   */
  setLanguage(language: string): void {
    this.language = language;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('MiniMax API key is required');
    }

    if (!this.groupId) {
      throw new Error(
        'MiniMax GroupId is required. Please set it using setGroupId()',
      );
    }

    const talk = input as Talk;
    const text = talk.message.trim();

    // Get emotion from talk.style and adjust voice settings
    const voiceSettings = this.getVoiceSettings(talk.style || 'neutral');

    const response = await fetch(`${MINIMAX_API_URL}?GroupId=${this.groupId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        text: text,
        stream: false,
        voice_setting: {
          voice_id: speaker || this.defaultVoiceId,
          speed: voiceSettings.speed,
          vol: voiceSettings.vol,
          pitch: voiceSettings.pitch,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
        language_boost: this.language,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        'Failed to fetch TTS from MiniMax:',
        response.status,
        errorText,
      );
      throw new Error(`Failed to fetch TTS from MiniMax: ${response.status}`);
    }

    const result = await response.json();

    // Check response status
    if (result.base_resp?.status_code !== 0) {
      throw new Error(
        `MiniMax API error: ${result.base_resp?.status_msg || 'Unknown error'}`,
      );
    }

    // Get audio data from response
    if (!result.data?.audio) {
      throw new Error('Audio data not found in MiniMax response');
    }

    // Convert hex string to ArrayBuffer
    return this.hexToArrayBuffer(result.data.audio);
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
   * Convert hex string to ArrayBuffer
   * @param hex Hex string
   * @returns ArrayBuffer
   */
  private hexToArrayBuffer(hex: string): ArrayBuffer {
    // Remove any whitespace or newlines
    const cleanHex = hex.replace(/[\s\n]/g, '');

    // Ensure even number of characters
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Invalid hex string');
    }

    const buffer = new ArrayBuffer(cleanHex.length / 2);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < cleanHex.length; i += 2) {
      view[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }

    return buffer;
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'MiniMax TTSを使用します';
  }
}
