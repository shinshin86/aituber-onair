import { AudioPlayer } from '../../types/audioPlayer';
import { BrowserAudioPlayer } from './BrowserAudioPlayer';
import { NodeAudioPlayer } from './NodeAudioPlayer';

/**
 * Runtime detection utility
 */
export class RuntimeDetection {
  static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  static isDeno(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (globalThis as any).Deno !== 'undefined'
    );
  }

  static isBun(): boolean {
    return typeof (globalThis as any).Bun !== 'undefined';
  }

  static isNode(): boolean {
    return (
      typeof process !== 'undefined' &&
      process.versions?.node !== undefined &&
      !this.isBun()
    );
  }

  static getRuntimeName(): string {
    if (this.isBrowser()) return 'browser';
    if (this.isDeno()) return 'deno';
    if (this.isBun()) return 'bun';
    if (this.isNode()) return 'node';
    return 'unknown';
  }
}

/**
 * Factory class for creating environment-appropriate audio players
 */
export class AudioPlayerFactory {
  /**
   * Create an audio player for the current environment
   */
  static createAudioPlayer(): AudioPlayer {
    // Browser (including Deno which has window object)
    if (RuntimeDetection.isBrowser() || RuntimeDetection.isDeno()) {
      return new BrowserAudioPlayer();
    }

    // Node.js and Bun (both can use Node.js audio libraries)
    if (RuntimeDetection.isNode() || RuntimeDetection.isBun()) {
      return new NodeAudioPlayer();
    }

    // Fallback to Node.js player for unknown environments
    return new NodeAudioPlayer();
  }

  /**
   * Get runtime information for debugging
   */
  static getRuntimeInfo() {
    return {
      runtime: RuntimeDetection.getRuntimeName(),
      isBrowser: RuntimeDetection.isBrowser(),
      isDeno: RuntimeDetection.isDeno(),
      isBun: RuntimeDetection.isBun(),
      isNode: RuntimeDetection.isNode(),
      hasWindow: typeof window !== 'undefined',
      hasDocument: typeof document !== 'undefined',
      hasProcess: typeof process !== 'undefined',
    };
  }
}
