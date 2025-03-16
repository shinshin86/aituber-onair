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
 * Memory storage interface for persistence
 * Implementations can use various storage mechanisms (LocalStorage, IndexedDB, files, etc.)
 */
export interface MemoryStorage {
  /**
   * Load memory records from storage
   * @returns Promise resolving to array of memory records
   */
  load(): Promise<MemoryRecord[]>;

  /**
   * Save memory records to storage
   * @param records Memory records to save
   * @returns Promise resolving when save is complete
   */
  save(records: MemoryRecord[]): Promise<void>;

  /**
   * Clear all stored memory records
   * @returns Promise resolving when clear is complete
   */
  clear(): Promise<void>;
}

/**
 * Memory record type
 */
export type MemoryType = 'short' | 'mid' | 'long';

/**
 * Memory record type
 */
export interface MemoryRecord {
  type: MemoryType;
  summary: string;
  timestamp: number;
}

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
