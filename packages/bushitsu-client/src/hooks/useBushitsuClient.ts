import { useEffect, useRef, useState, useCallback } from 'react';
import { BushitsuClient } from '../client/BushitsuClient';
import type { BushitsuClientOptions } from '../client/types';
import type {
  UseBushitsuClientOptions,
  UseBushitsuClientReturn,
} from '../types';
import {
  WEBSOCKET_RATE_LIMIT_WINDOW,
  WEBSOCKET_RATE_LIMIT_MAX_MESSAGES,
  WEBSOCKET_MESSAGE_DEDUP_WINDOW,
  WEBSOCKET_MESSAGE_DEDUP_MAX_SIZE,
} from '../client/constants';

/**
 * React hook for Bushitsu WebSocket chat client
 */
export function useBushitsuClient({
  serverUrl,
  room,
  userName,
  isEnabled,
  onComment,
}: UseBushitsuClientOptions): UseBushitsuClientReturn {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<BushitsuClient | null>(null);
  const onCommentRef = useRef(onComment);
  const lastMentionUserRef = useRef<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const messageCountRef = useRef<number>(0);
  const lastResetTimeRef = useRef<number>(Date.now());

  // Connection parameters reference (for stability)
  const connectionParamsRef = useRef({ serverUrl, room, userName, isEnabled });
  const isProcessingMessageRef = useRef<boolean>(false);

  // Initialization complete flag (to prevent duplicate connections)
  const isInitializedRef = useRef<boolean>(false);

  // Keep latest callback to avoid dependency array changes
  onCommentRef.current = onComment;

  // Determine if connection is needed
  const shouldConnect = useCallback(
    (params: typeof connectionParamsRef.current) => {
      return (
        params.isEnabled && params.serverUrl && params.room && params.userName
      );
    },
    [],
  );

  // Determine if connection parameters have changed
  const hasConnectionParamsChanged = useCallback(
    (
      oldParams: typeof connectionParamsRef.current,
      newParams: typeof connectionParamsRef.current,
    ) => {
      return (
        oldParams.serverUrl !== newParams.serverUrl ||
        oldParams.room !== newParams.room ||
        oldParams.userName !== newParams.userName ||
        oldParams.isEnabled !== newParams.isEnabled
      );
    },
    [],
  );

  // Establish connection
  const establishConnection = useCallback(
    async (params: typeof connectionParamsRef.current) => {
      const handleMessage = (
        text: string,
        fromUser: string,
        isMention: boolean,
      ) => {
        // Mark message processing start
        isProcessingMessageRef.current = true;

        // Highest priority: never process own messages
        if (fromUser === params.userName) {
          isProcessingMessageRef.current = false;
          return;
        }

        // Rate limiting
        const now = Date.now();
        if (now - lastResetTimeRef.current > WEBSOCKET_RATE_LIMIT_WINDOW) {
          messageCountRef.current = 0;
          lastResetTimeRef.current = now;
        }

        messageCountRef.current++;

        if (messageCountRef.current > WEBSOCKET_RATE_LIMIT_MAX_MESSAGES) {
          isProcessingMessageRef.current = false;
          return;
        }

        // Message uniqueness check (deduplication)
        const messageKey = `${fromUser}:${text}`;

        if (processedMessagesRef.current.has(messageKey)) {
          isProcessingMessageRef.current = false;
          return;
        }

        // Record as processed message (keep only latest 100)
        processedMessagesRef.current.add(messageKey);

        // Remove from processed list after some time
        setTimeout(() => {
          processedMessagesRef.current.delete(messageKey);
        }, WEBSOCKET_MESSAGE_DEDUP_WINDOW);

        if (
          processedMessagesRef.current.size > WEBSOCKET_MESSAGE_DEDUP_MAX_SIZE
        ) {
          const firstKey = processedMessagesRef.current.values().next().value;
          if (firstKey) {
            processedMessagesRef.current.delete(firstKey);
          }
        }

        // Save mention info (for later replies)
        if (isMention) {
          lastMentionUserRef.current = fromUser;
        } else {
          lastMentionUserRef.current = null;
        }

        try {
          // Execute callback
          onCommentRef.current(text, fromUser, isMention);
        } catch (error) {
          console.error('[useBushitsuClient] Error processing message:', error);
        } finally {
          // Mark message processing complete (reset after 5 seconds for safety)
          setTimeout(() => {
            isProcessingMessageRef.current = false;
          }, 5000);
        }
      };

      const handleConnectionChange = (connected: boolean) => {
        setIsConnected(connected);
      };

      const options: BushitsuClientOptions = {
        serverUrl: params.serverUrl,
        room: params.room,
        userName: params.userName,
        onReceiveMessage: handleMessage,
        onConnectionChange: handleConnectionChange,
      };

      try {
        clientRef.current = new BushitsuClient(options);
        await clientRef.current.connect();
      } catch (error) {
        setIsConnected(false);
        throw error;
      }
    },
    [],
  );

  // Disconnect client
  const disconnectClient = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    lastMentionUserRef.current = null;
    processedMessagesRef.current.clear();
  }, []);

  // Main effect for connection management
  useEffect(() => {
    const newParams = { serverUrl, room, userName, isEnabled };
    const oldParams = connectionParamsRef.current;
    const isFirstRun = !isInitializedRef.current;

    // First run handling
    if (isFirstRun) {
      isInitializedRef.current = true;
      connectionParamsRef.current = newParams;

      // Connect immediately if needed (for quick reconnection after reload)
      if (shouldConnect(newParams)) {
        establishConnection(newParams).catch(console.error);
      }
      return;
    }

    // Skip if parameters haven't changed
    if (!hasConnectionParamsChanged(oldParams, newParams)) {
      return;
    }

    // Defer reconnection if message is being processed
    if (isProcessingMessageRef.current) {
      const checkAgain = () => {
        if (!isProcessingMessageRef.current) {
          connectionParamsRef.current = newParams;

          if (shouldConnect(newParams)) {
            disconnectClient();
            establishConnection(newParams).catch(console.error);
          } else {
            disconnectClient();
          }
        } else {
          // Check again after 1 second if still processing
          setTimeout(checkAgain, 1000);
        }
      };
      setTimeout(checkAgain, 1000);
      return;
    }

    // Update parameters
    connectionParamsRef.current = newParams;

    // Handle connection
    if (shouldConnect(newParams)) {
      // Disconnect existing connection
      disconnectClient();

      // Establish new connection
      establishConnection(newParams).catch(console.error);
    } else {
      // Disconnect if not needed
      disconnectClient();
    }

    // Cleanup
    return () => {
      // Only disconnect if not processing messages
      if (!isProcessingMessageRef.current) {
        disconnectClient();
      }
    };
  }, [
    serverUrl,
    room,
    userName,
    isEnabled,
    hasConnectionParamsChanged,
    shouldConnect,
    establishConnection,
    disconnectClient,
  ]);

  /**
   * Send message through WebSocket
   */
  const sendMessage = useCallback((text: string, mentionTo?: string) => {
    if (clientRef.current?.getConnectionStatus()) {
      clientRef.current.sendMessage(text, mentionTo);
    } else {
      console.warn(
        '[useBushitsuClient] WebSocket is not connected, cannot send message',
      );
    }
  }, []);

  /**
   * Get last user who mentioned us
   */
  const getLastMentionUser = useCallback((): string | null => {
    return lastMentionUserRef.current;
  }, []);

  /**
   * Reset rate limit (for emergency use)
   */
  const resetRateLimit = useCallback(() => {
    messageCountRef.current = 0;
    lastResetTimeRef.current = Date.now();
    processedMessagesRef.current.clear();
  }, []);

  /**
   * Force reconnection (for debugging)
   */
  const forceReconnect = useCallback(() => {
    const currentParams = connectionParamsRef.current;
    if (shouldConnect(currentParams)) {
      disconnectClient();
      establishConnection(currentParams).catch(console.error);
    }
  }, [shouldConnect, disconnectClient, establishConnection]);

  return {
    isConnected,
    sendMessage,
    getLastMentionUser,
    resetRateLimit,
    forceReconnect,
  };
}
