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

      // For VOICEVOX engine, configure additional parameters
      if (this.options.engineType === 'voicevox') {
        const voicevoxEngine = engine as any;

        if (
          this.options.voicevoxQueryParameters &&
          typeof voicevoxEngine.setQueryParameters === 'function'
        ) {
          voicevoxEngine.setQueryParameters(
            this.options.voicevoxQueryParameters,
          );
        }

        if (
          this.options.voicevoxSpeedScale !== undefined &&
          typeof voicevoxEngine.setSpeedScale === 'function'
        ) {
          voicevoxEngine.setSpeedScale(this.options.voicevoxSpeedScale);
        }

        if (
          this.options.voicevoxPitchScale !== undefined &&
          typeof voicevoxEngine.setPitchScale === 'function'
        ) {
          voicevoxEngine.setPitchScale(this.options.voicevoxPitchScale);
        }

        if (
          this.options.voicevoxIntonationScale !== undefined &&
          typeof voicevoxEngine.setIntonationScale === 'function'
        ) {
          voicevoxEngine.setIntonationScale(
            this.options.voicevoxIntonationScale,
          );
        }

        if (
          this.options.voicevoxVolumeScale !== undefined &&
          typeof voicevoxEngine.setVolumeScale === 'function'
        ) {
          voicevoxEngine.setVolumeScale(this.options.voicevoxVolumeScale);
        }

        if (
          this.options.voicevoxPrePhonemeLength !== undefined &&
          typeof voicevoxEngine.setPrePhonemeLength === 'function'
        ) {
          voicevoxEngine.setPrePhonemeLength(
            this.options.voicevoxPrePhonemeLength,
          );
        }

        if (
          this.options.voicevoxPostPhonemeLength !== undefined &&
          typeof voicevoxEngine.setPostPhonemeLength === 'function'
        ) {
          voicevoxEngine.setPostPhonemeLength(
            this.options.voicevoxPostPhonemeLength,
          );
        }

        if (
          this.options.voicevoxPauseLength !== undefined &&
          typeof voicevoxEngine.setPauseLength === 'function'
        ) {
          voicevoxEngine.setPauseLength(this.options.voicevoxPauseLength);
        }

        if (
          this.options.voicevoxPauseLengthScale !== undefined &&
          typeof voicevoxEngine.setPauseLengthScale === 'function'
        ) {
          voicevoxEngine.setPauseLengthScale(
            this.options.voicevoxPauseLengthScale,
          );
        }

        if (
          this.options.voicevoxOutputSamplingRate !== undefined &&
          typeof voicevoxEngine.setOutputSamplingRate === 'function'
        ) {
          voicevoxEngine.setOutputSamplingRate(
            this.options.voicevoxOutputSamplingRate,
          );
        }

        if (
          this.options.voicevoxOutputStereo !== undefined &&
          typeof voicevoxEngine.setOutputStereo === 'function'
        ) {
          voicevoxEngine.setOutputStereo(this.options.voicevoxOutputStereo);
        }

        if (
          this.options.voicevoxEnableKatakanaEnglish !== undefined &&
          typeof voicevoxEngine.setEnableKatakanaEnglish === 'function'
        ) {
          voicevoxEngine.setEnableKatakanaEnglish(
            this.options.voicevoxEnableKatakanaEnglish,
          );
        }

        if (
          this.options.voicevoxEnableInterrogativeUpspeak !== undefined &&
          typeof voicevoxEngine.setEnableInterrogativeUpspeak === 'function'
        ) {
          voicevoxEngine.setEnableInterrogativeUpspeak(
            this.options.voicevoxEnableInterrogativeUpspeak,
          );
        }

        if (
          this.options.voicevoxCoreVersion !== undefined &&
          typeof voicevoxEngine.setCoreVersion === 'function'
        ) {
          voicevoxEngine.setCoreVersion(this.options.voicevoxCoreVersion);
        }
      }

      // For VoicePeak engine, configure optional parameters
      if (this.options.engineType === 'voicepeak') {
        const voicepeakEngine = engine as any;

        if (
          this.options.voicepeakEmotion !== undefined &&
          typeof voicepeakEngine.setEmotion === 'function'
        ) {
          voicepeakEngine.setEmotion(this.options.voicepeakEmotion);
        }

        if (
          this.options.voicepeakSpeed !== undefined &&
          typeof voicepeakEngine.setSpeed === 'function'
        ) {
          voicepeakEngine.setSpeed(this.options.voicepeakSpeed);
        }

        if (
          this.options.voicepeakPitch !== undefined &&
          typeof voicepeakEngine.setPitch === 'function'
        ) {
          voicepeakEngine.setPitch(this.options.voicepeakPitch);
        }
      }

      // For AivisSpeech engine, configure additional parameters
      if (this.options.engineType === 'aivisSpeech') {
        const aivisEngine = engine as any;

        if (
          this.options.aivisSpeechQueryParameters &&
          typeof aivisEngine.setQueryParameters === 'function'
        ) {
          aivisEngine.setQueryParameters(
            this.options.aivisSpeechQueryParameters,
          );
        }

        if (
          this.options.aivisSpeechSpeedScale !== undefined &&
          typeof aivisEngine.setSpeedScale === 'function'
        ) {
          aivisEngine.setSpeedScale(this.options.aivisSpeechSpeedScale);
        }

        if (
          this.options.aivisSpeechPitchScale !== undefined &&
          typeof aivisEngine.setPitchScale === 'function'
        ) {
          aivisEngine.setPitchScale(this.options.aivisSpeechPitchScale);
        }

        if (
          this.options.aivisSpeechIntonationScale !== undefined &&
          typeof aivisEngine.setIntonationScale === 'function'
        ) {
          aivisEngine.setIntonationScale(
            this.options.aivisSpeechIntonationScale,
          );
        }

        if (
          this.options.aivisSpeechTempoDynamicsScale !== undefined &&
          typeof aivisEngine.setTempoDynamicsScale === 'function'
        ) {
          aivisEngine.setTempoDynamicsScale(
            this.options.aivisSpeechTempoDynamicsScale,
          );
        }

        if (
          this.options.aivisSpeechVolumeScale !== undefined &&
          typeof aivisEngine.setVolumeScale === 'function'
        ) {
          aivisEngine.setVolumeScale(this.options.aivisSpeechVolumeScale);
        }

        if (
          this.options.aivisSpeechPrePhonemeLength !== undefined &&
          typeof aivisEngine.setPrePhonemeLength === 'function'
        ) {
          aivisEngine.setPrePhonemeLength(
            this.options.aivisSpeechPrePhonemeLength,
          );
        }

        if (
          this.options.aivisSpeechPostPhonemeLength !== undefined &&
          typeof aivisEngine.setPostPhonemeLength === 'function'
        ) {
          aivisEngine.setPostPhonemeLength(
            this.options.aivisSpeechPostPhonemeLength,
          );
        }

        if (
          this.options.aivisSpeechPauseLength !== undefined &&
          typeof aivisEngine.setPauseLength === 'function'
        ) {
          aivisEngine.setPauseLength(this.options.aivisSpeechPauseLength);
        }

        if (
          this.options.aivisSpeechPauseLengthScale !== undefined &&
          typeof aivisEngine.setPauseLengthScale === 'function'
        ) {
          aivisEngine.setPauseLengthScale(
            this.options.aivisSpeechPauseLengthScale,
          );
        }

        if (
          this.options.aivisSpeechOutputSamplingRate !== undefined &&
          typeof aivisEngine.setOutputSamplingRate === 'function'
        ) {
          aivisEngine.setOutputSamplingRate(
            this.options.aivisSpeechOutputSamplingRate,
          );
        }

        if (
          this.options.aivisSpeechOutputStereo !== undefined &&
          typeof aivisEngine.setOutputStereo === 'function'
        ) {
          aivisEngine.setOutputStereo(this.options.aivisSpeechOutputStereo);
        }
      }

      // For OpenAI TTS engine, configure optional overrides
      if (this.options.engineType === 'openai') {
        const openaiEngine = engine as any;

        if (
          this.options.openAiModel &&
          typeof openaiEngine.setModel === 'function'
        ) {
          openaiEngine.setModel(this.options.openAiModel);
        }

        if (
          this.options.openAiSpeed !== undefined &&
          typeof openaiEngine.setSpeed === 'function'
        ) {
          openaiEngine.setSpeed(this.options.openAiSpeed);
        }
      }

      // For MiniMax engine, configure additional parameters
      if (this.options.engineType === 'minimax') {
        const minimaxEngine = engine as any;

        if (typeof minimaxEngine.setGroupId === 'function') {
          if (this.options.groupId) {
            minimaxEngine.setGroupId(this.options.groupId);
          } else {
            console.warn(
              'MiniMax engine requires GroupId, but it is not provided in options',
            );
          }
        }

        if (
          this.options.endpoint &&
          typeof minimaxEngine.setEndpoint === 'function'
        ) {
          minimaxEngine.setEndpoint(this.options.endpoint);
        }

        if (
          this.options.minimaxModel &&
          typeof minimaxEngine.setModel === 'function'
        ) {
          minimaxEngine.setModel(this.options.minimaxModel);
        }

        if (
          this.options.minimaxLanguageBoost !== undefined &&
          typeof minimaxEngine.setLanguage === 'function'
        ) {
          minimaxEngine.setLanguage(this.options.minimaxLanguageBoost);
        }

        if (
          this.options.minimaxVoiceSettings &&
          typeof minimaxEngine.setVoiceSettings === 'function'
        ) {
          minimaxEngine.setVoiceSettings(this.options.minimaxVoiceSettings);
        }

        if (
          this.options.minimaxSpeed !== undefined &&
          typeof minimaxEngine.setSpeed === 'function'
        ) {
          minimaxEngine.setSpeed(this.options.minimaxSpeed);
        }

        if (
          this.options.minimaxVolume !== undefined &&
          typeof minimaxEngine.setVolume === 'function'
        ) {
          minimaxEngine.setVolume(this.options.minimaxVolume);
        }

        if (
          this.options.minimaxPitch !== undefined &&
          typeof minimaxEngine.setPitch === 'function'
        ) {
          minimaxEngine.setPitch(this.options.minimaxPitch);
        }

        if (
          this.options.minimaxAudioSettings &&
          typeof minimaxEngine.setAudioSettings === 'function'
        ) {
          minimaxEngine.setAudioSettings(this.options.minimaxAudioSettings);
        }

        if (
          this.options.minimaxSampleRate !== undefined &&
          typeof minimaxEngine.setSampleRate === 'function'
        ) {
          minimaxEngine.setSampleRate(this.options.minimaxSampleRate);
        }

        if (
          this.options.minimaxBitrate !== undefined &&
          typeof minimaxEngine.setBitrate === 'function'
        ) {
          minimaxEngine.setBitrate(this.options.minimaxBitrate);
        }

        if (
          this.options.minimaxAudioFormat !== undefined &&
          typeof minimaxEngine.setAudioFormat === 'function'
        ) {
          minimaxEngine.setAudioFormat(this.options.minimaxAudioFormat);
        }

        if (
          this.options.minimaxAudioChannel !== undefined &&
          typeof minimaxEngine.setAudioChannel === 'function'
        ) {
          minimaxEngine.setAudioChannel(this.options.minimaxAudioChannel);
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

        if (this.options.aivisCloudUserDictionaryUuid) {
          aivisEngine.setUserDictionaryUuid(
            this.options.aivisCloudUserDictionaryUuid,
          );
        }

        if (this.options.aivisCloudLanguage) {
          aivisEngine.setLanguage(this.options.aivisCloudLanguage);
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
