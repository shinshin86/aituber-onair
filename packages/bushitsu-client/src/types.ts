// Re-export client types
export type { BushitsuMessage, BushitsuClientOptions } from './client/types';

// Hook types
export interface UseBushitsuClientOptions {
  serverUrl: string;
  room: string;
  userName: string;
  isEnabled: boolean;
  onComment: (text: string, userName: string, isMention: boolean) => void;
}

export interface UseBushitsuClientReturn {
  isConnected: boolean;
  sendMessage: (text: string, mentionTo?: string) => void;
  getLastMentionUser: () => string | null;
  resetRateLimit: () => void;
  forceReconnect: () => void;
}

// Initiative hook types
export interface BushitsuInitiativeOptions {
  enabled: boolean;
  serverUrl: string;
  room: string;
  userName: string;
  sendMessage?: (text: string, mentionTo?: string) => void;
  onProcessMessage?: (message: string) => Promise<void>;
  /**
   * Priority execution function for AI streaming applications.
   * This integrates with external priority queue systems to manage task execution order.
   *
   * @param priority - Priority level (higher numbers = higher priority)
   *                  Common values: 1 (announcements), 2 (user responses), 3 (urgent)
   * @param task - The task to execute (chat message + optional voice synthesis)
   *
   * @example
   * ```typescript
   * // Integration with priority queue
   * runWithPriority: (priority, task) => {
   *   priorityQueue.add(task, priority);
   * }
   * ```
   */
  runWithPriority?: (priority: number, task: () => Promise<void>) => void;
  /**
   * Execution priority level for AI streaming task management.
   *
   * @default 1 (announcement priority)
   *
   * Common priority levels:
   * - 0: Background tasks (low priority)
   * - 1: Announcements and general messages (default)
   * - 2: User responses and interactions
   * - 3: Urgent notifications and system messages
   *
   * @example
   * ```typescript
   * // High priority for user mention responses
   * priority: 2
   *
   * // Normal priority for periodic announcements
   * priority: 1
   * ```
   */
  priority?: number;
}

export interface UseBushitsuInitiativeReturn {
  sendInitiativeMessage: (
    message: string,
    mentionTo?: string,
    skipVoice?: boolean,
  ) => Promise<void>;
  sendDirectMessage: (message: string, mentionTo?: string) => Promise<void>;
  canSendMessage: () => boolean;
  createPeriodicTask: (
    message: string,
    mentionTo?: string,
  ) => () => Promise<void>;
  isEnabled: boolean;
  connectionInfo: {
    serverUrl: string;
    room: string;
    userName: string;
  };
}
