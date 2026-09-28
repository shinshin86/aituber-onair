import type { CommentResponsePlan } from './types/llm.js';
import type { RankedComment, RankingReason } from './types/ranking.js';
import type { CommentIntelligenceResult } from './types/result.js';
import type { SafetyCategory } from './types/safety.js';

export type AgentCommentDecisionDetail = 'compact' | 'full';

export type AgentSelectedComment = {
  id: string;
  text: string;
  authorName: string;
  score: number;
  reasons: RankingReason[];
  /** Present when the analysis provider returned a plan for this comment. */
  responsePlan?: CommentResponsePlan;
};

export type AgentSafetySummary = {
  ignoredCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  categories: SafetyCategory[];
};

export type AgentCommentDecision = {
  selectedComment?: AgentSelectedComment;
  instruction: string;
  context: string[];
  ignoredSummary: string;
  safety: AgentSafetySummary;
  selectedCommentIds: string[];
  blockedViewerIds: string[];
  llmUsed: boolean;
  /** Assessed comments with a safety risk; present with response plans. */
  moderatorAlertCommentIds?: string[];
  /**
   * Assessed comments saying the stream got something wrong. Count them over
   * time to detect a flare-up; present with response plans.
   */
  errorReportCommentIds?: string[];
  rankedComments?: AgentSelectedComment[];
};

export type AgentCommentDecisionOptions = {
  /**
   * compact: only expose the selected comment and aggregate safety metadata.
   * full: also include ranked comment summaries for debugging or dashboards.
   */
  detail?: AgentCommentDecisionDetail;
};

export function toAgentCommentDecision(
  result: CommentIntelligenceResult,
  options: AgentCommentDecisionOptions = {}
): AgentCommentDecision {
  const plans = new Map(
    (result.responsePlans ?? []).map((plan) => [plan.commentId, plan])
  );
  const selectedComment = result.selectedComments[0]
    ? toAgentSelectedComment(result.selectedComments[0], plans)
    : undefined;
  const detail = options.detail ?? 'compact';

  return {
    ...(selectedComment ? { selectedComment } : {}),
    instruction: result.instructionForLLM,
    context: [...result.contextForLLM],
    ignoredSummary: result.ignoredSummary.summary,
    safety: summarizeSafety(result),
    selectedCommentIds:
      result.debug?.selectedCommentIds ??
      result.selectedComments.map((comment) => comment.id),
    blockedViewerIds: result.debug?.blockedViewerIds ?? [],
    llmUsed: result.debug?.usedLLM ?? false,
    ...(result.responsePlans
      ? {
          moderatorAlertCommentIds: result.responsePlans
            .filter((plan) => plan.notifyModerator)
            .map((plan) => plan.commentId),
          errorReportCommentIds: result.responsePlans
            .filter((plan) => plan.pointsOutError)
            .map((plan) => plan.commentId),
        }
      : {}),
    ...(detail === 'full'
      ? {
          rankedComments: result.rankedComments.map((comment) =>
            toAgentSelectedComment(comment, plans)
          ),
        }
      : {}),
  };
}

function toAgentSelectedComment(
  comment: RankedComment,
  plans: Map<string, CommentResponsePlan>
): AgentSelectedComment {
  const plan = plans.get(comment.id);
  return {
    id: comment.id,
    text: comment.text,
    authorName: comment.author.displayName ?? comment.author.name,
    score: comment.score,
    reasons: [...comment.reasons],
    ...(plan ? { responsePlan: { ...plan } } : {}),
  };
}

function summarizeSafety(
  result: CommentIntelligenceResult
): AgentSafetySummary {
  const highRiskReports = result.safetyReports.filter(
    (report) => report.riskLevel === 'high'
  );
  const mediumRiskReports = result.safetyReports.filter(
    (report) => report.riskLevel === 'medium'
  );
  const categories = [
    ...new Set(result.safetyReports.flatMap((report) => report.categories)),
  ];

  return {
    ignoredCount: result.ignoredComments.length,
    highRiskCount: highRiskReports.length,
    mediumRiskCount: mediumRiskReports.length,
    categories,
  };
}
