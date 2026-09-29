import {
  type CommentAnalysisLLMProvider,
  type CommentAnalysisMode,
  type CommentIntelligenceResult,
  type CommentPlatform,
  type LiveComment,
  createChatServiceCommentAnalysisProvider,
  createCommentIntelligence,
  createJevCommentAnalysisProvider,
  formatCommentIntelligencePrompt,
  normalizeTwitchComment,
  normalizeYouTubeComment,
} from '@aituber-onair/comment-intelligence';
import {
  type ChatService,
  ChatServiceFactory,
  type ChatServiceOptionsByProvider,
  type Message,
  getDefaultXaiReasoningEffort,
  isOpenAIReasoningModel,
  isXaiReasoningEffortModel,
} from '@aituber-onair/core';
import { useCallback, useMemo, useRef, useState } from 'react';
import { type BondIdentity, createBondIdentity } from '../lib/kizunaBond';
import type { TwitchChatMessage } from '../services/twitch/twitchService';
import type { YouTubeChatMessage } from '../services/youtube/youtubeService';
import type { ChatMessage } from '../types/chat';
import type { AppSettings, ChatProviderOption } from '../types/settings';
import { useInterval } from './useInterval';

type StreamPlatform = 'youtube' | 'twitch' | 'none';
const GPT5_SAMPLE_PROVIDER_OPTIONS = { gpt5Preset: 'casual' as const };

type ProcessChat = (
  text: string,
  options?: {
    displayText?: string;
    bondIdentity?: BondIdentity;
    bondMessage?: string;
    bondAlreadyRecorded?: boolean;
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
  streamTopic?: string;
  streamTitle?: string;
  topicFilter?: AppSettings['commentIntelligence']['topicFilter'];
  /** Analyze with the LLM tab's model (default) or with Jev. */
  analysisEngine?: AppSettings['commentIntelligence']['analysisEngine'];
  jevTransport?: AppSettings['commentIntelligence']['jevTransport'];
  jevApiKey?: string;
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
  analysisEngine = 'llm',
  jevTransport = 'openrouter',
  jevApiKey = '',
}: UseLiveCommentIntelligenceParams) {
  const pendingCommentsRef = useRef<LiveComment[]>([]);
  const isFlushingRef = useRef(false);
  const flareRef = useRef<FlareState>({ reports: [], lastAlertAt: 0 });
  const [lastAnalysis, setLastAnalysis] =
    useState<CommentIntelligenceResult | null>(null);

  const llmProvider = useMemo(
    () =>
      mode === 'rules'
        ? undefined
        : analysisEngine === 'jev'
          ? createJevAnalysisProvider(jevTransport, jevApiKey)
          : createAnalysisProviderFromLLMSettings(
              llmSettings,
              getApiKeyForProvider,
            ),
    [
      analysisEngine,
      getApiKeyForProvider,
      jevApiKey,
      jevTransport,
      llmSettings,
      mode,
    ],
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
          topic: streamTopic.trim() || undefined,
          title: streamTitle.trim() || undefined,
          language: 'ja',
        },
      });

      setLastAnalysis(result);
      reportModeratorAlerts(result, flareRef.current);

      const selected = result.selectedComments[0];
      if (!selected) {
        return;
      }
      // A moderator handles safety risks; the avatar does not read them out.
      if (
        result.responsePlans?.some(
          (plan) => plan.commentId === selected.id && plan.notifyModerator,
        )
      ) {
        return;
      }

      const promptForCore = formatCommentIntelligencePrompt(result);
      const authorName = selected.author.displayName ?? selected.author.name;
      const displayText = `「${authorName}」さんのコメント: ${selected.text}`;
      const bondSource = selected.platform === 'twitch' ? 'twitch' : 'youtube';

      await processChat(promptForCore, {
        displayText,
        bondIdentity: createBondIdentity(bondSource, authorName),
        bondMessage: selected.text,
        bondAlreadyRecorded: true,
      });
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
    flush,
    lastAnalysis,
  };
}

type ModeratorAlert =
  | {
      kind: 'safety-risk';
      commentId: string;
      authorName: string;
      text: string;
    }
  | {
      kind: 'flare-up';
      errorReports: number;
      viewers: number;
      windowMs: number;
    };

type FlareState = {
  reports: Array<{ viewerId: string; at: number }>;
  lastAlertAt: number;
};

/** Error reports from this many viewers within the window mean a flare-up. */
const FLARE_WINDOW_MS = 2 * 60 * 1000;
const FLARE_MIN_VIEWERS = 3;
const FLARE_ALERT_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Mock moderator notification: this sample only logs the alert.
 *
 * To notify for real, send the alert from here to your own backend, which
 * forwards it to Discord, Slack, or a moderation queue. Keep webhook URLs and
 * tokens on that server, never in this browser app. For example:
 *
 *   await fetch('/api/moderator-alerts', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(alert),
 *   });
 */
async function notifyModerator(alert: ModeratorAlert): Promise<void> {
  console.info('[moderator alert: mock, not sent]', alert);
}

function reportModeratorAlerts(
  result: CommentIntelligenceResult,
  flare: FlareState,
  now = Date.now(),
) {
  const plans = result.responsePlans;
  if (!plans) {
    return;
  }
  const commentsById = new Map(
    result.rankedComments.map((comment) => [comment.id, comment]),
  );
  for (const plan of plans) {
    const comment = commentsById.get(plan.commentId);
    if (!comment) {
      continue;
    }
    // Only real-world safety risks escalate; rude comments do not.
    if (plan.notifyModerator) {
      void notifyModerator({
        kind: 'safety-risk',
        commentId: comment.id,
        authorName: comment.author.displayName ?? comment.author.name,
        text: comment.text,
      });
    }
    if (plan.pointsOutError) {
      flare.reports.push({ viewerId: comment.author.id, at: now });
    }
  }
  // Jev judges each comment; counting reports over time stays in code.
  flare.reports = flare.reports.filter(
    (report) => now - report.at <= FLARE_WINDOW_MS,
  );
  const viewers = new Set(flare.reports.map((report) => report.viewerId)).size;
  if (
    viewers >= FLARE_MIN_VIEWERS &&
    now - flare.lastAlertAt >= FLARE_ALERT_COOLDOWN_MS
  ) {
    flare.lastAlertAt = now;
    void notifyModerator({
      kind: 'flare-up',
      errorReports: flare.reports.length,
      viewers,
      windowMs: FLARE_WINDOW_MS,
    });
  }
}

function createJevAnalysisProvider(
  transport: AppSettings['commentIntelligence']['jevTransport'],
  apiKey: string,
): CommentAnalysisLLMProvider | undefined {
  const key = apiKey.trim();
  if (!key) {
    return undefined;
  }
  try {
    return createJevCommentAnalysisProvider({
      transport,
      apiKey: key,
      responsePlan: true,
      // TypeSafe AI rejects browser origins, so the Vite dev server forwards
      // this path. Production apps should call Jev from their own backend.
      ...(transport === 'typesafe'
        ? {
            fetch: (_url: RequestInfo | URL, init?: RequestInit) =>
              fetch('/api/typesafe/systemone', init),
          }
        : {}),
    });
  } catch {
    console.warn('Failed to create Jev comment analysis provider.');
    return undefined;
  }
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
    const chatService = ChatServiceFactory.createChatService(provider, {
      apiKey,
      model: llmSettings.model,
      ...(provider === 'openai' && isOpenAIReasoningModel(llmSettings.model)
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
    } as ChatServiceOptionsByProvider[typeof provider]);
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
