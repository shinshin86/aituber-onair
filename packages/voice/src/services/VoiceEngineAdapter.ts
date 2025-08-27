import { AudioPlayer } from '../types/audioPlayer';
import { ChatScreenplay } from '../types/chat';
import { EmotionType } from '../types/voice';
import { textToScreenplay } from '../utils/screenplay';
import {
  AudioPlayOptions,
  VoiceService,
  VoiceServiceOptions,
} from './VoiceService';
import { AudioPlayerFactory } from './audio/AudioPlayerFactory';

/**
 * Adapter implementation for using existing voice engines
 */
export class VoiceEngineAdapter implements VoiceService {
  private options: VoiceServiceOptions;
  private audioPlayer: AudioPlayer;

  /**
   * Constructor
   * @param options Voice service options
   */
  constructor(options: VoiceServiceOptions) {
    this.options = options;
    this.audioPlayer = AudioPlayerFactory.createAudioPlayer();

    // Set up completion callback
    this.audioPlayer.setOnComplete(() => {
      if (this.options.onComplete) {
        this.options.onComplete();
      }
    });
  }

  /**
   * Speak the screenplay as audio
   * @param screenplay Screenplay (text and emotion)
   * @param options Audio playback options
   */
  async speak(
    screenplay: ChatScreenplay,
    options?: AudioPlayOptions,
  ): Promise<void> {
    try {
      if (this.audioPlayer.isPlaying()) {
        this.stop();
      }

      // Import existing VoiceEngineFactory dynamically
      const { VoiceEngineFactory } = await import(
        '../engines/VoiceEngineFactory'
      );

      // Map emotion to style used by existing engine
      const getStyleFromEmotion = (emotion: string): EmotionType => {
        switch (emotion) {
          case 'angry':
            return 'angry';
          case 'happy':
            return 'happy';
          case 'sad':
            return 'sad';
          case 'surprised':
            return 'surprised';
          default:
            return 'neutral';
        }
      };

      // Convert to Talk type for VoiceEngine
      const talk = {
        style: getStyleFromEmotion(screenplay.emotion || 'neutral'),
        message: screenplay.text,
      };

      const engine = VoiceEngineFactory.getEngine(this.options.engineType);

      // Set custom endpoint URL
      if (engine.setApiEndpoint) {
        // Set custom endpoint URL based on engine type
        switch (this.options.engineType) {
          case 'voicevox':
            if (this.options.voicevoxApiUrl) {
              engine.setApiEndpoint(this.options.voicevoxApiUrl);
            }
            break;
          case 'voicepeak':
            if (this.options.voicepeakApiUrl) {
              engine.setApiEndpoint(this.options.voicepeakApiUrl);
            }
            break;
          case 'aivisSpeech':
            if (this.options.aivisSpeechApiUrl) {
              engine.setApiEndpoint(this.options.aivisSpeechApiUrl);
            }
            break;
        }
      }

      // For MiniMax engine, set GroupId
      if (this.options.engineType === 'minimax' && (engine as any).setGroupId) {
        if (this.options.groupId) {
          (engine as any).setGroupId(this.options.groupId);
        } else {
          console.warn(
            'MiniMax engine requires GroupId, but it is not provided in options',
          );
        }

        // If endpoint setting is also supported by MinimaxEngine
        if (this.options.endpoint && (engine as any).setEndpoint) {
          (engine as any).setEndpoint(this.options.endpoint);
        }

        // If model setting is also supported by MinimaxEngine
        if (this.options.minimaxModel && (engine as any).setModel) {
          (engine as any).setModel(this.options.minimaxModel);
        }
      }

      // For Aivis Cloud engine, set various parameters
      if (this.options.engineType === 'aivisCloud') {
        const aivisEngine = engine as any;

        // Model UUID (required)
        if (this.options.aivisCloudModelUuid) {
          aivisEngine.setModelUuid(this.options.aivisCloudModelUuid);
        }

        // Speaker UUID (optional)
        if (this.options.aivisCloudSpeakerUuid) {
          aivisEngine.setSpeakerUuid(this.options.aivisCloudSpeakerUuid);
        }

        // Style settings (style ID or name, but not both)
        if (this.options.aivisCloudStyleId !== undefined) {
          aivisEngine.setStyleId(this.options.aivisCloudStyleId);
        } else if (this.options.aivisCloudStyleName) {
          aivisEngine.setStyleName(this.options.aivisCloudStyleName);
        }

        // SSML setting
        if (this.options.aivisCloudUseSSML !== undefined) {
          aivisEngine.setUseSSML(this.options.aivisCloudUseSSML);
        }

        // Voice parameters
        if (this.options.aivisCloudSpeakingRate !== undefined) {
          aivisEngine.setSpeakingRate(this.options.aivisCloudSpeakingRate);
        }
        if (this.options.aivisCloudEmotionalIntensity !== undefined) {
          aivisEngine.setEmotionalIntensity(
            this.options.aivisCloudEmotionalIntensity,
          );
        }
        if (this.options.aivisCloudTempoDynamics !== undefined) {
          aivisEngine.setTempoDynamics(this.options.aivisCloudTempoDynamics);
        }
        if (this.options.aivisCloudPitch !== undefined) {
          aivisEngine.setPitch(this.options.aivisCloudPitch);
        }
        if (this.options.aivisCloudVolume !== undefined) {
          aivisEngine.setVolume(this.options.aivisCloudVolume);
        }

        // Silence settings
        if (
          this.options.aivisCloudLeadingSilence !== undefined ||
          this.options.aivisCloudTrailingSilence !== undefined ||
          this.options.aivisCloudLineBreakSilence !== undefined
        ) {
          aivisEngine.setSilenceDurations(
            this.options.aivisCloudLeadingSilence ?? 0.1,
            this.options.aivisCloudTrailingSilence ?? 0.1,
            this.options.aivisCloudLineBreakSilence ?? 0.4,
          );
        }

        // Output format settings
        if (this.options.aivisCloudOutputFormat) {
          aivisEngine.setOutputFormat(this.options.aivisCloudOutputFormat);
        }
        if (this.options.aivisCloudOutputBitrate !== undefined) {
          aivisEngine.setOutputBitrate(this.options.aivisCloudOutputBitrate);
        }
        if (this.options.aivisCloudOutputSamplingRate !== undefined) {
          aivisEngine.setOutputSamplingRate(
            this.options.aivisCloudOutputSamplingRate,
          );
        }
        if (this.options.aivisCloudOutputChannels) {
          aivisEngine.setOutputChannels(this.options.aivisCloudOutputChannels);
        }

        // Billing logs setting
        if (this.options.aivisCloudEnableBillingLogs !== undefined) {
          aivisEngine.setEnableBillingLogs(
            this.options.aivisCloudEnableBillingLogs,
          );
        }
      }

      // Get audio data
      const audioBuffer = await engine.fetchAudio(
        talk as any, // Use any for type compatibility
        this.options.speaker,
        this.options.apiKey,
      );

      // If there is a custom playback process, use it
      if (this.options.onPlay) {
        await this.options.onPlay(audioBuffer, options);
        return;
      }

      // Default playback process
      await this.audioPlayer.play(audioBuffer, options?.audioElementId);
    } catch (error) {
      console.error('Error in speak:', error);
      throw error;
    }
  }

  /**
   * Speak text as audio
   * @param text Text (with emotion tags) to speak
   * @param options Audio playback options
   */
  async speakText(text: string, options?: AudioPlayOptions): Promise<void> {
    // Convert text to screenplay and play
    const screenplay = textToScreenplay(text);
    return this.speak(screenplay, options);
  }

  /**
   * Get whether currently playing
   */
  isPlaying(): boolean {
    return this.audioPlayer.isPlaying();
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.audioPlayer.stop();
  }

  /**
   * Update service settings
   * @param options New settings options
   */
  updateOptions(options: Partial<VoiceServiceOptions>): void {
    this.options = { ...this.options, ...options };

    // Update audio player callback if onComplete changes
    if (options.onComplete !== undefined) {
      this.audioPlayer.setOnComplete(() => {
        if (this.options.onComplete) {
          this.options.onComplete();
        }
      });
    }
  }
}
