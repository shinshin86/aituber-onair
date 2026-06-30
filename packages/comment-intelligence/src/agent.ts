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
  const selectedComment = result.selectedComments[0]
    ? toAgentSelectedComment(result.selectedComments[0])
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
    ...(detail === 'full'
      ? {
          rankedComments: result.rankedComments.map(toAgentSelectedComment),
        }
      : {}),
  };
}

function toAgentSelectedComment(comment: RankedComment): AgentSelectedComment {
  return {
    id: comment.id,
    text: comment.text,
    authorName: comment.author.displayName ?? comment.author.name,
    score: comment.score,
    reasons: [...comment.reasons],
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
