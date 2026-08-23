import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ChatServiceFactory,
  getDefaultXaiReasoningEffort,
  isGPT5Model,
  isXaiReasoningEffortModel,
  type ChatService,
  type ChatServiceOptionsByProvider,
  type Message,
} from '@aituber-onair/core';

import {
  formatReadingForLLM,
  type TarotReading,
} from '../services/tarot/tarotClient';

/** Detecta si un comentario pide una tirada de tarot. */
function isTarotQuery(text: string): boolean {
  const lower = text.toLowerCase();
  const isQuery =
    lower.includes('tirada') ||
    lower.includes('tarot') ||
    lower.includes('cartas') ||
    lower.includes('lectura');
  if (!isQuery) return false;
  return (
    /amor|trabajo|dinero|salud|viaje|suerte|futuro|decisi/.test(lower) ||
    lower.includes('?')
  );
}
import {
  createChatServiceCommentAnalysisProvider,
  createCommentIntelligence,
  formatCommentIntelligencePrompt,
  normalizeTikTokChatComment,
  normalizeTikTokGift,
  normalizeTwitchComment,
  normalizeYouTubeComment,
  type CommentAnalysisLLMProvider,
  type CommentAnalysisMode,
  type CommentIntelligenceResult,
  type CommentPlatform,
  type LiveComment,
} from '@aituber-onair/comment-intelligence';
import type {
  TikTokChatMessage,
  TikTokGiftMessage,
} from '../services/tiktok/tiktokService';
import type { TwitchChatMessage } from '../services/twitch/twitchService';
import type { YouTubeChatMessage } from '../services/youtube/youtubeService';
import type { ChatMessage } from '../types/chat';
import type { AppSettings, ChatProviderOption } from '../types/settings';
import { useInterval } from './useInterval';

type StreamPlatform = 'youtube' | 'twitch' | 'tiktok' | 'none';
const GPT5_SAMPLE_PROVIDER_OPTIONS = { gpt5Preset: 'casual' as const };

type ProcessChat = (
  text: string,
  options?: {
    displayText?: string;
    viewerContext?: string;
  },
) => Promise<void>;

/**
 * Callback para registrar la actividad de un espectador en la memoria
 * persistente (nombre, nick, texto o regalo).
 */
export type ViewerMemoryEvent = {
  kind: 'message' | 'gift';
  handle: string;
  nickname: string;
  text?: string;
  giftName?: string;
  diamonds?: number;
  platform: string;
};

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
  streamTopic?: string;
  streamTitle?: string;
  topicFilter?: AppSettings['commentIntelligence']['topicFilter'];
  /** Perfiles de viewers para el scoring (nivel de relación, mensajes). */
  getViewerProfiles?: () => Array<
    import('@aituber-onair/comment-intelligence').ViewerProfile
  >;
  /** Contexto de memoria para inyectar en el prompt del turno. */
  getViewContext?: (handle: string, nickname: string) => string;
  /** Registro de eventos de viewers para la memoria persistente. */
  onViewerEvent?: (event: ViewerMemoryEvent) => void;
  /**
   * Orquestador de tiradas: llamado cuando un comentario es una consulta de
   * tarot. Debe disparar la tirada (anima el visor) y devolver la lectura.
   */
  onTarotQuery?: (text: string) => Promise<TarotReading>;
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
  streamTopic = '',
  streamTitle = '',
  topicFilter = 'prefer',
  getViewerProfiles,
  getViewContext,
  onViewerEvent,
  onTarotQuery,
}: UseLiveCommentIntelligenceParams) {
  const pendingCommentsRef = useRef<LiveComment[]>([]);
  const isFlushingRef = useRef(false);
  const [lastAnalysis, setLastAnalysis] =
    useState<CommentIntelligenceResult | null>(null);

  /** Emite los eventos de memoria para una lista de comentarios normalizados. */
  const emitViewerEvents = useCallback(
    (comments: LiveComment[]) => {
      if (!onViewerEvent || comments.length === 0) {
        return;
      }
      for (const comment of comments) {
        const handle =
          comment.author.handle ?? comment.author.id;
        const nickname =
          comment.author.nickname ??
          comment.author.displayName ??
          comment.author.name ??
          handle;
        const eventKind = comment.metadata?.eventKind;
        const gift = comment.metadata?.gift as
          | { name?: string; diamondCount?: number }
          | undefined;
        onViewerEvent({
          kind: eventKind === 'gift' ? 'gift' : 'message',
          handle: handle || 'unknown',
          nickname,
          text: eventKind === 'gift' ? undefined : comment.text,
          giftName: eventKind === 'gift' ? (gift?.name ?? comment.text) : undefined,
          diamonds: eventKind === 'gift' ? gift?.diamondCount : undefined,
          platform: (comment.platform ?? 'web') as string,
        });
      }
    },
    [onViewerEvent],
  );

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
          topicFilter,
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
      topicFilter,
      viewerBlockDurationMs,
    ],
  );

  const enqueue = useCallback(
    (comments: LiveComment[]) => {
      pendingCommentsRef.current.push(...comments);
      emitViewerEvents(comments);
    },
    [emitViewerEvents],
  );

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

  const enqueueTikTokComments = useCallback(
    (comments: TikTokChatMessage[]) => {
      enqueue(
        comments.map((comment) =>
          normalizeTikTokChatComment({
            id:
              comment.uniqueId && comment.comment
                ? `tiktok:${comment.uniqueId}:${comment.timestamp}:${comment.comment}`
                : undefined,
            handle: comment.uniqueId,
            nickname: comment.nickname,
            realName: undefined,
            avatarUrl: comment.profilePictureUrl,
            text: comment.comment,
            publishedAt: comment.timestamp,
            metadata: {
              userId: comment.userId,
            },
          }),
        ),
      );
    },
    [enqueue],
  );

  const enqueueTikTokGifts = useCallback(
    (gifts: TikTokGiftMessage[]) => {
      enqueue(
        gifts.map((gift) =>
          normalizeTikTokGift({
            id:
              gift.uniqueId && gift.giftName
                ? `tiktok-gift:${gift.uniqueId}:${gift.timestamp}:${gift.giftId}:${gift.repeatCount}`
                : undefined,
            handle: gift.uniqueId,
            nickname: gift.nickname,
            realName: undefined,
            avatarUrl: gift.profilePictureUrl,
            giftId: gift.giftId,
            giftName: gift.giftName,
            repeatCount: gift.repeatCount,
            repeatEnd: gift.repeatEnd,
            diamondCount: gift.diamondCount,
            text: gift.description,
            publishedAt: gift.timestamp,
            metadata: {
              userId: gift.userId,
              giftType: gift.giftType,
            },
          }),
        ),
      );
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
        viewerProfiles: getViewerProfiles?.(),
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
          topic: streamTopic.trim() || undefined,
          title: streamTitle.trim() || undefined,
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
      const displayText = `Comentario de "${authorName}": ${selected.text}`;

      const viewerHandle = selected.author.handle ?? selected.author.id;
      const viewerNickname =
        selected.author.nickname ?? selected.author.displayName ?? authorName;
      const viewerContext = viewerHandle
        ? getViewContext?.(viewerHandle, viewerNickname)
        : undefined;

      // Orquestador de tiradas: si el comentario es una consulta de tarot,
      // dispara la tirada real (anima el visor 3D vía WS) e inyecta la
      // lectura en el contexto del LLM para que la narice.
      let tarotContext: string | undefined;
      if (onTarotQuery && isTarotQuery(selected.text)) {
        try {
          const reading = await onTarotQuery(selected.text);
          tarotContext = formatReadingForLLM(reading);
        } catch (err) {
          console.warn('[tarot] la tirada falló:', err);
        }
      }

      const combinedContext = [viewerContext, tarotContext]
        .filter(Boolean)
        .join('\n\n');

      await processChat(promptForCore, {
        displayText,
        ...(combinedContext ? { viewerContext: combinedContext } : {}),
      });
    } finally {
      isFlushingRef.current = false;
    }
  }, [
    enabled,
    getViewContext,
    onTarotQuery,
    getViewerProfiles,
    intelligence,
    isProcessing,
    isSpeaking,
    maxCommentsPerBatch,
    messages,
    processChat,
    streamPlatform,
    streamTitle,
    streamTopic,
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
    enqueueTikTokComments,
    enqueueTikTokGifts,
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
        ...(provider === 'openai' && isGPT5Model(llmSettings.model)
          ? GPT5_SAMPLE_PROVIDER_OPTIONS
          : {}),
        ...(provider === 'xai' && isXaiReasoningEffortModel(llmSettings.model)
          ? {
              reasoning_effort:
                llmSettings.xaiReasoningEffort ||
                getDefaultXaiReasoningEffort(llmSettings.model) ||
                'none',
            }
          : {}),
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
