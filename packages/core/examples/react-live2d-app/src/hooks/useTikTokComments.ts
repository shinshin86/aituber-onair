import { useEffect, useEffectEvent } from 'react';
import {
  TikTokLiveService,
  type TikTokChatMessage,
  type TikTokGiftMessage,
} from '../services/tiktok/tiktokService';

interface UseTikTokCommentsParams {
  tiktokUniqueId: string;
  relayUrl?: string;
  isEnabled: boolean;
  onComment: (comment: TikTokChatMessage) => void;
  onGift?: (gift: TikTokGiftMessage) => void;
  onError?: (message: string) => void;
}

/**
 * Connects to TikTok LIVE chat and gift events.
 */
export function useTikTokComments({
  tiktokUniqueId,
  relayUrl,
  isEnabled,
  onComment,
  onGift,
  onError,
}: UseTikTokCommentsParams): void {
  const onCommentEvent = useEffectEvent((message: TikTokChatMessage) => {
    onComment(message);
  });
  const onGiftEvent = useEffectEvent((gift: TikTokGiftMessage) => {
    onGift?.(gift);
  });
  const onErrorEvent = useEffectEvent((message: string) => {
    onError?.(message);
  });

  useEffect(() => {
    if (!isEnabled || !tiktokUniqueId.trim()) {
      return;
    }

    let cancelled = false;
    const connection = new TikTokLiveService({
      uniqueId: tiktokUniqueId,
      relayUrl,
    });

    connection.onComment((comment) => {
      if (!cancelled) {
        onCommentEvent(comment);
      }
    });
    connection.onGift((gift) => {
      if (!cancelled) {
        onGiftEvent(gift);
      }
    });
    connection.onError((error) => {
      if (cancelled) {
        return;
      }

      const message =
        error instanceof Error
          ? `Failed to receive TikTok comments: ${error.message}`
          : 'Failed to receive TikTok comments.';
      onErrorEvent(message);
    });

    connection.startWatching(tiktokUniqueId).catch((error) => {
      if (cancelled) {
        return;
      }

      const message =
        error instanceof Error
          ? `Failed to connect to TikTok LIVE: ${error.message}`
          : 'Failed to connect to TikTok LIVE.';
      console.error('TikTok connection failed:', error);
      onErrorEvent(message);
    });

    return () => {
      cancelled = true;
      connection.stopWatching();
    };
  }, [isEnabled, onCommentEvent, onErrorEvent, onGiftEvent, tiktokUniqueId]);
}
