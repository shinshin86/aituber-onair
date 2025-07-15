import { useCallback } from 'react';
import type {
  BushitsuInitiativeOptions,
  UseBushitsuInitiativeReturn,
} from '../types';

// Default priority value (equivalent to announcement priority in original code)
const DEFAULT_PRIORITY = 1;

/**
 * React hook for Bushitsu initiative features with priority-based execution.
 *
 * This hook is designed for AI streaming applications where tasks need to be executed
 * in order of importance. It integrates with external priority queue systems to manage
 * task execution order, ensuring that user responses get higher priority than announcements.
 *
 * @example
 * ```typescript
 * // Basic usage (immediate execution)
 * const { sendInitiativeMessage } = useBushitsuInitiative({
 *   enabled: true,
 *   serverUrl: 'ws://localhost:8080',
 *   room: 'stream',
 *   userName: 'AITuber',
 *   sendMessage: chatClient.sendMessage
 * });
 *
 * // Advanced usage with priority queue
 * const { sendInitiativeMessage } = useBushitsuInitiative({
 *   enabled: true,
 *   serverUrl: 'ws://localhost:8080',
 *   room: 'stream',
 *   userName: 'AITuber',
 *   sendMessage: chatClient.sendMessage,
 *   priority: 2, // Higher priority for user responses
 *   runWithPriority: (priority, task) => {
 *     priorityQueue.add(task, priority);
 *   },
 *   onProcessMessage: async (message) => {
 *     await voiceService.speak(message);
 *   }
 * });
 * ```
 */
export function useBushitsuInitiative({
  enabled,
  serverUrl,
  room,
  userName,
  sendMessage,
  onProcessMessage,
  runWithPriority,
  priority = DEFAULT_PRIORITY,
}: BushitsuInitiativeOptions): UseBushitsuInitiativeReturn {
  /**
   * Send initiative message with optional voice synthesis and priority handling.
   *
   * This function respects the priority system for AI streaming applications:
   * - If `runWithPriority` is provided, the task is queued with the specified priority
   * - If not provided, the task executes immediately
   *
   * @param message Message to send
   * @param mentionTo User to mention (optional)
   * @param skipVoice Skip voice synthesis if true
   *
   * @example
   * ```typescript
   * // Send high-priority user response
   * await sendInitiativeMessage('Thanks for the question!');
   *
   * // Send with mention
   * await sendInitiativeMessage('Hello there!', 'username');
   *
   * // Send without voice synthesis
   * await sendInitiativeMessage('Quick text message', undefined, true);
   * ```
   */
  const sendInitiativeMessage = useCallback(
    async (message: string, mentionTo?: string, skipVoice: boolean = false) => {
      // Basic validation
      if (!enabled || !message.trim()) {
        console.warn(
          '[BushitsuInitiative] Message sending skipped: disabled or empty message',
        );
        return;
      }

      if (!sendMessage) {
        console.warn('[BushitsuInitiative] sendMessage function not provided');
        return;
      }

      // Task to execute with priority (combines chat + voice synthesis)
      const task = async () => {
        try {
          // Execute voice synthesis first if needed
          if (!skipVoice && onProcessMessage) {
            await onProcessMessage(message);
          }

          // Send message via WebSocket
          sendMessage(message, mentionTo);
        } catch (error) {
          console.error(
            '[BushitsuInitiative] Failed to send initiative message:',
            error,
          );
          throw error;
        }
      };

      // Execute with priority management if available (for AI streaming)
      if (runWithPriority) {
        // Queue the task with the specified priority
        // Higher priority tasks (user responses) execute before lower priority ones (announcements)
        runWithPriority(priority, task);
      } else {
        // Execute immediately if no priority system is configured
        await task();
      }
    },
    [enabled, sendMessage, onProcessMessage, runWithPriority, priority],
  );

  /**
   * Send message directly without voice synthesis
   * @param message Message to send
   * @param mentionTo User to mention (optional)
   */
  const sendDirectMessage = useCallback(
    async (message: string, mentionTo?: string) => {
      await sendInitiativeMessage(message, mentionTo, true);
    },
    [sendInitiativeMessage],
  );

  /**
   * Check if message can be sent
   */
  const canSendMessage = useCallback(() => {
    return enabled && !!sendMessage && !!serverUrl && !!room && !!userName;
  }, [enabled, sendMessage, serverUrl, room, userName]);

  /**
   * Create periodic task function (for future extensions)
   * @param message Message to send periodically
   * @param mentionTo User to mention (optional)
   */
  const createPeriodicTask = useCallback(
    (message: string, mentionTo?: string) => {
      return async () => {
        if (canSendMessage()) {
          await sendInitiativeMessage(message, mentionTo);
        }
      };
    },
    [canSendMessage, sendInitiativeMessage],
  );

  return {
    // Basic sending functions
    sendInitiativeMessage,
    sendDirectMessage,

    // Status check
    canSendMessage,

    // For future extensions
    createPeriodicTask,

    // Configuration info
    isEnabled: enabled,
    connectionInfo: {
      serverUrl,
      room,
      userName,
    },
  };
}
