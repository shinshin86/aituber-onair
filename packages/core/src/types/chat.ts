/**
 * AITuber OnAir Core type definitions
 */

/**
 * Chat message basic type
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/**
 * Message type corresponding to vision (image)
 */
export interface MessageWithVision {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: {
          url: string;
          detail: 'low' | 'high';
        };
      }>;
}

/**
 * Chat type
 * - chatForm: Chat from text input
 * - youtube: Chat from YouTube comments
 * - vision: Chat from vision (image)
 */
export type ChatType = 'chatForm' | 'youtube' | 'vision';

/**
 * Screenplay (text with emotion)
 */
export interface Screenplay {
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
