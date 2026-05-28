import type { CommentIntelligenceConfig } from './types/config';
import type { LLMCommentAnalysisResult } from './types/llm';
import type {
  AnalyzeCommentsInput,
  CommentIntelligenceResult,
} from './types/result';
import type { SafetyCategory, SafetyReport } from './types/safety';
import type { ViewerSafetyState } from './types/viewer';
import { buildInstruction } from './context/buildInstruction';
import { buildLLMContext } from './context/buildLLMContext';
import { rankComments } from './ranking/rankComments';
import { ruleBasedSafetyProvider } from './safety/ruleBasedSafetyProvider';
import { summarizeIgnoredComments } from './summarization/summarizeIgnoredComments';
import type { RankedComment } from './types/ranking';

const defaultConfig: CommentIntelligenceConfig = {
  analysis: {
    mode: 'rules',
    llmPolicy: {
      minComments: 8,
      timeoutMs: 3000,
      fallbackToRules: true,
    },
  },
  safety: {
    enabled: true,
    ignoreHighRisk: true,
    ignoreMediumRisk: true,
    blockPromptInjection: true,
    blockUrls: false,
  },
  ranking: {
    strategy: 'balanced',
    maxSelectedComments: 1,
    minScore: 0.3,
  },
  summary: {
    enabled: true,
    includeIgnoredSummary: true,
    maxExamplesPerCluster: 3,
  },
  context: {
    language: 'ja',
    style: 'aituber-live',
  },
  viewerSafety: {
    enabled: true,
    blockOnHighRisk: true,
    blockDurationMs: 10 * 60 * 1000,
    violationThreshold: 1,
  },
};

export function createCommentIntelligence(config?: CommentIntelligenceConfig) {
  const baseConfig = mergeConfig(defaultConfig, config);
  const viewerSafetyStates = new Map<string, ViewerSafetyState>();

  return {
    async analyze(
      input: AnalyzeCommentsInput
    ): Promise<CommentIntelligenceResult> {
      const mergedConfig = mergeConfig(baseConfig, input.options);
      return analyzeWithConfig(input, mergedConfig, viewerSafetyStates);
    },
    getViewerSafetyState(viewerId: string): ViewerSafetyState | undefined {
      const state = viewerSafetyStates.get(viewerId);
      return state
        ? { ...state, categories: [...state.categories] }
        : undefined;
    },
    resetViewerSafetyState(viewerId?: string): void {
      if (viewerId) {
        viewerSafetyStates.delete(viewerId);
        return;
      }
      viewerSafetyStates.clear();
    },
  };
}

export async function analyzeComments(
  input: AnalyzeCommentsInput & { config?: CommentIntelligenceConfig }
): Promise<CommentIntelligenceResult> {
  return createCommentIntelligence(input.config).analyze(input);
}

function mergeConfig(
  base: CommentIntelligenceConfig,
  override?: Partial<CommentIntelligenceConfig>
): CommentIntelligenceConfig {
  return {
    analysis: {
      ...base.analysis,
      ...override?.analysis,
      llmPolicy: {
        ...base.analysis?.llmPolicy,
        ...override?.analysis?.llmPolicy,
      },
    },
    safety: { ...base.safety, ...override?.safety },
    ranking: {
      ...base.ranking,
      ...override?.ranking,
      weights: {
        ...base.ranking?.weights,
        ...override?.ranking?.weights,
      },
    },
    summary: { ...base.summary, ...override?.summary },
    context: { ...base.context, ...override?.context },
    viewerSafety: { ...base.viewerSafety, ...override?.viewerSafety },
  };
}

async function analyzeWithConfig(
  input: AnalyzeCommentsInput,
  config: CommentIntelligenceConfig,
  viewerSafetyStates: Map<string, ViewerSafetyState>
): Promise<CommentIntelligenceResult> {
  const rulesResult = buildRulesResult(
    input,
    config,
    false,
    viewerSafetyStates
  );
  const llmProvider = config.analysis?.llmProvider;
  const mode = config.analysis?.mode ?? 'rules';
  const shouldUseLLM =
    Boolean(llmProvider) &&
    (mode === 'llm-assisted' ||
      (mode === 'hybrid' &&
        input.comments.length >=
          (config.analysis?.llmPolicy?.minComments ?? 8)));

  if (!shouldUseLLM || !llmProvider) {
    return rulesResult;
  }

  try {
    const llmComments = input.comments.slice(
      0,
      config.analysis?.llmPolicy?.maxComments ?? input.comments.length
    );
    const llmResult = await withOptionalTimeout(
      llmProvider.analyze({
        comments: llmComments,
        streamState: input.streamState,
        recentMessages: input.recentMessages ?? input.recentAiMessages,
        recentAiMessages: input.recentAiMessages ?? input.recentMessages,
      }),
      config.analysis?.llmPolicy?.timeoutMs
    );
    return applyLLMResult(
      rulesResult,
      llmResult,
      mode,
      new Set(llmComments.map((comment) => comment.id))
    );
  } catch (error) {
    if (config.analysis?.llmPolicy?.fallbackToRules === false) {
      throw error;
    }
    return rulesResult;
  }
}

function buildRulesResult(
  input: AnalyzeCommentsInput,
  config: CommentIntelligenceConfig,
  usedLLM: boolean,
  viewerSafetyStates: Map<string, ViewerSafetyState>
): CommentIntelligenceResult {
  pruneExpiredViewerBlocks(viewerSafetyStates);

  let safetyReports = input.comments.map((comment) =>
    ruleBasedSafetyProvider.check(comment, config.safety)
  );
  updateViewerSafetyStates(input, safetyReports, config, viewerSafetyStates);
  safetyReports = addViewerBlockedReports(
    input,
    safetyReports,
    config,
    viewerSafetyStates
  );
  const { rankedComments, selectedComments } = rankComments({
    comments: input.comments,
    safetyReports,
    viewerProfiles: input.viewerProfiles,
    viewerSafetyStates: [...viewerSafetyStates.values()],
    streamState: input.streamState,
    config: config.ranking,
  });
  const selectedIds = new Set(selectedComments.map((comment) => comment.id));
  const ignoredComments = input.comments.filter(
    (comment) => !selectedIds.has(comment.id)
  );
  const language = input.streamState?.language ?? config.context?.language;
  const ignoredSummary =
    config.summary?.enabled === false
      ? {
          totalCount: ignoredComments.length,
          summary: '',
          clusters: [],
        }
      : summarizeIgnoredComments({
          comments: ignoredComments,
          language,
          maxExamplesPerCluster: config.summary?.maxExamplesPerCluster,
        });
  if (config.summary?.includeIgnoredSummary === false) {
    ignoredSummary.summary = '';
  }
  const result: CommentIntelligenceResult = {
    selectedComments,
    rankedComments,
    ignoredComments,
    ignoredSummary,
    safetyReports,
    contextForLLM: [],
    instructionForLLM: '',
    debug: {
      mode: config.analysis?.mode ?? 'rules',
      usedLLM,
      analyzedCommentCount: input.comments.length,
      selectedCommentIds: selectedComments.map((comment) => comment.id),
      blockedViewerIds: getBlockedViewerIds(viewerSafetyStates),
    },
  };
  result.contextForLLM = buildLLMContext(result, language);
  result.instructionForLLM = buildDefaultInstruction(result, language);

  return result;
}

function applyLLMResult(
  rulesResult: CommentIntelligenceResult,
  llmResult: LLMCommentAnalysisResult,
  mode: CommentIntelligenceResult['debug'] extends infer Debug
    ? Debug extends { mode: infer Mode }
      ? Mode
      : never
    : never,
  llmCommentIds: Set<string>
): CommentIntelligenceResult {
  const safetyReports = mergeLLMSafetyFlags(
    rulesResult.safetyReports,
    llmResult,
    llmCommentIds
  );
  const rankedById = new Map(
    rulesResult.rankedComments.map((comment) => [comment.id, comment])
  );
  const selectedFromLLM =
    llmResult.selectedCommentIds
      ?.filter((id) => llmCommentIds.has(id))
      ?.map((id) => rankedById.get(id))
      .filter((comment): comment is RankedComment => Boolean(comment))
      .filter((comment) => {
        const report = safetyReports.find(
          (safetyReport) => safetyReport.commentId === comment.id
        );
        return !report?.shouldIgnore;
      }) ?? [];
  const selectedComments =
    selectedFromLLM.length > 0
      ? selectedFromLLM.slice(0, rulesResult.selectedComments.length || 1)
      : rulesResult.selectedComments;
  const selectedIds = new Set(selectedComments.map((comment) => comment.id));
  const ignoredComments = rulesResult.rankedComments.filter(
    (comment) => !selectedIds.has(comment.id)
  );
  const contextForLLM = [
    ...rulesResult.contextForLLM,
    ...(llmResult.contextForLLM ?? []),
  ];
  const instructionForLLM =
    llmResult.instructionForLLM ?? rulesResult.instructionForLLM;
  const ignoredSummary = llmResult.ignoredSummary
    ? {
        ...rulesResult.ignoredSummary,
        summary: llmResult.ignoredSummary,
      }
    : rulesResult.ignoredSummary;

  return {
    ...rulesResult,
    selectedComments,
    ignoredComments,
    ignoredSummary,
    safetyReports,
    contextForLLM: [...new Set(contextForLLM)],
    instructionForLLM,
    debug: {
      mode,
      usedLLM: true,
      analyzedCommentCount: rulesResult.debug?.analyzedCommentCount ?? 0,
      selectedCommentIds: selectedComments.map((comment) => comment.id),
      blockedViewerIds: rulesResult.debug?.blockedViewerIds ?? [],
    },
  };
}

function mergeLLMSafetyFlags(
  safetyReports: SafetyReport[],
  llmResult: LLMCommentAnalysisResult,
  llmCommentIds: Set<string>
): SafetyReport[] {
  const byId = new Map(
    safetyReports.map((report) => [report.commentId, report])
  );

  for (const flag of llmResult.safetyFlags ?? []) {
    if (!llmCommentIds.has(flag.commentId)) {
      continue;
    }

    const category = normalizeSafetyCategory(flag.category);
    const existing = byId.get(flag.commentId);
    byId.set(flag.commentId, {
      commentId: flag.commentId,
      riskLevel: 'high',
      categories: [...new Set([...(existing?.categories ?? []), category])],
      shouldIgnore: true,
      reason: flag.reason,
    });
  }

  return [...byId.values()];
}

function normalizeSafetyCategory(category: string): SafetyCategory {
  const known: SafetyCategory[] = [
    'prompt_injection',
    'hostile_feedback',
    'personal_info',
    'harassment',
    'sexual',
    'violence',
    'spam',
    'url',
    'repetition',
    'viewer_blocked',
    'unknown',
  ];

  return known.includes(category as SafetyCategory)
    ? (category as SafetyCategory)
    : 'unknown';
}

function updateViewerSafetyStates(
  input: AnalyzeCommentsInput,
  safetyReports: SafetyReport[],
  config: CommentIntelligenceConfig,
  viewerSafetyStates: Map<string, ViewerSafetyState>
): void {
  if (config.viewerSafety?.enabled === false) {
    return;
  }

  const commentsById = new Map(
    input.comments.map((comment) => [comment.id, comment])
  );
  const violationThreshold = config.viewerSafety?.violationThreshold ?? 1;
  const shouldBlockOnHighRisk = config.viewerSafety?.blockOnHighRisk !== false;
  const blockDurationMs =
    config.viewerSafety?.blockDurationMs ?? 10 * 60 * 1000;

  for (const report of safetyReports) {
    if (report.riskLevel !== 'high' || !report.shouldIgnore) {
      continue;
    }

    const comment = commentsById.get(report.commentId);
    if (!comment) {
      continue;
    }

    const existing = viewerSafetyStates.get(comment.author.id);
    const violationCount = (existing?.violationCount ?? 0) + 1;
    const shouldBlock =
      shouldBlockOnHighRisk || violationCount >= violationThreshold;

    viewerSafetyStates.set(comment.author.id, {
      viewerId: comment.author.id,
      violationCount,
      lastViolationAt: Date.now(),
      blockedUntil: shouldBlock ? Date.now() + blockDurationMs : undefined,
      categories: [
        ...new Set([...(existing?.categories ?? []), ...report.categories]),
      ],
    });
  }
}

function addViewerBlockedReports(
  input: AnalyzeCommentsInput,
  safetyReports: SafetyReport[],
  config: CommentIntelligenceConfig,
  viewerSafetyStates: Map<string, ViewerSafetyState>
): SafetyReport[] {
  if (config.viewerSafety?.enabled === false) {
    return safetyReports;
  }

  const byCommentId = new Map(
    safetyReports.map((report) => [report.commentId, report])
  );

  for (const comment of input.comments) {
    const viewerState = viewerSafetyStates.get(comment.author.id);
    if (!isViewerBlocked(viewerState)) {
      continue;
    }

    const existing = byCommentId.get(comment.id);
    if (existing?.shouldIgnore) {
      continue;
    }

    byCommentId.set(comment.id, {
      commentId: comment.id,
      riskLevel: 'high',
      categories: ['viewer_blocked'],
      shouldIgnore: true,
      reason: 'viewer is blocked due to previous unsafe comments',
    });
  }

  return [...byCommentId.values()];
}

function pruneExpiredViewerBlocks(
  viewerSafetyStates: Map<string, ViewerSafetyState>
): void {
  for (const [viewerId, state] of viewerSafetyStates.entries()) {
    if (state.blockedUntil !== undefined && state.blockedUntil <= Date.now()) {
      viewerSafetyStates.delete(viewerId);
    }
  }
}

function getBlockedViewerIds(
  viewerSafetyStates: Map<string, ViewerSafetyState>
): string[] {
  return [...viewerSafetyStates.values()]
    .filter((state) => isViewerBlocked(state))
    .map((state) => state.viewerId);
}

function isViewerBlocked(state?: ViewerSafetyState): boolean {
  return Boolean(
    state &&
      (state.blockedUntil === undefined || state.blockedUntil > Date.now())
  );
}

function buildDefaultInstruction(
  result: CommentIntelligenceResult,
  language?: 'ja' | 'en' | 'auto'
): string {
  const selected = result.selectedComments[0];
  if (!selected) {
    return buildInstruction(result, language);
  }

  const resolvedLanguage = language === 'en' ? 'en' : 'ja';
  const hasFirstTimeViewer = result.ignoredSummary.clusters.some(
    (cluster) => cluster.label === 'first_time_viewer'
  );
  if (hasFirstTimeViewer) {
    return resolvedLanguage === 'ja'
      ? '初見の視聴者にも分かるように、歓迎しつつ今日の配信内容を短く説明してください。'
      : "Welcome first-time viewers and briefly explain today's stream so they can follow along.";
  }

  return resolvedLanguage === 'ja'
    ? '選ばれたコメントに短く自然に返答し、配信のテンポを保ってください。'
    : 'Reply briefly and naturally to the selected comment, and keep the stream moving.';
}

async function withOptionalTimeout<T>(
  promise: Promise<T>,
  timeoutMs?: number
): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error('Comment analysis timed out')),
        timeoutMs
      );
    }),
  ]);
}
