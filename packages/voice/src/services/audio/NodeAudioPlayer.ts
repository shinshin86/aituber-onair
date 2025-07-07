import { AudioPlayer } from '../../types/audioPlayer';

/**
 * Node.js-based audio player implementation
 * Uses optional dependencies for audio playback
 */
export class NodeAudioPlayer implements AudioPlayer {
  private isPlayingAudio = false;
  private onCompleteCallback?: () => void;
  private currentProcess: any = null;

  async play(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      this.isPlayingAudio = true;

      // Try to use available audio playback libraries
      // First, try node-speaker (requires native compilation)
      try {
        const Speaker = await this.tryRequire('speaker');
        if (Speaker) {
          return await this.playWithSpeaker(audioBuffer, Speaker);
        }
      } catch (e) {
        // Speaker not available
      }

      // Try play-sound (uses system audio players)
      try {
        const player = await this.tryRequire('play-sound');
        if (player) {
          return await this.playWithPlaySound(audioBuffer, player);
        }
      } catch (e) {
        // play-sound not available
      }

      // If no audio player is available, just complete immediately
      console.warn('No audio playback library available in Node.js environment. Audio will not be played.');
      this.handlePlaybackEnd();
      return Promise.resolve();
    } catch (error) {
      this.isPlayingAudio = false;
      throw error;
    }
  }

  private async playWithSpeaker(audioBuffer: ArrayBuffer, Speaker: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const speaker = new Speaker({
          channels: 1,
          bitDepth: 16,
          sampleRate: 24000
        });

        speaker.on('close', () => {
          this.handlePlaybackEnd();
          resolve();
        });

        speaker.on('error', (err: Error) => {
          this.isPlayingAudio = false;
          reject(err);
        });

        // Convert ArrayBuffer to Buffer
        const buffer = Buffer.from(audioBuffer);
        speaker.write(buffer);
        speaker.end();
      } catch (error) {
        this.isPlayingAudio = false;
        reject(error);
      }
    });
  }

  private async playWithPlaySound(audioBuffer: ArrayBuffer, player: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        // Create temporary file
        const tempFile = path.join(os.tmpdir(), `aituber-audio-${Date.now()}.wav`);
        fs.writeFileSync(tempFile, Buffer.from(audioBuffer));

        const playerInstance = player();
        this.currentProcess = playerInstance.play(tempFile, (err: Error) => {
          // Clean up temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore cleanup errors
          }

          if (err) {
            this.isPlayingAudio = false;
            reject(err);
          } else {
            this.handlePlaybackEnd();
            resolve();
          }
        });
      } catch (error) {
        this.isPlayingAudio = false;
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.currentProcess && typeof this.currentProcess.kill === 'function') {
      this.currentProcess.kill();
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
  }

  private handlePlaybackEnd(): void {
    this.isPlayingAudio = false;
    this.currentProcess = null;
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }

  private async tryRequire(moduleName: string): Promise<any> {
    try {
      return require(moduleName);
    } catch (e) {
      return null;
    }
  }
}