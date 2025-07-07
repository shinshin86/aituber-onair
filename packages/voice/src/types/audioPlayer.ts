/**
 * Audio player interface for cross-platform audio playback
 */
export interface AudioPlayer {
  /**
   * Play audio from ArrayBuffer
   * @param audioBuffer Audio data as ArrayBuffer
   * @param audioElementId Optional HTML element ID for browser environments
   * @returns Promise that resolves when playback completes
   */
  play(audioBuffer: ArrayBuffer, audioElementId?: string): Promise<void>;

  /**
   * Stop current audio playback
   */
  stop(): void;

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean;

  /**
   * Set callback for when playback completes
   */
  setOnComplete(callback: () => void): void;

  /**
   * Clean up resources
   */
  dispose(): void;
}