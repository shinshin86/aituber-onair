/**
 * AITuber OnAir Core type definitions
 */

/**
 * Chat message basic type
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: number;
}

/**
 * Vision block type for image content
 */
export type VisionBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image_url';
      image_url: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
      };
    };

/**
 * Message type corresponding to vision (image)
 */
export interface MessageWithVision {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | VisionBlock[];
}

/**
 * Chat type
 * - chatForm: Chat from text input
 * - youtube: Chat from YouTube comments
 * - vision: Chat from vision (image)
 */
export type ChatType = 'chatForm' | 'youtube' | 'vision';

/**
 * screenplay (text with emotion)
 */
export interface Screenplay {
  text: string;
  emotion?: string;
}
