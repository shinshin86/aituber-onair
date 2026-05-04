import { useEffect, useEffectEvent } from 'react';
import {
  connectTwitchChat,
  disconnectTwitchChat,
  type TwitchChatMessage,
} from '../services/twitch/twitchService';

interface UseTwitchCommentsParams {
  twitchChannel: string;
  twitchClientId: string;
  twitchAccessToken: string;
  isEnabled: boolean;
  intervalMs: number;
  onComment: (comment: TwitchChatMessage) => void;
  onTokenExpired?: () => void;
  onError?: (message: string) => void;
}

/**
 * Connects to Twitch chat over EventSub WebSocket.
 *
 * Starts only when isEnabled and all required credentials are present.
 * Uses a WebSocket push stream with buffered dequeue delivery.
 */
export function useTwitchComments({
  twitchChannel,
  twitchClientId,
  twitchAccessToken,
  isEnabled,
  intervalMs,
  onComment,
  onTokenExpired,
  onError,
}: UseTwitchCommentsParams): void {
  const onCommentEvent = useEffectEvent((message: TwitchChatMessage) => {
    onComment(message);
  });
  const onTokenExpiredEvent = useEffectEvent(() => {
    onTokenExpired?.();
  });
  const onErrorEvent = useEffectEvent((message: string) => {
    onError?.(message);
  });

  useEffect(() => {
    if (!isEnabled || !twitchChannel || !twitchClientId || !twitchAccessToken) {
      return;
    }

    let cancelled = false;
    onErrorEvent('');

    connectTwitchChat({
      channelLogin: twitchChannel,
      pollInterval: intervalMs,
      onComment: (message) => {
        if (!cancelled) {
          onCommentEvent(message);
        }
      },
      onTokenExpired: () => {
        if (!cancelled) {
          onTokenExpiredEvent();
        }
      },
      token: twitchAccessToken,
      clientId: twitchClientId,
    }).catch((error) => {
      if (cancelled) {
        return;
      }

      console.error('Twitch connection failed:', error);
      onErrorEvent(
        error instanceof Error
          ? `Failed to receive Twitch comments: ${error.message}`
          : 'Failed to receive Twitch comments.',
      );
    });

    return () => {
      cancelled = true;
      disconnectTwitchChat();
    };
  }, [intervalMs, isEnabled, twitchAccessToken, twitchChannel, twitchClientId]);
}
