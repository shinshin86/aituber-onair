/**
 * Chat and screenplay related types for voice package
 */

/**
 * screenplay (text with emotion)
 */
export interface ChatScreenplay {
  text: string;
  emotion?: string;
}

/**
 * Speech synthesis options
 */
export interface SpeakOptions {
  speed?: number;
  pitch?: number;
  intonation?: number;
  volumeScale?: number;
}
