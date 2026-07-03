import { useCallback, useState } from 'react';
import {
  fetchAndProcessComments,
  type YouTubeChatMessage,
} from '../services/youtube/youtubeService';
import { useInterval } from './useInterval';

interface UseYoutubeCommentsParams {
  youtubeLiveId: string;
  youtubeApiKey: string;
  isEnabled: boolean;
  intervalMs?: number;
  timeLimitMinutes?: number;
  onComment: (comment: YouTubeChatMessage) => void;
}

/**
 * Polls YouTube Live chat comments and forwards them to onComment.
 *
 * Starts only when isEnabled, the live ID, and the API key are present.
 * Respects the API-recommended pollingIntervalMillis when available.
 */
export function useYoutubeComments({
  youtubeLiveId,
  youtubeApiKey,
  isEnabled,
  intervalMs = 20_000,
  timeLimitMinutes = 10,
  onComment,
}: UseYoutubeCommentsParams): void {
  const [apiRecommendedIntervalMs, setApiRecommendedIntervalMs] = useState(0);

  const fetchComments = useCallback(async () => {
    if (!isEnabled || !youtubeLiveId || !youtubeApiKey) {
      return;
    }

    const apiRecommended = await fetchAndProcessComments(
      youtubeLiveId,
      youtubeApiKey,
      onComment,
      timeLimitMinutes,
    );

    const nextInterval = Math.max(intervalMs, apiRecommended || 0);
    setApiRecommendedIntervalMs((current) =>
      current === nextInterval ? current : nextInterval,
    );
  }, [
    intervalMs,
    isEnabled,
    onComment,
    timeLimitMinutes,
    youtubeApiKey,
    youtubeLiveId,
  ]);

  const effectiveIntervalMs = Math.max(intervalMs, apiRecommendedIntervalMs);

  useInterval(
    fetchComments,
    isEnabled && youtubeLiveId && youtubeApiKey ? effectiveIntervalMs : null,
  );
}
