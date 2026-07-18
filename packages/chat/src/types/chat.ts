/**
 * AITuber OnAir Core type definitions
 */

import type { ChatCompletionToolCall } from './toolChat';

/**
 * Chat message basic type
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: number;
  /** Provider reasoning state that must be preserved for some models. */
  reasoning_content?: string;
  /** OpenAI-compatible assistant tool calls. */
  tool_calls?: ChatCompletionToolCall[];
  /** OpenAI-compatible tool result reference. */
  tool_call_id?: string;
  /** Optional message or tool name. */
  name?: string;
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
export interface MessageWithVision extends Omit<Message, 'content'> {
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
