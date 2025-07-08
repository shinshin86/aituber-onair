import { AudioPlayer } from '../../types/audioPlayer';
import { getAudioFormat } from '../../utils/wavHeader';

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

        console.log(
          `Audio format detected: ${audioFormat.sampleRate}Hz, ${audioFormat.channels}ch, ${audioFormat.bitsPerSample}bit`,
        );

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

        // Convert ArrayBuffer to Buffer, skip WAV header (44 bytes typically)
        const wavHeaderSize = this.getWavHeaderSize(audioBuffer);
        const audioData = audioBuffer.slice(wavHeaderSize);
        const buffer = Buffer.from(audioData);

        console.log(
          `Playing audio: ${buffer.length} bytes (header: ${wavHeaderSize} bytes)`,
        );

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
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        // Create temporary file
        const tempFile = path.join(
          os.tmpdir(),
          `aituber-audio-${Date.now()}.wav`,
        );
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

  /**
   * Calculate WAV header size to skip when sending raw audio data to speaker
   */
  private getWavHeaderSize(buffer: ArrayBuffer): number {
    // Check for minimum buffer size
    if (buffer.byteLength < 12) {
      console.warn(
        'Buffer too small for WAV header, using default header size: 44',
      );
      return 44; // Standard WAV header size
    }

    const view = new DataView(buffer);

    try {
      // Check for RIFF header
      const riff = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3),
      );

      if (riff !== 'RIFF') {
        return 44; // Not a WAV file, use standard header size
      }

      // Find data chunk
      let offset = 12;
      while (offset < buffer.byteLength - 8) {
        const chunkId = String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3),
        );

        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'data') {
          return offset + 8; // Header ends here, data starts
        }

        offset += 8 + chunkSize;
      }

      return 44; // Standard WAV header size fallback
    } catch (error) {
      console.warn(
        'Error parsing WAV header, using default header size:',
        error,
      );
      return 44; // Standard WAV header size
    }
  }
}
