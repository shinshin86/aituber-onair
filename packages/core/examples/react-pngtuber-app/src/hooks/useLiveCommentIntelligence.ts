import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createCommentIntelligence,
  formatCommentIntelligencePrompt,
  normalizeTwitchComment,
  normalizeYouTubeComment,
  type CommentAnalysisMode,
  type CommentIntelligenceResult,
  type CommentPlatform,
  type LiveComment,
} from '@aituber-onair/comment-intelligence';
import type { TwitchChatMessage } from '../services/twitch/twitchService';
import type { YouTubeChatMessage } from '../services/youtube/youtubeService';
import type { ChatMessage } from '../types/chat';
import { useInterval } from './useInterval';

type StreamPlatform = 'youtube' | 'twitch' | 'none';

type ProcessChat = (
  text: string,
  options?: {
    displayText?: string;
  },
) => Promise<void>;

type UseLiveCommentIntelligenceParams = {
  messages: ChatMessage[];
  isProcessing: boolean;
  isSpeaking: boolean;
  processChat: ProcessChat;
  streamPlatform: StreamPlatform;
  enabled?: boolean;
  mode?: CommentAnalysisMode;
  analysisIntervalMs?: number;
  maxCommentsPerBatch?: number;
  minCommentsForLLMAnalysis?: number;
  blockHighRiskViewers?: boolean;
  viewerBlockDurationMs?: number;
};

export function useLiveCommentIntelligence({
  messages,
  isProcessing,
  isSpeaking,
  processChat,
  streamPlatform,
  enabled = true,
  mode = 'rules',
  analysisIntervalMs = 1000,
  maxCommentsPerBatch = 50,
  minCommentsForLLMAnalysis = 8,
  blockHighRiskViewers = true,
  viewerBlockDurationMs = 10 * 60 * 1000,
}: UseLiveCommentIntelligenceParams) {
  const pendingCommentsRef = useRef<LiveComment[]>([]);
  const isFlushingRef = useRef(false);
  const [lastAnalysis, setLastAnalysis] =
    useState<CommentIntelligenceResult | null>(null);

  const intelligence = useMemo(
    () =>
      createCommentIntelligence({
        analysis: {
          mode,
          llmPolicy: {
            minComments: minCommentsForLLMAnalysis,
            fallbackToRules: true,
          },
        },
        safety: {
          enabled: true,
          ignoreHighRisk: true,
          blockPromptInjection: true,
          blockUrls: true,
        },
        ranking: {
          strategy: 'balanced',
          maxSelectedComments: 1,
        },
        summary: {
          enabled: true,
          includeIgnoredSummary: true,
        },
        viewerSafety: {
          enabled: true,
          blockOnHighRisk: blockHighRiskViewers,
          blockDurationMs: viewerBlockDurationMs,
        },
        context: {
          language: 'ja',
          style: 'aituber-live',
        },
      }),
    [
      blockHighRiskViewers,
      minCommentsForLLMAnalysis,
      mode,
      viewerBlockDurationMs,
    ],
  );

  const enqueue = useCallback((comments: LiveComment[]) => {
    pendingCommentsRef.current.push(...comments);
  }, []);

  const enqueueYouTubeComments = useCallback(
    (comments: YouTubeChatMessage[]) => {
      enqueue(comments.map(normalizeYouTubeComment));
    },
    [enqueue],
  );

  const enqueueTwitchComments = useCallback(
    (comments: TwitchChatMessage[]) => {
      enqueue(comments.map(normalizeTwitchComment));
    },
    [enqueue],
  );

  const flush = useCallback(async () => {
    if (!enabled || isProcessing || isSpeaking || isFlushingRef.current) {
      return;
    }
    if (pendingCommentsRef.current.length === 0) {
      return;
    }

    isFlushingRef.current = true;
    try {
      const comments = pendingCommentsRef.current.splice(
        0,
        maxCommentsPerBatch,
      );
      const result = await intelligence.analyze({
        comments,
        recentMessages: messages.slice(-12).map((message) => ({
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
        })),
        streamState: {
          platform:
            streamPlatform === 'none'
              ? undefined
              : (streamPlatform as CommentPlatform),
          mode: 'live',
          language: 'ja',
        },
      });

      setLastAnalysis(result);

      const selected = result.selectedComments[0];
      if (!selected) {
        return;
      }

      const promptForCore = formatCommentIntelligencePrompt(result);
      const authorName = selected.author.displayName ?? selected.author.name;
      const displayText = `「${authorName}」さんのコメント: ${selected.text}`;

      await processChat(promptForCore, { displayText });
    } finally {
      isFlushingRef.current = false;
    }
  }, [
    enabled,
    intelligence,
    isProcessing,
    isSpeaking,
    maxCommentsPerBatch,
    messages,
    processChat,
    streamPlatform,
  ]);

  useInterval(
    () => {
      void flush();
    },
    enabled ? analysisIntervalMs : null,
  );

  return {
    enqueueYouTubeComments,
    enqueueTwitchComments,
    flush,
    lastAnalysis,
  };
}
