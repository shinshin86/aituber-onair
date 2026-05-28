import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ChatServiceFactory,
  type ChatService,
  type ChatServiceOptionsByProvider,
  type Message,
} from '@aituber-onair/core';
import {
  createChatServiceCommentAnalysisProvider,
  createCommentIntelligence,
  formatCommentIntelligencePrompt,
  normalizeTwitchComment,
  normalizeYouTubeComment,
  type CommentAnalysisLLMProvider,
  type CommentAnalysisMode,
  type CommentIntelligenceResult,
  type CommentPlatform,
  type LiveComment,
} from '@aituber-onair/comment-intelligence';
import type { TwitchChatMessage } from '../services/twitch/twitchService';
import type { YouTubeChatMessage } from '../services/youtube/youtubeService';
import type { ChatMessage } from '../types/chat';
import type { AppSettings, ChatProviderOption } from '../types/settings';
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
  llmSettings: AppSettings['llm'];
  getApiKeyForProvider: (provider: ChatProviderOption) => string;
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
  llmSettings,
  getApiKeyForProvider,
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

  const llmProvider = useMemo(
    () =>
      mode === 'rules'
        ? undefined
        : createAnalysisProviderFromLLMSettings(
            llmSettings,
            getApiKeyForProvider,
          ),
    [getApiKeyForProvider, llmSettings, mode],
  );

  const intelligence = useMemo(
    () =>
      createCommentIntelligence({
        analysis: {
          mode,
          llmProvider,
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
      llmProvider,
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

function createAnalysisProviderFromLLMSettings(
  llmSettings: AppSettings['llm'],
  getApiKeyForProvider: (provider: ChatProviderOption) => string,
): CommentAnalysisLLMProvider | undefined {
  try {
    if (llmSettings.provider === 'gemini-nano') {
      const chatService = ChatServiceFactory.createChatService('gemini-nano', {
        ...(llmSettings.model ? { model: llmSettings.model } : {}),
      });
      return createChatServiceCommentAnalysisProvider(
        toCommentAnalysisChatService(chatService),
      );
    }

    const apiKey = getApiKeyForProvider(llmSettings.provider).trim();

    if (llmSettings.provider === 'openai-compatible') {
      const endpoint = llmSettings.endpoint?.trim();
      const model = llmSettings.model.trim() || 'local-model';
      if (!endpoint) {
        return undefined;
      }

      const chatService = ChatServiceFactory.createChatService(
        'openai-compatible',
        { apiKey, model, endpoint },
      );
      return createChatServiceCommentAnalysisProvider(
        toCommentAnalysisChatService(chatService),
      );
    }

    if (!apiKey) {
      return undefined;
    }

    const provider = llmSettings.provider;
    const chatService = ChatServiceFactory.createChatService(
      provider,
      {
        apiKey,
        model: llmSettings.model,
      } as ChatServiceOptionsByProvider[typeof provider],
    );
    return createChatServiceCommentAnalysisProvider(
      toCommentAnalysisChatService(chatService),
    );
  } catch {
    console.warn('Failed to create comment analysis provider.');
    return undefined;
  }
}

function toCommentAnalysisChatService(
  chatService: ChatService,
): Parameters<typeof createChatServiceCommentAnalysisProvider>[0] {
  return {
    chatOnce(messages, stream, onPartialResponse, maxTokens) {
      return chatService.chatOnce(
        messages as Message[],
        stream,
        onPartialResponse,
        maxTokens,
      );
    },
    processChat(messages, onPartialResponse, onCompleteResponse) {
      return chatService.processChat(
        messages as Message[],
        onPartialResponse,
        onCompleteResponse,
      );
    },
  };
}
