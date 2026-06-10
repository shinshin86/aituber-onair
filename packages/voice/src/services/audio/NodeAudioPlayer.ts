import { AudioPlayer } from '../../types/audioPlayer';
import { getAudioFormat, getWavDataOffset } from '../../utils/wavHeader';

/**
 * Node.js-based audio player implementation
 * Uses optional dependencies for audio playback
 */
export class NodeAudioPlayer implements AudioPlayer {
  private isPlayingAudio = false;
  private onCompleteCallback?: () => void;
  private currentProcess: any = null;
  private activeTempFiles = new Set<string>();
  private tempFileCounter = 0;

  async play(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      this.isPlayingAudio = true;

      // Try to use available audio playback libraries
      // First, try node-speaker (requires native compilation)
      const Speaker = await this.tryRequire('speaker');
      if (Speaker) {
        return await this.playWithSpeaker(audioBuffer, Speaker);
      }

      // Try play-sound (uses system audio players)
      const player = await this.tryRequire('play-sound');
      if (player) {
        return await this.playWithPlaySound(audioBuffer, player);
      }

      // If no audio player is available, just complete immediately
      console.warn(
        'No audio playback library available in Node.js environment. Audio will not be played.',
      );
      this.handlePlaybackEnd();
      return Promise.resolve();
    } catch (error) {
      this.isPlayingAudio = false;
      throw error;
    }
  }

  private async playWithSpeaker(
    audioBuffer: ArrayBuffer,
    Speaker: any,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Parse WAV header to get correct audio format
        const audioFormat = getAudioFormat(audioBuffer);

        const speaker = new Speaker({
          channels: audioFormat.channels,
          bitDepth: audioFormat.bitsPerSample,
          sampleRate: audioFormat.sampleRate,
        });

        speaker.on('close', () => {
          this.handlePlaybackEnd();
          resolve();
        });

        speaker.on('error', (err: Error) => {
          console.error('Speaker error:', err);
          this.isPlayingAudio = false;
          reject(err);
        });

        // Convert ArrayBuffer to Buffer, skip the WAV header.
        const wavHeaderSize = getWavDataOffset(audioBuffer);
        const audioData = audioBuffer.slice(wavHeaderSize);
        const buffer = Buffer.from(audioData);

        speaker.write(buffer);
        speaker.end();
      } catch (error) {
        console.error('playWithSpeaker error:', error);
        this.isPlayingAudio = false;
        reject(error);
      }
    });
  }

  private async playWithPlaySound(
    audioBuffer: ArrayBuffer,
    player: any,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const fs = require('node:fs');
        const path = require('node:path');
        const os = require('node:os');
        const crypto = require('node:crypto');

        // Create temporary file
        const suffix =
          typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${this.tempFileCounter++}`;
        const tempFile = path.join(os.tmpdir(), `aituber-audio-${suffix}.wav`);
        fs.writeFileSync(tempFile, Buffer.from(audioBuffer));
        this.activeTempFiles.add(tempFile);

        const playerInstance = player();
        this.currentProcess = playerInstance.play(tempFile, (err: Error) => {
          this.cleanupTempFile(tempFile);

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
        this.cleanupTempFiles();
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.currentProcess && typeof this.currentProcess.kill === 'function') {
      this.currentProcess.kill();
    }
    this.currentProcess = null;
    this.cleanupTempFiles();
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

  private cleanupTempFile(tempFile: string): void {
    if (!this.activeTempFiles.delete(tempFile)) {
      return;
    }

    try {
      const fs = require('node:fs');
      fs.unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  private cleanupTempFiles(): void {
    for (const tempFile of this.activeTempFiles) {
      this.cleanupTempFile(tempFile);
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
