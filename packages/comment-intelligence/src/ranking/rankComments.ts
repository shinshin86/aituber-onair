import type { LiveComment } from '../types/comment.js';
import type { CommentIntelligenceConfig } from '../types/config.js';
import type { StreamState } from '../types/context.js';
import type { RankedComment } from '../types/ranking.js';
import type { SafetyReport } from '../types/safety.js';
import type { ViewerProfile, ViewerSafetyState } from '../types/viewer.js';
import { normalizeText } from '../utils/text.js';
import { scoreComment } from './scoring.js';
import { defaultRankingWeights, getStrategyWeights } from './strategies.js';

export type RankCommentsInput = {
  comments: LiveComment[];
  safetyReports: SafetyReport[];
  viewerProfiles?: ViewerProfile[];
  viewerSafetyStates?: ViewerSafetyState[];
  streamState?: StreamState;
  config?: NonNullable<CommentIntelligenceConfig['ranking']>;
};

export function rankComments(_input: RankCommentsInput): {
  rankedComments: RankedComment[];
  selectedComments: RankedComment[];
} {
  const input = _input;
  const config = input.config ?? {};
  const strategy = config.strategy ?? 'balanced';
  const topicFilter = config.topicFilter ?? 'prefer';
  const weights = {
    ...getStrategyWeights(strategy),
    ...config.weights,
    ...(topicFilter === 'off' ? { topicRelevance: 0 } : {}),
  };
  const safetyById = new Map(
    input.safetyReports.map((report) => [report.commentId, report])
  );
  const profilesById = new Map(
    (input.viewerProfiles ?? []).map((profile) => [profile.id, profile])
  );
  const blockedViewerIds = new Set(
    (input.viewerSafetyStates ?? [])
      .filter(
        (state) =>
          state.blockedUntil === undefined || state.blockedUntil > Date.now()
      )
      .map((state) => state.viewerId)
  );
  const seenTexts = new Map<string, number>();
  const freshestTimestamp = Math.max(
    0,
    ...input.comments.map((comment) => comment.timestamp)
  );
  const safetyPenaltyMultiplier = strategy === 'chaos-resistant' ? 1.5 : 1;

  const rankedComments = input.comments
    .map((comment) => {
      const textKey = normalizeText(comment.text);
      const duplicate = (seenTexts.get(textKey) ?? 0) > 0;
      seenTexts.set(textKey, (seenTexts.get(textKey) ?? 0) + 1);
      const scored = scoreComment({
        comment,
        safetyReport: safetyById.get(comment.id),
        viewerProfile: profilesById.get(comment.author.id),
        duplicate,
        freshestTimestamp,
        streamState: input.streamState,
        weights: weights ?? defaultRankingWeights,
        safetyPenaltyMultiplier,
      });
      const isBlockedViewer = blockedViewerIds.has(comment.author.id);
      const safetyReport =
        safetyById.get(comment.id) ??
        (isBlockedViewer
          ? {
              commentId: comment.id,
              riskLevel: 'high' as const,
              categories: ['viewer_blocked' as const],
              shouldIgnore: true,
              reason: 'viewer is blocked due to previous unsafe comments',
            }
          : undefined);
      const reasons = isBlockedViewer
        ? [...scored.reasons, 'blocked_viewer' as const, 'unsafe' as const]
        : scored.reasons;

      return {
        ...comment,
        score: isBlockedViewer ? scored.score - 2 : scored.score,
        scoreBreakdown: scored.scoreBreakdown,
        reasons,
        safetyReport,
      };
    })
    .sort((a, b) => b.score - a.score);

  const maxSelectedComments = config.maxSelectedComments ?? 1;
  const minScore = config.minScore ?? 0.3;
  const requiresTopic =
    topicFilter === 'require' && Boolean(input.streamState?.topic?.trim());
  const selectedComments = rankedComments
    .filter((comment) => !comment.safetyReport?.shouldIgnore)
    .filter((comment) => comment.score >= minScore)
    .filter(
      (comment) => !requiresTopic || comment.reasons.includes('topic_related')
    )
    .slice(0, maxSelectedComments);

  return {
    rankedComments,
    selectedComments,
  };
}
