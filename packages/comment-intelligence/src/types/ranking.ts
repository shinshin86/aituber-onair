import type { LiveComment } from './comment.js';
import type { SafetyReport } from './safety.js';

export type RankingReason =
  | 'direct_question'
  | 'new_viewer'
  | 'returning_viewer'
  | 'topic_related'
  | 'topic_change_candidate'
  | 'high_engagement'
  | 'easy_to_answer'
  | 'ignored_recently'
  | 'super_chat'
  | 'moderator'
  | 'duplicate'
  | 'spam_like'
  | 'unsafe'
  | 'blocked_viewer'
  | 'fresh';

export type RankingStrategy =
  | 'balanced'
  | 'new-viewer-friendly'
  | 'loyal-viewer-friendly'
  | 'topic-focused'
  | 'chaos-resistant'
  | 'q-and-a';

export type RankingWeights = {
  question: number;
  topicRelevance: number;
  viewerRelationship: number;
  novelty: number;
  safety: number;
  freshness: number;
};

export type CommentScoreBreakdown = {
  question: number;
  topicRelevance: number;
  viewerRelationship: number;
  novelty: number;
  safety: number;
  freshness: number;
  priorityBoost: number;
  penalty: number;
};

export type RankedComment = LiveComment & {
  score: number;
  scoreBreakdown: CommentScoreBreakdown;
  reasons: RankingReason[];
  safetyReport?: SafetyReport;
};
