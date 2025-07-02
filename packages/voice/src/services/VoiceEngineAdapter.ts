import { ChatScreenplay } from '../types/chat';
import { EmotionType } from '../types/voice';
import {
  VoiceService,
  VoiceServiceOptions,
  AudioPlayOptions,
} from './VoiceService';
import { textToScreenplay } from '../utils/screenplay';

/**
 * Adapter implementation for using existing voice engines
 */
export class VoiceEngineAdapter implements VoiceService {
  private options: VoiceServiceOptions;
  private isPlayingAudio: boolean = false;
  private audioElement: HTMLAudioElement | null = null;

  /**
   * Constructor
   * @param options Voice service options
   */
  constructor(options: VoiceServiceOptions) {
    this.options = options;

    // Create reusable audio element
    if (typeof window !== 'undefined') {
      this.audioElement = document.createElement('audio');
      this.audioElement.addEventListener('ended', () => {
        this.isPlayingAudio = false;
        if (this.options.onComplete) {
          this.options.onComplete();
        }
      });
    }
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
      if (this.isPlayingAudio) {
        this.stop();
      }

      this.isPlayingAudio = true;

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

      // カスタムエンドポイントURLの設定
      if (engine.setApiEndpoint) {
        // エンジンタイプに応じてカスタムエンドポイントURLを設定
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

      // MiniMaxエンジンの場合、GroupIdを設定
      if (this.options.engineType === 'minimax' && (engine as any).setGroupId) {
        if (this.options.groupId) {
          (engine as any).setGroupId(this.options.groupId);
        } else {
          console.warn(
            'MiniMax engine requires GroupId, but it is not provided in options',
          );
        }

        // エンドポイントの設定もMinimaxEngineでサポートされている場合
        if (this.options.endpoint && (engine as any).setEndpoint) {
          (engine as any).setEndpoint(this.options.endpoint);
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
      await this.playAudioBuffer(audioBuffer, options?.audioElementId);
    } catch (error) {
      console.error('Error in speak:', error);
      this.isPlayingAudio = false;
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
    return this.isPlayingAudio;
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isPlayingAudio = false;
  }

  /**
   * Update service settings
   * @param options New settings options
   */
  updateOptions(options: Partial<VoiceServiceOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Play audio buffer
   * @param audioBuffer Audio data ArrayBuffer
   * @param audioElementId ID of HTML element to play audio (use internal element if omitted)
   */
  private async playAudioBuffer(
    audioBuffer: ArrayBuffer,
    audioElementId?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // If not in browser environment, do nothing
        if (typeof window === 'undefined') {
          this.isPlayingAudio = false;
          resolve();
          return;
        }

        // Create Blob from audio data
        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        // Get/create audio element for playback
        let audioEl = this.audioElement;
        if (audioElementId) {
          const customAudioEl = document.getElementById(
            audioElementId,
          ) as HTMLAudioElement;
          if (customAudioEl) {
            audioEl = customAudioEl;
          }
        }

        if (!audioEl) {
          reject(new Error('Audio element not available'));
          return;
        }

        // Set event listeners
        const onEnded = () => {
          this.isPlayingAudio = false;
          URL.revokeObjectURL(url);
          audioEl?.removeEventListener('ended', onEnded);
          if (this.options.onComplete) {
            this.options.onComplete();
          }
          resolve();
        };

        const onError = (e: Event) => {
          this.isPlayingAudio = false;
          URL.revokeObjectURL(url);
          audioEl?.removeEventListener('error', onError);
          reject(
            new Error(`Audio playback error: ${(e as ErrorEvent).message}`),
          );
        };

        audioEl.addEventListener('ended', onEnded);
        audioEl.addEventListener('error', onError);

        // Play audio
        audioEl.src = url;
        audioEl.play().catch((error) => {
          this.isPlayingAudio = false;
          URL.revokeObjectURL(url);
          reject(error);
        });
      } catch (error) {
        this.isPlayingAudio = false;
        reject(error);
      }
    });
  }
}
