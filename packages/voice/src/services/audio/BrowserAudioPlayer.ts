import { AudioPlayer } from '../../types/audioPlayer';

/**
 * Browser-based audio player implementation using HTMLAudioElement
 */
export class BrowserAudioPlayer implements AudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private isPlayingAudio = false;
  private onCompleteCallback?: () => void;

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.audioElement = document.createElement('audio');
      this.audioElement.addEventListener('ended', () => {
        this.handlePlaybackEnd();
      });
    }
  }

  async play(audioBuffer: ArrayBuffer, audioElementId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          resolve();
          return;
        }

        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        let audioEl = this.audioElement;
        if (audioElementId) {
          const customAudioEl = document.getElementById(audioElementId) as HTMLAudioElement;
          if (customAudioEl) {
            audioEl = customAudioEl;
          }
        }

        if (!audioEl) {
          reject(new Error('Audio element not available'));
          return;
        }

        const onEnded = () => {
          URL.revokeObjectURL(url);
          audioEl?.removeEventListener('ended', onEnded);
          audioEl?.removeEventListener('error', onError);
          this.handlePlaybackEnd();
          resolve();
        };

        const onError = (e: Event) => {
          URL.revokeObjectURL(url);
          audioEl?.removeEventListener('ended', onEnded);
          audioEl?.removeEventListener('error', onError);
          this.isPlayingAudio = false;
          reject(new Error(`Audio playback error: ${(e as ErrorEvent).message}`));
        };

        audioEl.addEventListener('ended', onEnded);
        audioEl.addEventListener('error', onError);

        this.isPlayingAudio = true;
        audioEl.src = url;
        audioEl.play().catch((error) => {
          URL.revokeObjectURL(url);
          this.isPlayingAudio = false;
          reject(error);
        });
      } catch (error) {
        this.isPlayingAudio = false;
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isPlayingAudio = false;
  }

  isPlaying(): boolean {
    return this.isPlayingAudio;
  }

  setOnComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  dispose(): void {
    this.stop();
    if (this.audioElement) {
      this.audioElement.remove();
      this.audioElement = null;
    }
  }

  private handlePlaybackEnd(): void {
    this.isPlayingAudio = false;
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }
}