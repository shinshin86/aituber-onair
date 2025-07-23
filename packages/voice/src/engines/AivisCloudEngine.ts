import { AIVIS_CLOUD_API_URL } from '../constants/voiceEngine';
import { Talk } from '../types/voice';
import { VoiceEngine } from './VoiceEngine';

/**
 * Aivis Cloud API voice synthesis engine
 */
export class AivisCloudEngine implements VoiceEngine {
  private modelUuid?: string;
  private speakerUuid?: string;
  private styleId?: number;
  private styleName?: string;
  private useSSML: boolean = true;
  private speakingRate: number = 1.0;
  private emotionalIntensity: number = 1.0;
  private tempoDynamics: number = 1.0;
  private pitch: number = 0.0;
  private volume: number = 1.0;
  private leadingSilence: number = 0.1;
  private trailingSilence: number = 0.1;
  private lineBreakSilence: number = 0.4;
  private outputFormat: 'wav' | 'flac' | 'mp3' | 'aac' | 'opus' = 'mp3';
  private outputBitrate?: number;
  private outputSamplingRate: number = 44100;
  private outputChannels: 'mono' | 'stereo' = 'mono';
  private enableBillingLogs: boolean = false;

  /**
   * Set model UUID
   * @param modelUuid Aivis Cloud model UUID
   */
  setModelUuid(modelUuid: string): void {
    this.modelUuid = modelUuid;
  }

  /**
   * Set speaker UUID
   * @param speakerUuid Aivis Cloud speaker UUID
   */
  setSpeakerUuid(speakerUuid: string): void {
    this.speakerUuid = speakerUuid;
  }

  /**
   * Set style ID
   * @param styleId Style ID (0-31)
   */
  setStyleId(styleId: number): void {
    this.styleId = styleId;
    this.styleName = undefined; // Clear style name when setting style ID
  }

  /**
   * Set style name
   * @param styleName Style name
   */
  setStyleName(styleName: string): void {
    this.styleName = styleName;
    this.styleId = undefined; // Clear style ID when setting style name
  }

  /**
   * Set SSML usage
   * @param useSSML Enable SSML interpretation
   */
  setUseSSML(useSSML: boolean): void {
    this.useSSML = useSSML;
  }

  /**
   * Set speaking rate
   * @param rate Speaking rate (0.5-2.0)
   */
  setSpeakingRate(rate: number): void {
    this.speakingRate = Math.max(0.5, Math.min(2.0, rate));
  }

  /**
   * Set emotional intensity
   * @param intensity Emotional intensity (0.0-2.0)
   */
  setEmotionalIntensity(intensity: number): void {
    this.emotionalIntensity = Math.max(0.0, Math.min(2.0, intensity));
  }

  /**
   * Set tempo dynamics
   * @param dynamics Tempo dynamics (0.0-2.0)
   */
  setTempoDynamics(dynamics: number): void {
    this.tempoDynamics = Math.max(0.0, Math.min(2.0, dynamics));
  }

  /**
   * Set pitch
   * @param pitch Pitch (-1.0-1.0)
   */
  setPitch(pitch: number): void {
    this.pitch = Math.max(-1.0, Math.min(1.0, pitch));
  }

  /**
   * Set volume
   * @param volume Volume (0.0-2.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0.0, Math.min(2.0, volume));
  }

  /**
   * Set silence durations
   * @param leading Leading silence in seconds
   * @param trailing Trailing silence in seconds
   * @param lineBreak Line break silence in seconds
   */
  setSilenceDurations(
    leading: number,
    trailing: number,
    lineBreak: number,
  ): void {
    this.leadingSilence = Math.max(0, leading);
    this.trailingSilence = Math.max(0, trailing);
    this.lineBreakSilence = Math.max(0, lineBreak);
  }

  /**
   * Set output format
   * @param format Output format
   */
  setOutputFormat(format: 'wav' | 'flac' | 'mp3' | 'aac' | 'opus'): void {
    this.outputFormat = format;
  }

  /**
   * Set output bitrate
   * @param bitrate Output bitrate in kbps (8-320)
   */
  setOutputBitrate(bitrate: number): void {
    this.outputBitrate = Math.max(8, Math.min(320, bitrate));
  }

  /**
   * Set output sampling rate
   * @param rate Output sampling rate in Hz
   */
  setOutputSamplingRate(
    rate: 8000 | 11025 | 12000 | 16000 | 22050 | 24000 | 44100 | 48000,
  ): void {
    this.outputSamplingRate = rate;
  }

  /**
   * Set output channels
   * @param channels Output channels (mono or stereo)
   */
  setOutputChannels(channels: 'mono' | 'stereo'): void {
    this.outputChannels = channels;
  }

  /**
   * Enable or disable billing/usage information logs
   * @param enable Whether to enable billing logs (default: false)
   */
  setEnableBillingLogs(enable: boolean): void {
    this.enableBillingLogs = enable;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    if (!apiKey) {
      throw new Error('Aivis Cloud API key is required');
    }

    if (!this.modelUuid && !speaker) {
      throw new Error(
        'Aivis Cloud model UUID is required. Set it using setModelUuid() or pass as speaker parameter',
      );
    }

    const talk = input as Talk;
    const text = talk.message.trim();

    // Use speaker parameter as model UUID if modelUuid is not set
    const actualModelUuid = this.modelUuid || speaker;

    // Get emotion from talk.style and adjust emotional intensity if needed
    const emotionSettings = this.getEmotionSettings(talk.style || 'talk');

    const requestBody: any = {
      model_uuid: actualModelUuid,
      text: text,
      use_ssml: this.useSSML,
      speaking_rate: this.speakingRate,
      emotional_intensity: emotionSettings.emotionalIntensity,
      tempo_dynamics: this.tempoDynamics,
      pitch: this.pitch,
      volume: this.volume,
      leading_silence_seconds: this.leadingSilence,
      trailing_silence_seconds: this.trailingSilence,
      line_break_silence_seconds: this.lineBreakSilence,
      output_format: this.outputFormat,
      output_sampling_rate: this.outputSamplingRate,
      output_audio_channels: this.outputChannels,
    };

    // Add optional fields
    if (this.speakerUuid) {
      requestBody.speaker_uuid = this.speakerUuid;
    }

    if (this.styleId !== undefined) {
      requestBody.style_id = this.styleId;
    } else if (this.styleName) {
      requestBody.style_name = this.styleName;
    }

    if (
      this.outputBitrate &&
      this.outputFormat !== 'wav' &&
      this.outputFormat !== 'flac'
    ) {
      requestBody.output_bitrate = this.outputBitrate;
    }

    const response = await fetch(AIVIS_CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorText = await response.text();
        console.error(
          'Failed to fetch TTS from Aivis Cloud:',
          response.status,
          errorText,
        );

        // Parse specific error codes
        switch (response.status) {
          case 401:
            errorMessage = 'Invalid API key for Aivis Cloud';
            break;
          case 402:
            errorMessage = 'Insufficient credit balance in Aivis Cloud account';
            break;
          case 404:
            errorMessage = `Model UUID not found: ${actualModelUuid}`;
            break;
          case 422:
            errorMessage = `Invalid request parameters: ${errorText}`;
            break;
          case 429:
            errorMessage = 'Rate limit exceeded for Aivis Cloud API';
            break;
          case 500:
          case 503:
          case 504:
            errorMessage = `Aivis Cloud server error: ${errorText}`;
            break;
          default:
            errorMessage = `Failed to fetch TTS from Aivis Cloud: ${response.status} - ${errorText}`;
        }
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    // Log billing/usage information from response headers (if enabled)
    if (this.enableBillingLogs) {
      const billingMode = response.headers.get('X-Aivis-Billing-Mode');
      const characterCount = response.headers.get('X-Aivis-Character-Count');
      const creditsUsed = response.headers.get('X-Aivis-Credits-Used');
      const creditsRemaining = response.headers.get(
        'X-Aivis-Credits-Remaining',
      );
      const rateLimitRemaining = response.headers.get(
        'X-Aivis-Rate-Limit-Remaining',
      );

      if (billingMode) {
        console.log(`Aivis Cloud billing mode: ${billingMode}`);
        if (characterCount)
          console.log(`Characters synthesized: ${characterCount}`);
        if (creditsUsed) console.log(`Credits used: ${creditsUsed}`);
        if (creditsRemaining)
          console.log(`Credits remaining: ${creditsRemaining}`);
        if (rateLimitRemaining)
          console.log(`Rate limit remaining: ${rateLimitRemaining}/min`);
      }
    }

    const blob = await response.blob();
    return await blob.arrayBuffer();
  }

  /**
   * Get emotion settings based on emotion type
   * @param emotion Emotion type
   * @returns Emotion settings with adjusted emotional intensity
   */
  private getEmotionSettings(emotion: string): {
    emotionalIntensity: number;
  } {
    // Use base emotional intensity or adjust based on emotion
    let emotionalIntensity = this.emotionalIntensity;

    // Optionally adjust emotional intensity based on emotion type
    // This can be customized based on specific needs
    switch (emotion.toLowerCase()) {
      case 'happy':
      case 'surprised':
        // Slightly increase emotional intensity for more expressive emotions
        emotionalIntensity = Math.min(2.0, emotionalIntensity * 1.1);
        break;
      case 'sad':
        // Keep normal emotional intensity for sad
        break;
      case 'angry':
        // Slightly increase for angry expression
        emotionalIntensity = Math.min(2.0, emotionalIntensity * 1.05);
        break;
      default:
        // Use default emotional intensity
        break;
    }

    return { emotionalIntensity };
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'Aivis Cloud APIを使用します';
  }
}
